import os
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from backend.config import APP_DATA_DIR
from backend.models.assessment_note import AssessmentNote
from backend.models.invoice import Invoice
from backend.models.session_note import SessionNote
from backend.services.therapist_detail_service import TherapistDetailService


@dataclass
class InvoiceContext:
    source_type: str
    source_id: int
    session_date: date
    client_name: str
    client_session_rate_raw: str
    paid: bool


class InvoiceService:
    INVOICE_DIR = os.path.join(APP_DATA_DIR, "invoices")
    DESCRIPTION = "Counselling session — 50 minutes"
    MAX_NUMBERING_RETRIES = 8

    @staticmethod
    def get_or_create_from_session(db: Session, session_id: int) -> Tuple[Invoice, bool]:
        session_note = (
            db.query(SessionNote)
            .options(joinedload(SessionNote.client))
            .filter(SessionNote.id == session_id)
            .first()
        )
        if not session_note:
            raise LookupError("Session note not found.")
        if not session_note.client:
            raise ValueError("Session note is not linked to a client.")

        context = InvoiceContext(
            source_type="session",
            source_id=session_note.id,
            session_date=session_note.session_date,
            client_name=session_note.client.full_name,
            client_session_rate_raw=(session_note.client.session_hourly_rate or "").strip(),
            paid=bool(session_note.is_paid),
        )
        return InvoiceService._get_or_create(db, context)

    @staticmethod
    def get_or_create_from_assessment(db: Session, assessment_id: int) -> Tuple[Invoice, bool]:
        assessment_note = (
            db.query(AssessmentNote)
            .options(joinedload(AssessmentNote.client))
            .filter(AssessmentNote.id == assessment_id)
            .first()
        )
        if not assessment_note:
            raise LookupError("Assessment note not found.")
        if not assessment_note.client:
            raise ValueError("Assessment note is not linked to a client.")

        context = InvoiceContext(
            source_type="assessment",
            source_id=assessment_note.id,
            session_date=assessment_note.assessment_date,
            client_name=assessment_note.client.full_name,
            client_session_rate_raw=(assessment_note.client.session_hourly_rate or "").strip(),
            paid=bool(assessment_note.is_paid),
        )
        return InvoiceService._get_or_create(db, context)

    @staticmethod
    def get_invoice_by_id(db: Session, invoice_id: int) -> Invoice | None:
        return db.query(Invoice).filter(Invoice.id == invoice_id).first()

    @staticmethod
    def _get_or_create(db: Session, context: InvoiceContext) -> Tuple[Invoice, bool]:
        details = TherapistDetailService.get_therapist_details(db)
        if not details:
            raise ValueError("Therapist details are missing. Please complete Therapist Details first.")

        therapist = InvoiceService._build_therapist_payload(details)
        rate_decimal = InvoiceService._parse_rate(context.client_session_rate_raw)
        display_amount = InvoiceService._format_decimal(rate_decimal)
        year = context.session_date.year

        existing = (
            db.query(Invoice)
            .filter(Invoice.source_type == context.source_type, Invoice.source_id == context.source_id)
            .first()
        )
        if existing:
            InvoiceService._ensure_pdf(existing, context, therapist, display_amount)
            return existing, False

        os.makedirs(InvoiceService.INVOICE_DIR, exist_ok=True)

        for _ in range(InvoiceService.MAX_NUMBERING_RETRIES):
            max_seq = db.query(func.max(Invoice.sequence_number)).filter(Invoice.year == year).scalar() or 0
            sequence_number = int(max_seq) + 1
            invoice_number = f"INV-{year}-{sequence_number:04d}"
            pdf_path = os.path.join(InvoiceService.INVOICE_DIR, f"{invoice_number}.pdf")

            invoice = Invoice(
                invoice_number=invoice_number,
                source_type=context.source_type,
                source_id=context.source_id,
                year=year,
                sequence_number=sequence_number,
                pdf_path=pdf_path,
            )
            db.add(invoice)
            try:
                db.commit()
                db.refresh(invoice)
            except IntegrityError:
                db.rollback()
                existing = (
                    db.query(Invoice)
                    .filter(Invoice.source_type == context.source_type, Invoice.source_id == context.source_id)
                    .first()
                )
                if existing:
                    InvoiceService._ensure_pdf(existing, context, therapist, display_amount)
                    return existing, False
                continue

            try:
                InvoiceService._generate_pdf(
                    invoice=invoice,
                    context=context,
                    therapist=therapist,
                    amount_text=display_amount,
                )
            except Exception:
                db.delete(invoice)
                db.commit()
                raise

            return invoice, True

        raise ValueError("Unable to allocate a unique invoice number. Please retry.")

    @staticmethod
    def _build_therapist_payload(details) -> dict:
        therapist_name = (details.therapist_name or "").strip()
        accreditation = (details.accreditation or "").strip()
        therapist_header = therapist_name
        if accreditation:
            therapist_header = f"{therapist_name} - {accreditation}"

        payload = {
            "business_name": (details.business_name or "").strip(),
            "therapy_type": (details.therapy_type or "").strip(),
            "website": (details.website or "").strip(),
            "therapist_name": therapist_name,
            "therapist_header": therapist_header,
            "therapist_email": (details.email or "").strip(),
            "currency_symbol": InvoiceService._normalize_currency_symbol(details.currency),
            "bank_name": (details.bank or "").strip(),
            "sort_code": (details.sort_code or "").strip(),
            "account_number": (details.account_number or "").strip(),
            "iban": (getattr(details, "iban", "") or "").strip(),
            "bic": (getattr(details, "bic", "") or "").strip(),
        }
        required = {
            "business_name": "Business Name",
            "therapy_type": "Therapy Type",
            "therapist_name": "Therapist Name",
            "therapist_email": "Email",
            "bank_name": "Bank",
            "sort_code": "Sort Code",
            "account_number": "Account Number",
        }
        missing = [label for key, label in required.items() if not payload.get(key)]
        if missing:
            raise ValueError(
                f"Missing therapist field(s): {', '.join(missing)}. Update Therapist Details before creating invoices."
            )
        return payload

    @staticmethod
    def _normalize_currency_symbol(raw_currency: str | None) -> str:
        value = (raw_currency or "").strip()
        if not value:
            return "£"
        upper = value.upper()
        mapping = {"GBP": "£", "EUR": "€", "USD": "$"}
        return mapping.get(upper, value)

    @staticmethod
    def _parse_rate(raw_rate: str) -> Decimal:
        cleaned = (raw_rate or "").strip().replace(",", ".")
        cleaned = re.sub(r"[^0-9.\-]", "", cleaned)
        if cleaned.count(".") > 1:
            head, *tail = cleaned.split(".")
            cleaned = f"{head}.{''.join(tail)}"
        if not cleaned:
            raise ValueError("Session/Hourly Rate is required in Client Info.")
        try:
            amount = Decimal(cleaned)
        except InvalidOperation as exc:
            raise ValueError("Session/Hourly Rate must be a valid number.") from exc
        if amount < 0:
            raise ValueError("Session/Hourly Rate cannot be negative.")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def _format_decimal(value: Decimal) -> str:
        return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"

    @staticmethod
    def _ensure_pdf(invoice: Invoice, context: InvoiceContext, therapist: dict, amount_text: str) -> None:
        # Refresh existing invoices so the PDF reflects current source data
        # (e.g., updated client session rate) while keeping the same invoice number.
        os.makedirs(os.path.dirname(invoice.pdf_path), exist_ok=True)
        temp_path = f"{invoice.pdf_path}.tmp"
        InvoiceService._generate_pdf(invoice, context, therapist, amount_text, output_path=temp_path)
        os.replace(temp_path, invoice.pdf_path)

    @staticmethod
    def _generate_pdf(
        invoice: Invoice,
        context: InvoiceContext,
        therapist: dict,
        amount_text: str,
        output_path: str | None = None,
    ) -> None:
        target_path = output_path or invoice.pdf_path
        c = canvas.Canvas(target_path, pagesize=A4)
        width, height = A4

        left = 40
        right = width - 40
        y = height - 50

        c.setFont("Helvetica-Bold", 20)
        c.drawString(left, y, therapist["business_name"] or "Therapy Practice")
        y -= 22
        c.setFont("Helvetica", 11)
        c.drawString(left, y, therapist["therapy_type"])
        y -= 16
        c.drawString(left, y, therapist["website"])
        y -= 16
        c.drawString(left, y, therapist["therapist_header"])
        y -= 16
        c.drawString(left, y, therapist["therapist_email"])

        y -= 30
        c.setLineWidth(0.5)
        c.setStrokeColor(colors.HexColor("#B0B0B0"))
        c.line(left, y, right, y)
        y -= 24

        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, y, "BILL TO")
        y -= 16
        c.setFont("Helvetica", 11)
        c.drawString(left, y, context.client_name)

        meta_x = right - 210
        c.setFont("Helvetica-Bold", 11)
        c.drawString(meta_x, y + 16, f"Invoice #: {invoice.invoice_number}")
        c.drawString(meta_x, y, f"DATE: {context.session_date.strftime('%d/%m/%Y')}")
        c.drawString(meta_x, y - 16, f"{'PAID' if context.paid else 'NOT PAID'}")

        y -= 42

        table_x = left
        table_y_top = y
        row_h = 26
        header_h = 24

        col_w = [250, 70, 80, 70, 80]
        headers = ["DESCRIPTION", "QUANTITY", "PRICE", "DATE", "TOTAL"]

        c.setFillColor(colors.HexColor("#E8E8E8"))
        c.rect(table_x, table_y_top - header_h, sum(col_w), header_h, fill=1, stroke=0)
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        tx = table_x + 6
        for idx, header in enumerate(headers):
            c.drawString(tx, table_y_top - 16, header)
            tx += col_w[idx]

        c.setStrokeColor(colors.HexColor("#9A9A9A"))
        c.rect(table_x, table_y_top - header_h - row_h, sum(col_w), header_h + row_h, fill=0, stroke=1)
        tx = table_x
        for width_col in col_w[:-1]:
            tx += width_col
            c.line(tx, table_y_top, tx, table_y_top - header_h - row_h)
        c.line(table_x, table_y_top - header_h, table_x + sum(col_w), table_y_top - header_h)

        line_price = f"{therapist['currency_symbol']}{amount_text}"
        c.setFont("Helvetica", 10)
        values = [
            InvoiceService.DESCRIPTION,
            "1",
            line_price,
            context.session_date.strftime("%d/%m/%Y"),
            line_price,
        ]
        tx = table_x + 6
        for idx, value in enumerate(values):
            c.drawString(tx, table_y_top - header_h - 16, value)
            tx += col_w[idx]

        total_y = table_y_top - header_h - row_h - 24
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(right, total_y, f"TOTAL DUE: {line_price}")

        bacs_y = total_y - 44
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, bacs_y, f"Payment by BACS to: {therapist['therapist_name']}")
        c.setFont("Helvetica", 10)
        c.drawString(left, bacs_y - 16, f"Bank: {therapist['bank_name']}")
        c.drawString(left, bacs_y - 30, f"Sort Code: {therapist['sort_code']}")
        c.drawString(left, bacs_y - 44, f"Account Number: {therapist['account_number']}")
        c.drawString(left, bacs_y - 58, "For international payments:")
        c.drawString(left, bacs_y - 72, f"IBAN: {therapist['iban']}")
        c.drawString(left, bacs_y - 86, f"BIC: {therapist['bic']}")

        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, 44, "With Thanks")

        c.showPage()
        c.save()
