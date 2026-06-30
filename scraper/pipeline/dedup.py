import re
from typing import Optional
from supabase import Client


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower().strip())


def make_dedup_key(company: str, title: str, location: str) -> str:
    return f"{_normalize(company)}|{_normalize(title)}|{_normalize(location or '')}"


def load_existing_index(client: Client) -> tuple[dict[str, str], dict[str, str]]:
    """Load all existing listings once for in-memory dedup.

    Returns (by_url, by_key): two dicts mapping to the existing listing id.
    This replaces per-listing DB lookups (1-2 round trips each) with a single
    paginated scan, so a scrape of N listings costs O(N/page) queries, not O(N).
    """
    by_url: dict[str, str] = {}
    by_key: dict[str, str] = {}
    offset = 0
    page = 1000
    while True:
        resp = (
            client.table("listings")
            .select("id,url,company,title,location")
            # paginate — table can hold thousands (L4)
            .range(offset, offset + page - 1)
            .execute()
        )
        rows = resp.data
        for row in rows:
            if row.get("url"):
                by_url[row["url"]] = row["id"]
            key = make_dedup_key(row["company"], row["title"], row.get("location", ""))
            by_key[key] = row["id"]
        if len(rows) < page:
            break
        offset += page
    return by_url, by_key


def is_duplicate(client: Client, company: str, title: str, location: str, url: Optional[str]) -> Optional[str]:
    """Return the existing listing id if a duplicate exists, else None.

    Checks URL first (exact match), then falls back to (company, title, location) tuple.
    """
    if url:
        resp = client.table("listings").select("id").eq("url", url).limit(1).execute()
        if resp.data:
            return resp.data[0]["id"]

    key = make_dedup_key(company, title, location)
    # Use eq() for the company fallback — ilike() with % wildcards causes
    # postgrest-py to generate invalid percent-encoded URLs for ASCII names
    # (e.g. %Cresta% → %Cr looks like a broken escape sequence → Cloudflare 500).
    resp = (
        client.table("listings")
        .select("id,company,title,location")
        .eq("company", company.strip())
        .limit(50)
        .execute()
    )
    for row in resp.data:
        row_key = make_dedup_key(row["company"], row["title"], row.get("location", ""))
        if row_key == key:
            return row["id"]

    return None
