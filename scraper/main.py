"""Scraper entrypoint.

Usage:
  python main.py            # starts APScheduler (Railway production)
  python main.py --run-now  # single immediate run (local testing)
"""
import argparse
import asyncio
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # must run before any module-level os.getenv() in imported sources

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from supabase import create_client, Client

from scraper.sources import simplify, github_jobs
from scraper.pipeline.writer import write_listings, WriteResult

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


async def run_scrape() -> None:
    started_at = datetime.now(timezone.utc)
    logger.info("Scrape started at %s", started_at.isoformat())
    client = get_supabase()
    totals = WriteResult(inserted=0, skipped=0, errors=0)

    # Each source is wrapped independently — one failure never stops the others (L5).
    sources = [
        ("simplify", simplify.scrape_all),
        ("github", github_jobs.scrape_all),
    ]

    for name, scrape_fn in sources:
        try:
            logger.info("Running source: %s", name)
            listings = await scrape_fn()
            result = write_listings(client, listings)
            totals["inserted"] += result["inserted"]
            totals["skipped"] += result["skipped"]
            totals["errors"] += result["errors"]
            logger.info(
                "%s → inserted=%d skipped=%d errors=%d",
                name,
                result["inserted"],
                result["skipped"],
                result["errors"],
            )
        except Exception:
            logger.exception("Source %s failed — continuing with remaining sources", name)
            totals["errors"] += 1

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    logger.info(
        "Scrape complete in %.1fs — total inserted=%d skipped=%d errors=%d",
        elapsed,
        totals["inserted"],
        totals["skipped"],
        totals["errors"],
    )


def scrape_job() -> None:
    asyncio.run(run_scrape())


def main() -> None:
    parser = argparse.ArgumentParser(description="Internship scraper")
    parser.add_argument("--run-now", action="store_true", help="Run once immediately and exit")
    args = parser.parse_args()

    if args.run_now:
        logger.info("--run-now flag detected; running single scrape")
        scrape_job()
        return

    cron_hour = int(os.getenv("SCRAPER_CRON_HOUR", "8"))
    cron_minute = int(os.getenv("SCRAPER_CRON_MINUTE", "0"))
    timezone_str = os.getenv("SCRAPER_TIMEZONE", "America/Chicago")

    scheduler = BlockingScheduler(timezone=timezone_str)
    scheduler.add_job(
        scrape_job,
        CronTrigger(hour=cron_hour, minute=cron_minute, timezone=timezone_str),
    )
    logger.info(
        "Scheduler started — will run daily at %02d:%02d %s",
        cron_hour,
        cron_minute,
        timezone_str,
    )
    scheduler.start()


if __name__ == "__main__":
    main()
