from sqlalchemy import Column, Integer, String, UniqueConstraint

from backend.models.base import BaseModel


class Invoice(BaseModel):
    __tablename__ = "invoices"

    invoice_number = Column(String(32), nullable=False, unique=True, index=True)
    source_type = Column(String(20), nullable=False)
    source_id = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    pdf_path = Column(String(1024), nullable=False)

    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uq_invoices_source"),
        UniqueConstraint("year", "sequence_number", name="uq_invoices_year_sequence"),
    )
