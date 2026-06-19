import logging
from typing import TypedDict, Optional
from supabase import Client
from .dedup import is_duplicate
from .filter import classify_role

logger = logging.getLogger(__name__)


class RawListing(TypedDict):
    title: str
    company: str
    location: str
    source: str
    url: Optional[str]
    description_snippet: Optional[str]
    deadline: Optional[str]   # ISO date string YYYY-MM-DD or None
    posted_at: Optional[str]  # ISO datetime string or None


class WriteResult(TypedDict):
    inserted: int
    skipped: int
    errors: int


def write_listings(client: Client, listings: list[RawListing]) -> WriteResult:
    """Deduplicate, classify, and upsert listings into Supabase."""
    inserted = 0
    skipped = 0
    errors = 0

    for raw in listings:
        try:
            role_type = classify_role(raw["title"])
            if role_type is None:
                skipped += 1
                continue

            existing_id = is_duplicate(
                client,
                raw["company"],
                raw["title"],
                raw.get("location", ""),
                raw.get("url"),
            )

            if existing_id:
                # Mark still active if it was previously soft-deleted
                client.table("listings").update({"is_active": True}).eq("id", existing_id).execute()
                skipped += 1
                continue

            record = {
                "title": raw["title"],
                "company": raw["company"],
                "location": raw.get("location"),
                "role_type": role_type,
                "source": raw["source"],
                "url": raw.get("url"),
                "description_snippet": raw.get("description_snippet"),
                "deadline": raw.get("deadline"),
                "posted_at": raw.get("posted_at"),
                "is_active": True,
            }
            client.table("listings").insert(record).execute()
            inserted += 1

        except Exception:
            logger.exception("Error writing listing: %s @ %s", raw.get("title"), raw.get("company"))
            errors += 1

    return WriteResult(inserted=inserted, skipped=skipped, errors=errors)
