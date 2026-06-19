# Product Requirements Document
## Internship Finder & Tracker — Summer 2027
**Owner:** Devon Lopez  
**Last Updated:** June 2026  
**Status:** Planning

---

## 1. Overview

### 1.1 Purpose
A personal full-stack web application that autonomously discovers SWE, Quant, and CS-related internship listings for Summer 2027 and provides a centralized dashboard to track application status. The app runs scrapers on a schedule, deduplicates and filters listings, stores them in a hosted database, and exposes a clean React frontend for browsing and tracking.

### 1.2 Problem Statement
Internship recruiting for competitive SWE and Quant roles (Jane Street, Citadel, HRT, Two Sigma, Google, Meta, etc.) opens as early as August–September for the following summer. Manually checking multiple job boards daily is time-consuming and error-prone. There is no single tool that both discovers relevant listings automatically and tracks application progress in one place.

### 1.3 Goals
- Auto-discover new internship listings daily without manual effort
- Filter results to only SWE, Quant, CS, and adjacent roles
- Track each application through its full lifecycle (saved → applied → OA → interview → offer/rejected)
- Surface upcoming deadlines before they pass
- Keep the entire stack free to host

### 1.4 Non-Goals
- No mobile app (web only, optimized for MacBook Pro)
- No multi-user support or authentication (personal tool)
- No automated applying to roles
- No resume/cover letter storage (out of scope for v1)
- No LinkedIn scraping (rate-limited and ToS-restricted)

---

## 2. Users & Context

| Attribute | Detail |
|---|---|
| User | Devon Lopez (sole user) |
| School | Texas A&M University, B.S. Computer Science + Math minor |
| Target roles | SWE internships, Quant Developer internships, CS-adjacent research/engineering |
| Target companies | Finance firms (Jane Street, Citadel, HRT, Two Sigma, DRW), Big Tech (Google, Meta, Apple, Microsoft, Amazon), Mid-size tech, fintech startups |
| Primary device | MacBook Pro M4 |
| Coding experience | Python (primary), learning C++ |
| IDE | VSCode + Warp terminal |

---

## 3. Tech Stack

### 3.1 Chosen Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Fast dev server, familiar component model |
| Backend API | FastAPI (Python) | Python-native, great async support, easy REST |
| Scraper/Scheduler | Python + APScheduler + Playwright/BeautifulSoup | Long-running process support |
| Database | Supabase (hosted PostgreSQL) | Free tier, Postgres SQL, REST + Python client |
| Scraper hosting | Railway | Free tier, supports persistent Python processes, no timeout |
| Frontend + API hosting | Vercel (Hobby plan) | Free, excellent for React + FastAPI serverless |
| ORM | SQLAlchemy | Pythonic DB layer |
| HTTP client | httpx / requests | Scraping static pages |
| JS rendering | Playwright | For JS-heavy job board pages |

### 3.2 Repository Structure

```
internship-tracker/
├── .claude/
│   ├── settings.json          # Claude Code permissions (committed)
│   └── settings.local.json    # Secrets — gitignored
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ListingsTable.jsx
│   │   │   ├── KanbanBoard.jsx
│   │   │   ├── StatsPanel.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   └── DeadlineBanner.jsx
│   │   ├── pages/
│   │   │   ├── Listings.jsx
│   │   │   ├── Tracker.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── api/
│   │   │   └── client.js       # Axios/fetch wrapper for FastAPI
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── api/
│   ├── index.py                # FastAPI entrypoint (Vercel expects this path)
│   ├── routers/
│   │   ├── listings.py         # GET /listings, GET /listings/{id}
│   │   ├── applications.py     # POST/PATCH /applications
│   │   └── stats.py            # GET /stats
│   ├── models/
│   │   ├── listing.py
│   │   └── application.py
│   ├── db.py                   # SQLAlchemy + Supabase connection
│   └── requirements.txt
├── scraper/
│   ├── main.py                 # APScheduler entrypoint
│   ├── sources/
│   │   ├── simplify.py
│   │   ├── handshake.py
│   │   └── github_jobs.py
│   ├── pipeline/
│   │   ├── dedup.py            # Deduplication logic
│   │   ├── filter.py           # Role classification
│   │   └── writer.py           # Supabase write layer
│   └── requirements.txt
├── .env.example                # Template for required env vars
├── .gitignore
├── CLAUDE.md                   # Project context for Claude Code
├── PRD.md                      # This file
└── vercel.json                 # Vercel routing config
```

---

## 4. Database Schema

