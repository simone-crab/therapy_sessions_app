from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    client_id: int
    title: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = "Europe/London"
    recurrence_rule: Optional[str] = None
    recurrence_until: Optional[datetime] = None


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    timezone: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class OccurrenceCancelRequest(BaseModel):
    occurrence_start_datetime: datetime


class OccurrenceMoveRequest(BaseModel):
    occurrence_start_datetime: datetime
    new_start_datetime: datetime
    new_end_datetime: datetime
