"""Lead capture and mortgage math for the phone agent.

Leads are written through Supabase REST with the service-role key and assigned
to the earliest admin user, matching the web chat's guest lead capture so
phone leads show up on the dashboard Leads page.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger("boca-banker-voice")


def monthly_payment(loan_amount: float, annual_rate: float, term_years: int) -> float:
    """Principal and interest per month. annual_rate is a percent, e.g. 6.5."""
    n = term_years * 12
    r = annual_rate / 100 / 12
    if n <= 0:
        raise ValueError("term must be positive")
    if r == 0:
        return loan_amount / n
    return loan_amount * r * (1 + r) ** n / ((1 + r) ** n - 1)


def build_lead_row(
    *,
    owner_id: str | None,
    name: str,
    phone: str | None,
    email: str | None,
    summary: str | None,
    interest: str | None,
) -> dict:
    return {
        "user_id": owner_id,
        "property_address": "Not provided",
        "property_state": "FL",
        "property_type": "other",
        "buyer_name": name.strip()[:100],
        "buyer_phone": (phone or "").strip()[:40] or None,
        "buyer_email": (email or "").strip()[:200] or None,
        "source": "phone-call",
        "notes": " — ".join(p for p in (interest, summary) if p) or None,
        "tags": ["phone-agent"],
        "status": "new",
        "priority": "high",
    }


@dataclass
class LeadStore:
    """Writes at most one lead per call; later captures update that lead."""

    url: str = field(default_factory=lambda: os.environ["SUPABASE_URL"].rstrip("/"))
    key: str = field(default_factory=lambda: os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    lead_id: str | None = None
    _owner_id: str | None = None

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def _owner(self, client: httpx.AsyncClient) -> str | None:
        if self._owner_id is None:
            res = await client.get(
                f"{self.url}/rest/v1/users",
                params={"select": "id", "role": "eq.admin", "order": "created_at.asc", "limit": "1"},
                headers=self._headers,
            )
            res.raise_for_status()
            rows = res.json()
            self._owner_id = rows[0]["id"] if rows else None
        return self._owner_id

    async def save(self, **fields) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            row = build_lead_row(owner_id=await self._owner(client), **fields)
            if self.lead_id is None:
                res = await client.post(f"{self.url}/rest/v1/leads", json=row, headers=self._headers)
                res.raise_for_status()
                self.lead_id = res.json()[0]["id"]
                logger.info("created phone lead %s", self.lead_id)
            else:
                # Only overwrite fields the caller actually provided
                patch = {k: v for k, v in row.items() if v is not None and k not in ("user_id", "status")}
                res = await client.patch(
                    f"{self.url}/rest/v1/leads",
                    params={"id": f"eq.{self.lead_id}"},
                    json=patch,
                    headers=self._headers,
                )
                res.raise_for_status()
                logger.info("updated phone lead %s", self.lead_id)
