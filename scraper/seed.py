"""Seed Supabase with realistic sample listings for local dev / testing.

Usage (from project root):
    python -m scraper.seed
"""
import logging
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SEED_LISTINGS = [
    # SWE
    {"title": "Software Engineer Intern", "company": "Google", "location": "Mountain View, CA", "role_type": "swe", "source": "github", "url": "https://careers.google.com/jobs/internship"},
    {"title": "Software Engineer Intern", "company": "Meta", "location": "Menlo Park, CA", "role_type": "swe", "source": "github", "url": "https://www.metacareers.com/jobs/internship"},
    {"title": "Software Engineer Intern", "company": "Apple", "location": "Cupertino, CA", "role_type": "swe", "source": "github", "url": "https://jobs.apple.com/internship"},
    {"title": "Software Engineering Intern", "company": "Amazon", "location": "Seattle, WA", "role_type": "swe", "source": "github", "url": "https://amazon.jobs/internship"},
    {"title": "Software Engineer Intern", "company": "Microsoft", "location": "Redmond, WA", "role_type": "swe", "source": "github", "url": "https://careers.microsoft.com/internship"},
    {"title": "Software Engineer Intern, Backend", "company": "Stripe", "location": "San Francisco, CA", "role_type": "swe", "source": "simplify", "url": "https://stripe.com/jobs/internship"},
    {"title": "Software Engineer Intern", "company": "Airbnb", "location": "San Francisco, CA", "role_type": "swe", "source": "simplify", "url": "https://careers.airbnb.com/internship"},
    {"title": "Software Engineer Intern", "company": "Uber", "location": "San Francisco, CA", "role_type": "swe", "source": "simplify", "url": "https://www.uber.com/careers/internship"},
    {"title": "Software Engineer Intern", "company": "Snap", "location": "Santa Monica, CA", "role_type": "swe", "source": "simplify", "url": "https://careers.snap.com/internship"},
    {"title": "Backend Engineer Intern", "company": "Cloudflare", "location": "Remote", "role_type": "swe", "source": "github", "url": "https://cloudflare.com/careers"},
    {"title": "Software Engineer Intern", "company": "Figma", "location": "San Francisco, CA", "role_type": "swe", "source": "github", "url": "https://figma.com/careers"},
    {"title": "Software Engineer Intern, Infrastructure", "company": "Databricks", "location": "San Francisco, CA", "role_type": "swe", "source": "simplify", "url": "https://databricks.com/careers"},
    {"title": "Software Engineer Intern", "company": "Notion", "location": "New York, NY", "role_type": "swe", "source": "simplify", "url": "https://notion.so/careers"},
    {"title": "Software Engineer Intern", "company": "Ramp", "location": "New York, NY", "role_type": "swe", "source": "github", "url": "https://ramp.com/careers"},
    {"title": "Software Engineer Intern", "company": "Scale AI", "location": "San Francisco, CA", "role_type": "swe", "source": "github", "url": "https://scale.com/careers"},
    {"title": "Software Engineer Intern", "company": "Palantir", "location": "New York, NY", "role_type": "swe", "source": "github", "url": "https://palantir.com/careers", "deadline": "2026-09-01"},
    {"title": "Software Engineer Intern", "company": "SpaceX", "location": "Hawthorne, CA", "role_type": "swe", "source": "github", "url": "https://spacex.com/careers", "deadline": "2026-10-15"},
    {"title": "Systems Software Engineer Intern", "company": "NVIDIA", "location": "Santa Clara, CA", "role_type": "swe", "source": "simplify", "url": "https://nvidia.com/careers"},
    {"title": "Software Engineer Intern", "company": "Coinbase", "location": "Remote", "role_type": "swe", "source": "simplify", "url": "https://coinbase.com/careers"},
    {"title": "Software Engineer Intern", "company": "OpenAI", "location": "San Francisco, CA", "role_type": "swe", "source": "github", "url": "https://openai.com/careers", "deadline": "2026-10-01"},
    # Quant
    {"title": "Quantitative Research Intern", "company": "Jane Street", "location": "New York, NY", "role_type": "quant", "source": "github", "url": "https://janestreet.com/apply", "deadline": "2026-10-01"},
    {"title": "Quantitative Analyst Intern", "company": "Citadel", "location": "Chicago, IL", "role_type": "quant", "source": "github", "url": "https://citadel.com/careers", "deadline": "2026-09-15"},
    {"title": "Quantitative Trading Intern", "company": "Two Sigma", "location": "New York, NY", "role_type": "quant", "source": "github", "url": "https://twosigma.com/careers"},
    {"title": "Quantitative Developer Intern", "company": "D.E. Shaw", "location": "New York, NY", "role_type": "quant", "source": "github", "url": "https://deshaw.com/careers", "deadline": "2026-10-15"},
    {"title": "Algorithmic Trading Intern", "company": "Optiver", "location": "Chicago, IL", "role_type": "quant", "source": "simplify", "url": "https://optiver.com/careers"},
    {"title": "Quantitative Research Intern", "company": "Hudson River Trading", "location": "New York, NY", "role_type": "quant", "source": "github", "url": "https://hudsonrivertrading.com/careers"},
    {"title": "Quantitative Strategist Intern", "company": "Goldman Sachs", "location": "New York, NY", "role_type": "quant", "source": "simplify", "url": "https://goldmansachs.com/careers"},
    # CS Research
    {"title": "Research Intern, Machine Learning", "company": "Google DeepMind", "location": "London, UK", "role_type": "cs_research", "source": "github", "url": "https://deepmind.google/careers"},
    {"title": "AI Research Intern", "company": "Meta AI", "location": "Menlo Park, CA", "role_type": "cs_research", "source": "github", "url": "https://ai.meta.com/careers"},
    {"title": "Research Scientist Intern, NLP", "company": "Microsoft Research", "location": "Redmond, WA", "role_type": "cs_research", "source": "simplify", "url": "https://microsoft.com/research/careers"},
    {"title": "ML Research Intern", "company": "Anthropic", "location": "San Francisco, CA", "role_type": "cs_research", "source": "github", "url": "https://anthropic.com/careers"},
    {"title": "Research Engineer Intern", "company": "NVIDIA Research", "location": "Santa Clara, CA", "role_type": "cs_research", "source": "simplify", "url": "https://nvidia.com/research"},
]


def main() -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)

    inserted = 0
    skipped = 0

    for listing in SEED_LISTINGS:
        existing = (
            client.table("listings")
            .select("id")
            .eq("company", listing["company"])
            .eq("title", listing["title"])
            .limit(1)
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        record = {
            "title": listing["title"],
            "company": listing["company"],
            "location": listing.get("location"),
            "role_type": listing["role_type"],
            "source": listing["source"],
            "url": listing.get("url"),
            "deadline": listing.get("deadline"),
            "is_active": True,
        }
        client.table("listings").insert(record).execute()
        inserted += 1
        logger.info("Inserted: %s @ %s", listing["title"], listing["company"])

    logger.info("Seed complete — inserted=%d skipped=%d", inserted, skipped)


if __name__ == "__main__":
    main()
