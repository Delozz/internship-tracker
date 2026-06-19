# Internship Tracker — Summer 2027

A personal full-stack web app that auto-scrapes SWE, Quant, and CS Research internship listings for Summer 2027 and tracks application status through a Kanban dashboard.

**Live app:** [internship-tracker-ruddy.vercel.app](https://internship-tracker-ruddy.vercel.app)

---

## How It Works

```
Scraper (Railway, daily 8 AM CT)
  └── Fetches GitHub internship READMEs + Simplify.jobs
  └── Deduplicates, classifies role type, writes to Supabase

FastAPI (Vercel serverless)
  └── Serves listings + applications from Supabase

React frontend (Vercel)
  └── Browse listings → Save → Track on Kanban board
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + @dnd-kit |
| API | FastAPI (Python 3.12) + Pydantic |
| Database | Supabase (PostgreSQL) |
| Scraper | Playwright + BeautifulSoup4 + httpx + APScheduler |
| Frontend hosting | Vercel (Hobby) |
| API hosting | Vercel serverless functions |
| Scraper hosting | Railway (worker process) |

---

## Project Structure

```
internship-tracker/
├── frontend/             React + Vite + TailwindCSS
│   └── src/
│       ├── api/client.js         fetch wrapper — all API calls
│       ├── pages/
│       │   ├── Listings.jsx      table + filter bar + "Save to Tracker"
│       │   ├── Tracker.jsx       Kanban board with drag-and-drop
│       │   └── Dashboard.jsx     stat cards, bar chart, deadlines
│       └── components/
│           ├── FilterBar.jsx
│           ├── KanbanCard.jsx
│           ├── StatsPanel.jsx
│           └── DeadlineBanner.jsx
├── api/                  FastAPI (Vercel serverless)
│   ├── index.py          app entrypoint
│   ├── routers/          listings.py, applications.py, stats.py
│   ├── models/           listing.py, application.py
│   └── db.py             Supabase client (anon key, read-only)
├── scraper/              Python scraper + APScheduler (Railway)
│   ├── main.py           scheduler entrypoint — daily 8:00 AM CT
│   ├── sources/          github_jobs.py, simplify.py
│   ├── pipeline/         dedup.py, filter.py, writer.py
│   └── seed.py           seed Supabase with sample listings for dev
├── supabase/schema.sql   DB schema — run once in Supabase SQL editor
├── vercel.json           build config + /api/* rewrites
├── Procfile              Railway worker start command
├── requirements.txt      root deps for Railway (Railpack)
├── .python-version       pins Python 3.12 for Railway
└── .env.example          required env vars template
```

---

## Application Status Flow

```
saved → applied → oa_received → oa_submitted →
interview_scheduled → interview_done → offer → rejected / withdrawn
```

---

## Role Types (Zones)

| Zone | Matched On |
|---|---|
| `swe` | software, engineer, developer, backend, frontend, infrastructure… |
| `quant` | quantitative, trading, algorithmic, derivatives… |
| `cs_research` | research, ML, AI, NLP, computer vision, deep learning… |
| `other` | everything else that passes the include filter |

---

## Scraper Sources

| Source | Method | Status |
|---|---|---|
| GitHub (vanshb03 / SimplifyJobs) | httpx — parses README HTML tables + markdown | Active |
| Simplify.jobs | Playwright — JS-rendered SPA scrape | Active (CF may block) |

The scraper runs daily at **8:00 AM CT** via APScheduler on Railway. Each source is isolated in a `try/except` — one failure never stops the others.

---

## Local Development

### Prerequisites

- Python 3.12+
- Node 18+
- A [Supabase](https://supabase.com) project with `supabase/schema.sql` applied

### Setup

```bash
# 1. Copy env template and fill in your values
cp .env.example .env

# 2. API (from api/)
pip install -r api/requirements.txt
uvicorn index:app --reload --port 8000

# 3. Frontend (from frontend/)
npm install
npm run dev        # localhost:5173 — proxies /api/* to :8000

# 4. Scraper — one immediate run for testing (from repo root)
pip install -r requirements.txt
playwright install chromium
python -m scraper.main --run-now

# 5. Seed sample data (optional)
python -m scraper.seed
```

---

## Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `SUPABASE_URL` | API + Scraper | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | API | Read-only key for FastAPI |
| `SUPABASE_SERVICE_ROLE_KEY` | Scraper | Write key — never expose to frontend |
| `SCRAPER_CRON_HOUR` | Scraper | Hour to run daily scrape (default: `8`) |
| `SCRAPER_CRON_MINUTE` | Scraper | Minute offset (default: `0`) |
| `SCRAPER_TIMEZONE` | Scraper | Timezone string (default: `America/Chicago`) |

See `.env.example` for the full template.

---

## Deployment

| Service | Hosts | Notes |
|---|---|---|
| Vercel Hobby | React frontend + FastAPI | Auto-deploys on push to `main`. 10s function timeout. |
| Railway | Python scraper + APScheduler | Persistent worker process. Set Build Command to `playwright install chromium`. |
| Supabase | PostgreSQL | Run `supabase/schema.sql` once to create tables. |

---

## Database Schema

Defined in `supabase/schema.sql`. Two tables:

- **`listings`** — scraped internship postings (`id`, `title`, `company`, `location`, `role_type`, `source`, `url`, `deadline`, `is_active`, `posted_at`, `created_at`)
- **`applications`** — tracked applications (`id`, `listing_id`, `company`, `role`, `status`, `applied_at`, `deadline`, `notes`, `oa_date`, `interview_date`, `offer_deadline`, `created_at`, `updated_at`)
