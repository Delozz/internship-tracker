from datetime import date, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from api.db import get_client

router = APIRouter(prefix="/api/stats", tags=["stats"])


class DeadlineItem(BaseModel):
    company: str
    role: str
    deadline: date
    days_remaining: int


class StatsResponse(BaseModel):
    total_listings: int
    new_listings_today: int
    applications_by_status: dict[str, int]
    upcoming_deadlines: list[DeadlineItem]
    response_rate: float


@router.get("", response_model=StatsResponse)
def get_stats() -> StatsResponse:
    client = get_client()
    today = date.today()
    today_str = today.isoformat()
    in_14_days = (today + timedelta(days=14)).isoformat()

    # Total active listings
    listings_resp = (
        client.table("listings")
        .select("*", count="exact")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    total_listings = listings_resp.count or 0

    # New listings added today
    new_resp = (
        client.table("listings")
        .select("*", count="exact")
        .eq("is_active", True)
        .gte("created_at", today_str)
        .limit(1)
        .execute()
    )
    new_listings_today = new_resp.count or 0

    # Applications by status
    apps_resp = client.table("applications").select("status").execute()
    status_counts: dict[str, int] = {}
    for row in apps_resp.data:
        s = row["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    # Upcoming deadlines (next 14 days)
    deadlines_resp = (
        client.table("applications")
        .select("company,role,deadline")
        .gte("deadline", today_str)
        .lte("deadline", in_14_days)
        .filter("status", "not.in", "(rejected,withdrawn,offer)")
        .order("deadline")
        .execute()
    )
    upcoming: list[DeadlineItem] = []
    for row in deadlines_resp.data:
        dl = date.fromisoformat(row["deadline"])
        upcoming.append(
            DeadlineItem(
                company=row["company"],
                role=row["role"],
                deadline=dl,
                days_remaining=(dl - today).days,
            )
        )

    # Response rate = (oa_received + beyond) / applied
    applied_count = sum(
        status_counts.get(s, 0)
        for s in ["applied", "oa_received", "oa_submitted",
                  "interview_scheduled", "interview_done", "offer"]
    )
    responded_count = sum(
        status_counts.get(s, 0)
        for s in ["oa_received", "oa_submitted",
                  "interview_scheduled", "interview_done", "offer"]
    )
    response_rate = round(responded_count / applied_count, 4) if applied_count > 0 else 0.0

    return StatsResponse(
        total_listings=total_listings,
        new_listings_today=new_listings_today,
        applications_by_status=status_counts,
        upcoming_deadlines=upcoming,
        response_rate=response_rate,
    )
