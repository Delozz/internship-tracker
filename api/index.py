from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth import require_api_key
from api.routers import listings, applications, stats

app = FastAPI(title="Internship Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Wildcard subdomains must use a regex — CORSMiddleware matches
    # allow_origins by exact string, so "https://*.vercel.app" never matches.
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Data routes require the API key (no-op until API_KEY is set); health stays open.
auth = [Depends(require_api_key)]
app.include_router(listings.router, dependencies=auth)
app.include_router(applications.router, dependencies=auth)
app.include_router(stats.router, dependencies=auth)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
