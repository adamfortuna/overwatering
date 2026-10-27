"""Rebate lookup from the saved table (no live calls)."""
from __future__ import annotations

import json
import os

from .water import rebate_estimate

TABLE = os.path.join(os.path.dirname(__file__), "data", "rebate_programs.json")


def load_table(path: str = TABLE) -> dict:
    with open(path) as f:
        return json.load(f)


def resolve_provider(city: str, table: dict) -> dict:
    """City name -> provider row; falls back to the statewide track."""
    c = (city or "").strip().lower()
    for p in table["providers"]:
        if c in (x.lower() for x in p["cities"]):
            return p
    return next(p for p in table["providers"] if p["id"] == "state")


def estimate(lawn_sqft: float, city: str, table: dict | None = None) -> dict:
    table = table or load_table()
    p = resolve_provider(city, table)
    hi = rebate_estimate(lawn_sqft, p["rate_high"], p["min_sqft"], p.get("max_sqft"), p.get("max_dollars"))
    lo = rebate_estimate(lawn_sqft, p["rate_low"], p["min_sqft"], p.get("max_sqft"), p.get("max_dollars"))
    return {
        "provider": p["name"],
        "provider_id": p["id"],
        "eligible": hi["eligible"],
        "eligible_sqft": hi["eligible_sqft"],
        "rate_range": [p["rate_low"], p["rate_high"]],
        "estimated_range": [lo["estimated_up_to"], hi["estimated_up_to"]],
        "estimated_up_to": hi["estimated_up_to"],
        "verified": p["verified"],
        "last_checked": p["last_checked"],
        "apply_url": p["apply_url"],
        "warning": "Get pre-approval and the site visit BEFORE removing or killing any lawn. Doing it first disqualifies the project.",
        "rules": table["statewide_rules"],
    }
