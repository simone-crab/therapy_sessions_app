from datetime import datetime

from pydantic import BaseModel


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    source_type: str
    source_id: int
    pdf_path: str
    pdf_url: str
    created_at: datetime
    was_created: bool