### 4.1 `listings` table
Populated by the scraper. Read-only from the API perspective.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `title` | TEXT NOT NULL | e.g. "Software Engineer Intern" |
| `company` | TEXT NOT NULL | e.g. "Jane Street" |
| `location` | TEXT | e.g. "New York, NY" or "Remote" |
| `role_type` | TEXT | `swe`, `quant`, `cs_research`, `other` |
| `source` | TEXT | `simplify`, `handshake`, `github` |
| `url` | TEXT UNIQUE | Original job posting URL |
| `description_snippet` | TEXT | First 500 chars of job description |
| `deadline` | DATE | Application deadline if available |
| `posted_at` | TIMESTAMP | When the listing was first seen |
| `created_at` | TIMESTAMP | Row creation time |
| `is_active` | BOOLEAN | False if listing was removed at source |

### 4.2 `applications` table
Managed by the user through the UI.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `listing_id` | UUID (FK → listings.id) | Nullable — allows manual entries |
| `company` | TEXT NOT NULL | Copied from listing or entered manually |
| `role` | TEXT NOT NULL | Job title |
| `status` | TEXT NOT NULL | See status enum below |
| `applied_at` | DATE | Date application was submitted |
| `deadline` | DATE | Application deadline |
| `notes` | TEXT | Freeform notes field |
| `oa_date` | DATE | Online assessment date |
| `interview_date` | DATE | Interview date |
| `offer_deadline` | DATE | Exploding offer deadline |
| `updated_at` | TIMESTAMP | Auto-updated on any change |
| `created_at` | TIMESTAMP | Row creation time |

### 4.3 Application Status Enum
```
saved → applied → oa_received → oa_submitted → interview_scheduled
→ interview_done → offer → rejected → withdrawn
```

---

## 5. Feature Requirements

### 5.1 Scraper (P0 — Must Have)

#### 5.1.1 Sources
| Source | Method | Notes |
|---|---|---|
| Simplify.jobs | HTTP + BeautifulSoup | Best aggregator for SWE/Quant internships; structured data |
| Handshake | Playwright (JS-rendered) | Good for Texas A&M-specific postings |
| GitHub Jobs (pittcsc/Summer2025-Internships) | GitHub API or raw file fetch | Community-maintained, high signal for CS internships |

#### 5.1.2 Schedule
- Run daily at 8:00 AM CT via APScheduler `CronTrigger`
- On first run, back-fill up to 90 days of listings
- Log all scrape runs with timestamp, listings found, listings inserted, errors

#### 5.1.3 Deduplication
- Deduplicate on `(company, title, location)` tuple normalized to lowercase + stripped whitespace
- Secondary dedup on `url` if available
- If a duplicate is found, update `is_active = true` and skip insert

#### 5.1.4 Role Filtering
Filter listings to include only:
- Title contains any of: `software`, `swe`, `engineer`, `developer`, `quant`, `quantitative`, `research`, `data`, `ml`, `machine learning`, `systems`, `backend`, `frontend`, `fullstack`, `infrastructure`, `platform`
- Exclude: `marketing`, `sales`, `hr`, `recruiter`, `product manager`, `PM`, `designer`, `UX`
- Role type classification: assign `swe`, `quant`, `cs_research`, or `other` based on title keywords

