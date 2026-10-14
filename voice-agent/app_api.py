"""Calls back into the Boca Banker web app (src/app/api/voice/*).

Authenticated with the Supabase service-role key the agent already holds.
Both calls fail open: a web app outage must never drop or block a call.
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("boca-banker-voice")


def _app_url() -> str:
    return os.environ.get("APP_URL", "https://bocabanker.com").rstrip("/")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}"}


async def claim_web_call(client: httpx.AsyncClient | None = None) -> bool:
    """Count a starting website call toward the day's cap. False = cap reached."""
    try:
        async with client or httpx.AsyncClient(timeout=5) as c:
            res = await c.post(f"{_app_url()}/api/voice/claim", headers=_headers())
            res.raise_for_status()
            return bool(res.json().get("allowed", True))
    except Exception:
        logger.exception("could not claim a website call; allowing it")
        return True


async def send_lead_alert(lead_id: str, client: httpx.AsyncClient | None = None) -> None:
    """Have the web app email the owner about a new lead."""
    try:
        async with client or httpx.AsyncClient(timeout=10) as c:
            res = await c.post(
                f"{_app_url()}/api/voice/lead-alert", json={"leadId": lead_id}, headers=_headers()
            )
            res.raise_for_status()
    except Exception:
        logger.exception("could not send the new lead alert for %s", lead_id)
