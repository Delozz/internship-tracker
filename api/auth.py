"""Shared-secret API key check.

Enforced only when the API_KEY env var is set. If it is unset (e.g. local dev),
auth is disabled and all requests pass — so nothing breaks until you opt in by
setting API_KEY in the Vercel dashboard (and VITE_API_KEY on the frontend).
"""
import os
from typing import Optional

from fastapi import Header, HTTPException, status


def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    expected = os.environ.get("API_KEY")
    if not expected:
        return  # auth disabled — no key configured
    if x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
