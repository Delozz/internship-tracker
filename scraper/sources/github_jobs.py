"""Scrape internship README files from GitHub.

Handles two formats:
- HTML <table> tags (SimplifyJobs repos, 2025+)
- Markdown pipe tables (older community forks like vanshb03)
"""
import html as html_lib
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup, Tag

from scraper.pipeline.writer import RawListing

logger = logging.getLogger(__name__)

# Each inner list is one repo — try dev then main branch. All successful repos
# are scraped and combined; dedup in writer.py handles overlap.
README_URL_GROUPS = [
    [
        "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md",
        "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/main/README.md",
    ],
    [
        "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md",
        "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/main/README.md",
    ],
    [
        "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
        "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/main/README.md",
    ],
]

_APPLY_LINK_RE = re.compile(r'href=["\']?(https?://[^"\'>\s]+)["\']?', re.IGNORECASE)
_MD_LINK_RE = re.compile(r'\[.*?\]\((https?://[^)]+)\)')
_EMOJI_PREFIX_RE = re.compile(r'^[\U00010000-\U0010ffff\s]+', re.UNICODE)
_CONTINUATION = "↳"  # ↳
_MD_ROW_RE = re.compile(
    r"^\|\s*(?P<company>[^|]+?)\s*\|\s*(?P<role>[^|]+?)\s*\|\s*"
    r"(?P<location>[^|]+?)\s*\|\s*(?P<link>[^|]+?)\s*\|",
    re.MULTILINE,
)


async def scrape_all() -> list[RawListing]:
    all_listings: list[RawListing] = []
    headers = {"User-Agent": "internship-tracker/1.0 (personal project)"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        for url_group in README_URL_GROUPS:
            for url in url_group:
                try:
                    resp = await client.get(url, timeout=20)
                    resp.raise_for_status()
                    logger.info("GitHub Jobs: fetched from %s", url)
                    listings = _parse(resp.text)
                    logger.info("GitHub Jobs: parsed %d listings from %s", len(listings), url)
                    all_listings.extend(listings)
                    break  # success for this group — move to next repo
                except httpx.HTTPError as exc:
                    logger.warning("GitHub Jobs: failed %s — %s", url, exc)

    logger.info("GitHub Jobs: total combined = %d listings", len(all_listings))
    return all_listings


def _parse(content: str) -> list[RawListing]:
    now = datetime.now(timezone.utc).isoformat()

    soup = BeautifulSoup(content, "lxml")
    tables = soup.find_all("table")

    if tables:
        logger.info("GitHub Jobs: HTML table format — %d tables found", len(tables))
        return _parse_html(tables, now)

    pipe_lines = [l for l in content.splitlines() if l.lstrip().startswith("|")]
    logger.info("GitHub Jobs: markdown pipe format — %d pipe lines found", len(pipe_lines))
    return _parse_markdown(content, now)


def _parse_html(tables: list, now: str) -> list[RawListing]:
    results: list[RawListing] = []

    for table in tables:
        assert isinstance(table, Tag)
        headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
        company_idx = _col(headers, ("company",), default=0)
        role_idx = _col(headers, ("role", "position", "title"), default=1)
        location_idx = _col(headers, ("location",), default=2)
        link_idx = _col(headers, ("application", "link", "apply"), default=3)

        last_company: Optional[str] = None
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) <= max(company_idx, role_idx, location_idx, link_idx):
                continue
            try:
                company_cell = cells[company_idx]
                role_cell = cells[role_idx]
                location_cell = cells[location_idx]
                link_cell = cells[link_idx]

                if row.find(["del", "s"]):
                    continue
                link_text = link_cell.get_text(strip=True)
                if "\U0001f512" in link_text and not link_cell.find("a", href=True):
                    continue

                raw_company = company_cell.get_text(strip=True)
                role = role_cell.get_text(strip=True)
                if not raw_company or not role:
                    continue
                if raw_company.lower() == "company" or role.lower() in ("role", "position"):
                    continue

                if raw_company.startswith(_CONTINUATION):
                    company = last_company or raw_company
                else:
                    company = _EMOJI_PREFIX_RE.sub("", raw_company).strip() or raw_company
                    last_company = company

                location: Optional[str] = _location_from_cell(location_cell)

                url: Optional[str] = None
                link_tag = link_cell.find("a", href=True)
                if link_tag:
                    href = str(link_tag.get("href", ""))
                    if href.startswith("http"):
                        url = href
                else:
                    m = _APPLY_LINK_RE.search(str(link_cell))
                    if m:
                        url = m.group(1)

                results.append(RawListing(
                    title=role, company=company, location=location,
                    source="github", url=url, description_snippet=None,
                    deadline=None, posted_at=now,
                ))
            except Exception:
                logger.exception("GitHub Jobs: error parsing HTML row")

    return results


def _parse_markdown(content: str, now: str) -> list[RawListing]:
    results: list[RawListing] = []
    last_company: Optional[str] = None

    for match in _MD_ROW_RE.finditer(content):
        raw_company = match.group("company").strip()
        role = match.group("role").strip()
        location = _clean_location(match.group("location"))
        link_cell = match.group("link").strip()

        if raw_company.lower() in ("company", "---", "") or role.lower() in ("role", "---", ""):
            continue
        if re.search(r"\bclosed\b", link_cell, re.IGNORECASE):
            continue

        if raw_company.startswith(_CONTINUATION):
            company = last_company or raw_company
        else:
            company = re.sub(r"\*+([^*]+)\*+", r"\1", raw_company)
            company = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", company).strip()
            last_company = company

        url: Optional[str] = None
        link_match = _MD_LINK_RE.search(link_cell)
        if link_match:
            url = link_match.group(1)

        results.append(RawListing(
            title=role, company=company, location=location,
            source="github", url=url, description_snippet=None,
            deadline=None, posted_at=now,
        ))

    return results


def _col(headers: list[str], keywords: tuple[str, ...], default: int) -> int:
    for i, h in enumerate(headers):
        if any(kw in h for kw in keywords):
            return i
    return default


_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _clean_location(raw: str) -> Optional[str]:
    """Strip HTML tags, decode entities, and collapse whitespace."""
    text = _HTML_TAG_RE.sub("", raw)
    text = html_lib.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _location_from_cell(cell: Tag) -> Optional[str]:
    """Extract clean location text, handling SimplifyJobs <details> expansion."""
    details = cell.find("details")
    if details:
        summary = details.find("summary")
        parts: list[str] = []
        for node in details.children:
            if node is summary:
                continue
            chunk = node.get_text(strip=True) if hasattr(node, "get_text") else str(node).strip()
            if chunk:
                parts.append(chunk)
        raw = " | ".join(parts) if parts else (summary.get_text(strip=True) if summary else "")
    else:
        raw = cell.get_text(separator=" | ", strip=True)
    return _clean_location(raw)
