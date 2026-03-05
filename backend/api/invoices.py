import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.config import get_db
from backend.schemas.invoice import InvoiceResponse
from backend.services.invoice_service import InvoiceService

router = APIRouter()


def _build_invoice_response(invoice, was_created: bool) -> InvoiceResponse:
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        source_type=invoice.source_type,
        source_id=invoice.source_id,
        pdf_path=invoice.pdf_path,
        pdf_url=f"/api/invoices/{invoice.id}/pdf",
        created_at=invoice.created_at,
        was_created=was_created,
    )


@router.post("/from-session/{session_id}", response_model=InvoiceResponse)
def create_invoice_from_session(session_id: int, db: Session = Depends(get_db)):
    try:
        invoice, was_created = InvoiceService.get_or_create_from_session(db, session_id)
        return _build_invoice_response(invoice, was_created)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/from-assessment/{assessment_id}", response_model=InvoiceResponse)
def create_invoice_from_assessment(assessment_id: int, db: Session = Depends(get_db)):
    try:
        invoice, was_created = InvoiceService.get_or_create_from_assessment(db, assessment_id)
        return _build_invoice_response(invoice, was_created)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = InvoiceService.get_invoice_by_id(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="Invoice PDF file not found.")

    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'},
    )
