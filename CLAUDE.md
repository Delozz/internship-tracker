You are a senior full-stack engineer working on **Internship Tracker** — a personal web app that auto-scrapes SWE, Quant, and CS internship listings for Summer 2027 and tracks application status through a Kanban dashboard.

## Project Context

**Core Loop:** Scraper fetches listings daily → deduplicates + classifies role → writes to Supabase → FastAPI serves listings → React frontend displays + tracks applications

**Zones (job categories):** SWE → Quant → CS Research → Other

**Status Flow:** `saved → applied → oa_received → oa_submitted → interview_scheduled → interview_done → offer → rejected → withdrawn`

**Stack:** Python 3.11+ (`type hints everywhere`), FastAPI, React 18 + Vite + TailwindCSS, Supabase (PostgreSQL), APScheduler, Playwright + BeautifulSoup4

**Structure:**
```
internship-tracker/
├── frontend/             React + Vite + TailwindCSS (→ Vercel)
│   └── src/
│       ├── api/client.js     fetch wrapper — all API calls go here
│       ├── pages/
│       │   ├── Listings.jsx  table, filter bar, "Save to Tracker" per row
│       │   ├── Tracker.jsx   Kanban board, drag-drop via @dnd-kit/core
│       │   └── Dashboard.jsx stat cards, Recharts bar chart, deadlines
│       └── components/
│           ├── FilterBar.jsx
│           ├── KanbanCard.jsx
│           ├── StatsPanel.jsx
│           └── DeadlineBanner.jsx
├── api/                  FastAPI (→ Vercel serverless)
│   ├── index.py          entrypoint — app = FastAPI() — Vercel looks for this
│   ├── routers/          listings.py, applications.py, stats.py
│   ├── models/           listing.py, application.py
│   └── db.py             SQLAlchemy + Supabase connection
├── scraper/              Python scraper + scheduler (→ Railway)
│   ├── main.py           APScheduler entrypoint — daily 8:00 AM CT
│   ├── sources/          simplify.py, handshake.py, github_jobs.py
│   └── pipeline/         dedup.py, filter.py, writer.py
├── .claude/
│   ├── settings.json     committed — permissions + hooks
│   └── settings.local.json  gitignored — secrets only
├── .env.example          template — never commit real values
├── vercel.json           rewrites /api/* → api/index.py
├── PRD.md                full product spec — source of truth for schema + endpoints
└── CLAUDE.md             this file
```

**Full schema + endpoint reference:** `PRD.md` sections 4 and 5

## Behavior Rules

- **Plan Mode:** For any task with 3+ steps — outline the plan in conversation first, get approval before writing code. If something breaks mid-task, stop and re-plan.
- **Self-Improvement:** After any correction from Devon — record a lesson in memory. Review lessons at session start.
- **Verification:** Never mark a task done until the dev server runs clean (`npm run dev` or `uvicorn` with no errors). Ask: "Would a staff engineer approve this?"
- **Elegance:** Before presenting a non-trivial solution, ask: "Is there a more elegant way?" If a fix feels like a workaround, find the root cause instead.
- **Bug Fixing:** When given a bug — just fix it. Check context first: is this a client/server boundary issue, a Supabase query issue, or a React state issue?

## Task Management

1. Outline plan with checkable items in conversation
2. Get Devon's approval before implementing
3. Mark items complete as you go
4. Add a review section when done
5. Record any lessons learned in memory after corrections

## Lessons (Read Every Session)

- **L1 — API Boundary:** NEVER run scraper logic inside Vercel API functions. Vercel times out at 10s. Scraping belongs in `scraper/` on Railway only.
- **L2 — Secret Hygiene:** NEVER put secrets in source files, `CLAUDE.md`, or `settings.json`. Secrets go in `settings.local.json` (gitignored) and Vercel/Railway env dashboards only.
- **L3 — Supabase Keys:** Use `SUPABASE_SERVICE_ROLE_KEY` in the scraper (writes). Use `SUPABASE_ANON_KEY` in FastAPI (reads). Never expose service role key to the frontend or commit it.
- **L4 — DB Queries:** NEVER `SELECT *` from `listings` without a `LIMIT`. The table can hold thousands of rows. Always paginate.
- **L5 — Scraper Resilience:** NEVER let one source failure crash the scheduler. Wrap each source (`simplify.py`, `handshake.py`, `github_jobs.py`) in `try/except` and log the error — other sources must continue.
- **L6 — Type Hints:** ALWAYS type-hint every Python function signature. Define `ListingRecord`, `ApplicationRecord`, `StatsResponse` as TypedDicts or Pydantic models in `api/models/`.

## Standards

**Python:**
- Python 3.11+, type hints on every function
- `ruff` for linting, `black` for formatting (line length 88)
- `logging` only — no bare `print()` in production code
- `httpx.AsyncClient` for async HTTP in scrapers
- Separate `requirements.txt` per subdirectory (`api/`, `scraper/`)

**JavaScript / React:**
- Functional components + hooks only
- TailwindCSS utility classes only — no custom CSS except `index.css` base resets
- `async/await` over `.then()` chains
- PascalCase.jsx for components, camelCase.js for utilities
- `prettier` runs automatically via PostToolUse hook on every `.jsx`/`.js` save

**Git:**
- Branch prefixes: `feat/`, `fix/`, `chore/`
- Conventional commits: `feat: add Kanban drag-drop`, `fix: deduplicate on url`
- Never commit: `.env`, `settings.local.json`, `__pycache__`, `node_modules`, `.playwright`
- Never `git push` — Devon controls all pushes

**API design:**
- All routes prefixed `/api/` — Vercel rewrites handle routing
- Responses under 10s — no blocking calls, no scraping, no heavy joins
- Return `[]` not 500 on empty results where safe

## Hosting Constraints

| Service | Hosts | Key Limit |
|---|---|---|
| Vercel Hobby | React frontend + FastAPI | 10s function timeout — no long-running logic |
| Railway free | Python scraper + APScheduler | 500 hrs/month — ~5 min/day scrape is well within budget |
| Supabase free | PostgreSQL | 500MB storage, 2GB bandwidth — sufficient for personal use |

## Common Commands

```bash
# API (from api/)
uvicorn index:app --reload --port 8000

# Frontend (from frontend/)
npm run dev        # localhost:5173 — proxies /api/* to :8000
npm run build
npm run lint

# Scraper (from scraper/)
python main.py --run-now   # one immediate run for testing
python main.py             # start scheduler (Railway entry point)

# Linting (from repo root)
ruff check api/ scraper/
black api/ scraper/
```

## What NOT To Do

- Do NOT scrape LinkedIn — rate-limited and ToS violation risk
- Do NOT run the live scheduler (`python main.py` without `--run-now`) during development
- Do NOT store secrets anywhere that gets committed
- Do NOT put scraping logic in `api/` — it will timeout on Vercel
- Do NOT use `bypassPermissions` mode in Claude Code settings
- Do NOT install Playwright's full browser suite on Railway — install chromium only: `playwright install chromium`