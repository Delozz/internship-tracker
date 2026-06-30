import logging
from typing import TypedDict, Optional
from supabase import Client
from .dedup import load_existing_index, make_dedup_key
from .filter import classify_role

logger = logging.getLogger(__name__)

# Sentinel marking a key seen earlier in *this* batch but not yet in the DB,
# so intra-batch duplicates are skipped without a (nonexistent) id to reactivate.
_PENDING = "__pending__"


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
    """Deduplicate, classify, and upsert listings into Supabase.

    Existing listings are loaded once into in-memory indexes; new rows are
    collected and inserted in a single batch (with per-row fallback) to avoid a
    DB round trip per listing.
    """
    inserted = 0
    skipped = 0
    errors = 0

    by_url, by_key = load_existing_index(client)
    new_records: list[dict] = []
    reactivate_ids: set[str] = set()

    for raw in listings:
        try:
            role_type = classify_role(raw["title"])
            if role_type is None:
                skipped += 1
                continue

            url = raw.get("url")
            location = raw.get("location", "")
            key = make_dedup_key(raw["company"], raw["title"], location)

            existing_id = by_url.get(url) if url else None
            if existing_id is None:
                existing_id = by_key.get(key)

            if existing_id is not None:
                # Reactivate if it was previously soft-deleted; _PENDING means it
                # was already queued for insert earlier in this same batch.
                if existing_id != _PENDING:
                    reactivate_ids.add(existing_id)
                skipped += 1
                continue

            new_records.append({
                "title": raw["title"],
                "company": raw["company"],
                "location": raw.get("location"),
                "role_type": role_type,
                "source": raw["source"],
                "url": url,
                "description_snippet": raw.get("description_snippet"),
                "deadline": raw.get("deadline"),
                "posted_at": raw.get("posted_at"),
                "is_active": True,
            })
            # Mark as seen so later duplicates in this batch are skipped.
            if url:
                by_url[url] = _PENDING
            by_key[key] = _PENDING
            inserted += 1

        except Exception:
            logger.exception("Error processing listing: %s @ %s", raw.get("title"), raw.get("company"))
            errors += 1

    # Batch reactivate previously soft-deleted listings.
    if reactivate_ids:
        try:
            (
                client.table("listings")
                .update({"is_active": True})
                .in_("id", list(reactivate_ids))
                .execute()
            )
        except Exception:
            logger.exception("Error reactivating %d listings", len(reactivate_ids))

    # Batch insert new listings; fall back to per-row so one bad row can't drop the rest.
    if new_records:
        try:
            client.table("listings").insert(new_records).execute()
        except Exception:
            logger.warning("Batch insert failed; falling back to per-row inserts", exc_info=True)
            for record in new_records:
                try:
                    client.table("listings").insert(record).execute()
                except Exception:
                    logger.exception("Error inserting listing: %s @ %s", record.get("title"), record.get("company"))
                    inserted -= 1
                    errors += 1

    return WriteResult(inserted=inserted, skipped=skipped, errors=errors)
