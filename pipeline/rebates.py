"""Rebate lookup from the saved table (no live calls)."""
from __future__ import annotations

import json
import os

from .water import rebate_estimate

TABLE = os.path.join(os.path.dirname(__file__), "data", "rebate_programs.json")


def load_table(path: str = TABLE) -> dict:
    with open(path) as f:
        return json.load(f)


def norm_city(name: str) -> str:
    """'St. George' / 'Saint George' / 'ST GEORGE' -> 'st george'; same rule as app/src/lib/rebates.ts."""
    s = (name or "").lower().replace(".", "").replace("-", " ")
    s = " ".join(s.split())
    return ("st " + s[6:]) if s.startswith("saint ") else s


def resolve_provider(city: str, table: dict, county: str | None = None) -> dict | None:
    """City name -> provider row. Unincorporated areas fall back to the county's program where
    Utah Water Savers says unincorporated residents are eligible. None = not eligible."""
    c = norm_city(city)
    for p in table["providers"]:
        if c in (norm_city(x) for x in p["cities"]):
            return p
    unincorporated = not c or "unincorporated" in c or c == f"{(county or '').lower()} county"
    pid = table.get("unincorporated", {}).get(county or "") if unincorporated else None
    return next((p for p in table["providers"] if p["id"] == pid), None)


def estimate(lawn_sqft: float, city: str, table: dict | None = None, county: str | None = None) -> dict:
    table = table or load_table()
    p = resolve_provider(city, table, county)
    warning = "Get pre-approval and the site visit BEFORE removing or killing any lawn. Doing it first disqualifies the project."
    if p is None:
        return {"provider": None, "provider_id": None, "eligible": False, "reason": "city_not_listed", "eligible_sqft": 0,
                "estimated_range": [0, 0], "estimated_up_to": 0, "warning": warning, "rules": table["statewide_rules"]}
    hi = rebate_estimate(lawn_sqft, p["rate_high"], p["min_sqft"], p.get("max_sqft"), p.get("max_dollars"))
    lo = rebate_estimate(lawn_sqft, p["rate_low"], p["min_sqft"], p.get("max_sqft"), p.get("max_dollars"))
    return {
        "provider": p["name"],
        "provider_id": p["id"],
        "eligible": hi["eligible"],
        "reason": None if hi["eligible"] else "below_minimum",
        "eligible_sqft": hi["eligible_sqft"],
        "rate_range": [p["rate_low"], p["rate_high"]],
        "estimated_range": [lo["estimated_up_to"], hi["estimated_up_to"]],
        "estimated_up_to": hi["estimated_up_to"],
        "verified": p["verified"],
        "last_checked": p["last_checked"],
        "apply_url": p["apply_url"],
        "warning": warning,
        "rules": table["statewide_rules"],
    }
