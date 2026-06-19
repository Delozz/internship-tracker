from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from api.db import get_client
from api.models.application import Application, ApplicationCreate, ApplicationPatch, STATUS_VALUES

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("", response_model=list[Application])
def get_applications(
    status: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
) -> list[Application]:
    client = get_client()
    query = client.table("applications").select("*")

    if status:
        query = query.eq("status", status)
    if company:
        query = query.ilike("company", f"%{company}%")

    valid_sort = {"created_at", "updated_at", "deadline", "company"}
    sort_col = sort_by if sort_by in valid_sort else "created_at"
    query = query.order(sort_col, desc=True)

    resp = query.execute()
    return resp.data


@router.post("", response_model=Application, status_code=201)
def create_application(body: ApplicationCreate) -> Application:
    if body.status not in STATUS_VALUES:
        raise HTTPException(status_code=422, detail=f"Invalid status '{body.status}'")

    client = get_client()
    record = body.model_dump(exclude_none=True)
    # Serialize date objects to ISO strings for Supabase
    for field in ("applied_at", "deadline"):
        if field in record and record[field] is not None:
            record[field] = str(record[field])

    resp = client.table("applications").insert(record).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Insert failed")
    return resp.data[0]


@router.patch("/{app_id}", response_model=Application)
def patch_application(app_id: str, body: ApplicationPatch) -> Application:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")
    if "status" in updates and updates["status"] not in STATUS_VALUES:
        raise HTTPException(status_code=422, detail=f"Invalid status '{updates['status']}'")

    for field in ("applied_at", "deadline", "oa_date", "interview_date", "offer_deadline"):
        if field in updates and updates[field] is not None:
            updates[field] = str(updates[field])

    client = get_client()
    resp = client.table("applications").update(updates).eq("id", app_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return resp.data[0]


@router.delete("/{app_id}", status_code=204)
def delete_application(app_id: str) -> None:
    client = get_client()
    client.table("applications").delete().eq("id", app_id).execute()