#### 5.1.5 Environment Variables Required (scraper)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   # Bypasses row-level security for writes
```

---

### 5.2 Backend API (P0 — Must Have)

FastAPI app deployed to Vercel as a serverless function at `/api/*`.

#### 5.2.1 Endpoints

**Listings**
```
GET  /api/listings
  Query params: role_type, source, company, search (text), limit, offset, sort_by, deadline_before
  Returns: paginated list of listings

GET  /api/listings/{id}
  Returns: single listing detail

PATCH /api/listings/{id}
  Body: { is_active: bool }
  Purpose: manually hide a listing
```

**Applications**
```
GET    /api/applications
  Query params: status, company, sort_by
  Returns: all applications

POST   /api/applications
  Body: { listing_id?, company, role, status, applied_at?, deadline?, notes? }
  Returns: created application

PATCH  /api/applications/{id}
  Body: any subset of application fields
  Returns: updated application

DELETE /api/applications/{id}
  Returns: 204 No Content
```

**Stats**
```
GET /api/stats
  Returns: {
    total_listings: int,
    new_listings_today: int,
    applications_by_status: { saved: n, applied: n, ... },
    upcoming_deadlines: [{ company, role, deadline, days_remaining }],
    response_rate: float
  }
```

#### 5.2.2 Environment Variables Required (API)
```
SUPABASE_URL
SUPABASE_ANON_KEY   # Read-only key for API queries
```

#### 5.2.3 Vercel Configuration
```json
// vercel.json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.py" }]
}
```

---

### 5.3 Frontend (P0 — Must Have)

React SPA deployed to Vercel. Three main views accessible via top nav.

#### 5.3.1 Listings Page (`/`)
- Table of all scraped listings, newest first
- Columns: Company, Role, Location, Type (badge), Source, Deadline, Posted
- Filter bar: role type (SWE / Quant / Research / All), source, search by company or keyword
- Each row: "Save to Tracker" button → creates an application row with status `saved`
- Deadline within 7 days highlighted in amber; past deadline shown in red
- Pagination (50 per page)

#### 5.3.2 Tracker Page (`/tracker`)
- Kanban-style board with columns for each application status
- Cards show: Company, Role, Deadline, Notes preview
- Drag-and-drop between columns to update status (use `@dnd-kit/core`)
- Click any card to open a detail drawer: all fields editable inline
- "Add manually" button to create an application not tied to a scraped listing

#### 5.3.3 Dashboard Page (`/dashboard`)
- 4 stat cards: Total listings today, Active applications, Upcoming deadlines, Response rate
- Applications by status bar chart (Recharts)
- Upcoming deadlines list (next 14 days)
- Last scrape timestamp

#### 5.3.4 Global
- Top navigation: Listings | Tracker | Dashboard
- Dark mode support via TailwindCSS `dark:` classes
- Toast notifications for save/update/delete actions (react-hot-toast)
- Responsive down to 1024px width minimum

---

### 5.4 Deadline Alerts (P1 — Should Have)
- Persistent banner on all pages when any tracked application has a deadline within 3 days
- Browser notification (Notification API) when app loads and a deadline is within 24 hours — ask for permission on first load

### 5.5 Manual Listing Entry (P1 — Should Have)
- "Add listing manually" on Listings page
- Form: Company, Role, URL, Location, Deadline, Notes
- Saved directly to `listings` table with `source = 'manual'`

### 5.6 Scrape Log View (P2 — Nice to Have)
- Admin panel at `/logs` showing each scrape run: timestamp, source, counts, errors
- Table — no authentication required since personal tool

### 5.7 Export (P2 — Nice to Have)
- "Export CSV" button on Tracker page
- Exports all applications with all fields

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Listings page initial load: < 1 second (paginated, no full table scan)
- API responses: < 300ms for all read endpoints
- Scraper run: < 5 minutes for full daily run across all sources

### 6.2 Reliability
- Scraper failures are logged and do not crash the scheduler (wrap each source in try/except)
- API returns 200 with empty array on DB connection failure rather than 500 where safe
- Dead listings (removed from source) marked `is_active = false` rather than deleted

### 6.3 Security
- `.env` and `settings.local.json` always in `.gitignore` — never committed
- Use Supabase anon key (read-only) for API, service role key only in scraper
- No secrets in source code or `CLAUDE.md`
- Row-level security enabled on Supabase tables for future-proofing

### 6.4 Developer Experience
- All Python dependencies in `requirements.txt` (separate files for `api/` and `scraper/`)
- Frontend bootstrapped with `npm create vite@latest`
- Linting: `ruff` for Python, `eslint` for JS
- Format on save: `black` for Python, `prettier` for JS/JSX

---

## 7. Environment Variables Reference

Create `.env.example` at repo root and never commit actual values:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...           # Used by FastAPI (read)
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Used by scraper only (read/write)

# Optional: override scraper schedule for local testing
SCRAPER_CRON_HOUR=8
SCRAPER_CRON_MINUTE=0
SCRAPER_TIMEZONE=America/Chicago
```

---

## 8. Build & Run

### 8.1 Local Development
```bash
# Database: point to Supabase (no local DB needed)

# API
cd api && pip install -r requirements.txt
uvicorn index:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev   # runs on localhost:5173, proxies /api/* to localhost:8000

# Scraper (manual trigger for testing)
cd scraper && pip install -r requirements.txt
python main.py --run-now
```

### 8.2 Deployment
```bash
# Frontend + API: push to GitHub → Vercel auto-deploys
# Scraper: push to GitHub → Railway auto-deploys from scraper/ directory
```

---

## 9. Milestones

| Phase | Scope | Target |
|---|---|---|
| 1 — Data pipeline | Simplify scraper + Supabase schema + dedup | Week 1–2 |
| 2 — API | FastAPI endpoints + Vercel deploy | Week 3–4 |
| 3 — Frontend MVP | Listings page + basic Tracker | Week 5–6 |
| 4 — Polish | Dashboard, Kanban DnD, deadline alerts | Week 7–8 |
| 5 — Add sources | Handshake + GitHub Jobs scrapers | Week 9 |

**Target live date:** August 1, 2026 (before Fall 2026 recruiting season opens for Summer 2027)

---

## 10. Open Questions

- Should Playwright run headless on Railway free tier? (Yes — Railway supports chromium headless)
- Is `pittcsc/Summer2027-Internships` repo available yet? (Check August 2026; use 2026 repo in the interim)
- Should the Kanban board persist column order? (Yes — store in localStorage)
- Rate limit strategy for Handshake? (Add 2–5 second random delays between requests)