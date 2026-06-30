from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.include_router(listings.router)
app.include_router(applications.router)
app.include_router(stats.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
