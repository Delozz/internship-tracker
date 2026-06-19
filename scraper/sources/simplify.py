"""Scrape Simplify.jobs using Playwright (JS-rendered SPA)."""
import logging
from datetime import datetime, timezone
from typing import Optional

from playwright.async_api import async_playwright, Page, ElementHandle
from scraper.pipeline.writer import RawListing

logger = logging.getLogger(__name__)

SEARCH_URL = (
    "https://simplify.jobs/jobs"
    "?experience=Internship"
    "&category=Software+Engineering,Computer+Science,Data+Science,Quantitative+Finance"
)

_CARD_SELECTORS = [
    "[data-job-id]",
    "article[class*='job' i]",
    "[class*='JobCard']",
    "[class*='job-card' i]",
    "li[class*='job' i]",
]


async def _text(el: Optional[ElementHandle]) -> Optional[str]:
    if el is None:
        return None
    return (await el.inner_text()).strip() or None


async def _extract_page(page: Page) -> list[RawListing]:
    now = datetime.now(timezone.utc).isoformat()
    results: list[RawListing] = []

    cards: list[ElementHandle] = []
    for selector in _CARD_SELECTORS:
        cards = await page.query_selector_all(selector)
        if cards:
            logger.info("Simplify: matched selector '%s' → %d cards", selector, len(cards))
            break

    if not cards:
        logger.warning("Simplify: no job cards matched any selector on this page")
        return []

    for card in cards:
        try:
            title_el = (
                await card.query_selector("[data-field='title']")
                or await card.query_selector("[class*='title' i]")
                or await card.query_selector("h2,h3")
            )
            company_el = (
                await card.query_selector("[data-field='company']")
                or await card.query_selector("[class*='company' i]")
                or await card.query_selector("[class*='employer' i]")
            )
            location_el = (
                await card.query_selector("[data-field='location']")
                or await card.query_selector("[class*='location' i]")
            )
            link_el = await card.query_selector("a[href]")

            title = await _text(title_el)
            company = await _text(company_el)
            if not title or not company:
                continue

            location = await _text(location_el)

            url: Optional[str] = None
            if link_el:
                href = (await link_el.get_attribute("href")) or ""
                url = href if href.startswith("http") else f"https://simplify.jobs{href}"

            results.append(
                RawListing(
                    title=title,
                    company=company,
                    location=location,
                    source="simplify",
                    url=url,
                    description_snippet=None,
                    deadline=None,
                    posted_at=now,
                )
            )
        except Exception:
            logger.exception("Simplify: error parsing card")

    return results


async def scrape_all(max_pages: int = 5) -> list[RawListing]:
    all_listings: list[RawListing] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )
        page = await ctx.new_page()

        for page_num in range(max_pages):
            url = f"{SEARCH_URL}&page={page_num}"
            try:
                await page.goto(url, wait_until="networkidle", timeout=40_000)
            except Exception as exc:
                logger.error("Simplify: navigation failed on page %d: %s", page_num, exc)
                break

            listings = await _extract_page(page)
            if not listings:
                logger.info("Simplify: no listings on page %d — stopping early", page_num)
                break

            all_listings.extend(listings)
            logger.info("Simplify: page %d → %d listings", page_num, len(listings))

        await browser.close()

    logger.info("Simplify: total fetched = %d", len(all_listings))
    return all_listings
