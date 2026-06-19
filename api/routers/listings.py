from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from api.db import get_client
from api.models.listing import Listing, ListingPatch, ListingsResponse

router = APIRouter(prefix="/api/listings", tags=["listings"])


@router.get("", response_model=ListingsResponse)
def get_listings(
    role_type: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    deadline_before: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> ListingsResponse:
    client = get_client()

    query = (
        client.table("listings")
        .select("*", count="exact")
        .eq("is_active", True)
    )

    if role_type:
        query = query.eq("role_type", role_type)
    if source:
        query = query.eq("source", source)
    if company:
        query = query.ilike("company", f"%{company}%")
    if search:
        query = query.or_(f"title.ilike.%{search}%,company.ilike.%{search}%")
    if deadline_before:
        query = query.lte("deadline", deadline_before)

    valid_sort = {"created_at", "deadline", "company", "posted_at"}
    sort_col = sort_by if sort_by in valid_sort else "created_at"
    query = query.order(sort_col, desc=True)

    resp = query.range(offset, offset + limit - 1).execute()  # L4 — always paginate

    return ListingsResponse(
        data=resp.data,
        total=resp.count or 0,
        limit=limit,
        offset=offset,
    )


@router.get("/{listing_id}", response_model=Listing)
def get_listing(listing_id: str) -> Listing:
    client = get_client()
    resp = client.table("listings").select("*").eq("id", listing_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    return resp.data[0]


@router.patch("/{listing_id}", response_model=Listing)
def patch_listing(listing_id: str, body: ListingPatch) -> Listing:
    client = get_client()
    resp = (
        client.table("listings")
        .update({"is_active": body.is_active})
        .eq("id", listing_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    return resp.data[0]
