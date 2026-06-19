from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

STATUS_VALUES = [
    "saved", "applied", "oa_received", "oa_submitted",
    "interview_scheduled", "interview_done", "offer", "rejected", "withdrawn",
]


class Application(BaseModel):
    id: str
    listing_id: Optional[str] = None
    company: str
    role: str
    status: str
    applied_at: Optional[date] = None
    deadline: Optional[date] = None
    notes: Optional[str] = None
    oa_date: Optional[date] = None
    interview_date: Optional[date] = None
    offer_deadline: Optional[date] = None
    updated_at: datetime
    created_at: datetime


class ApplicationCreate(BaseModel):
    listing_id: Optional[str] = None
    company: str
    role: str
    status: str = "saved"
    applied_at: Optional[date] = None
    deadline: Optional[date] = None
    notes: Optional[str] = None


class ApplicationPatch(BaseModel):
    listing_id: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    applied_at: Optional[date] = None
    deadline: Optional[date] = None
    notes: Optional[str] = None
    oa_date: Optional[date] = None
    interview_date: Optional[date] = None
    offer_deadline: Optional[date] = None
