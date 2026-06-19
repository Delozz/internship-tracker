from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class Listing(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    role_type: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    description_snippet: Optional[str] = None
    deadline: Optional[date] = None
    posted_at: Optional[datetime] = None
    created_at: datetime
    is_active: bool


class ListingPatch(BaseModel):
    is_active: bool


class ListingsResponse(BaseModel):
    data: list[Listing]
    total: int
    limit: int
    offset: int
