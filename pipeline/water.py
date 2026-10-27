"""Phase 1 water math. Pure functions, no I/O (except the gridMET ETo helper).

Units: areas in sq ft, depths in inches, volumes in US gallons unless named otherwise.

References
* Reference ET: ASCE/FAO-56 Penman-Monteith, short (grass) reference, daily timestep
  (Allen et al. 1998, FAO Irrigation & Drainage Paper 56, eqs. 6, 11-13, 21-39).
* Turf crop coefficient: cool-season turf Kc ~0.80 (FAO-56 Table 12 "turf grass, cool season"
  Kc_mid = 0.95 for well-watered; Utah State University Extension / Utah DWR landscape guidance
  use 0.80 for Kentucky bluegrass lawns in Utah). Default 0.80, configurable.
* Water-wise landscape coefficient: 0.30 (low water-use plantings, WUCOLS/ASCE landscape
  coefficient method, "low" category 0.1-0.3; Utah "Localscapes" guidance quotes 50-70% savings
  vs lawn). Default 0.30, configurable.
* Conversions: 1 ft³ = 7.4805 gal; 1 CCF (hundred cubic feet) = 748.05 gal; 1 acre-ft = 325,851 gal.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

GAL_PER_CUFT = 7.48052
GAL_PER_CCF = 748.052
GAL_PER_ACRE_FT = 325_851.0
GAL_PER_KGAL = 1000.0
TURF_KC = 0.80
WATERWISE_KC = 0.30
IRRIGATION_MONTHS = (4, 5, 6, 7, 8, 9, 10)  # Wasatch Front: mid-April to mid-October
REBATE_MIN_SQFT = 200  # Utah Water Savers Landscape Incentive Program minimum project area

UNIT_TO_GAL = {"gal": 1.0, "gallons": 1.0, "kgal": GAL_PER_KGAL, "ccf": GAL_PER_CCF, "hcf": GAL_PER_CCF, "cuft": GAL_PER_CUFT, "acre-ft": GAL_PER_ACRE_FT}


def to_gallons(value: float, unit: str) -> float:
    try:
        return value * UNIT_TO_GAL[unit.lower()]
    except KeyError:
        raise ValueError(f"Unknown water unit {unit!r}; expected one of {sorted(UNIT_TO_GAL)}") from None


def depth_to_gallons(depth_in: float, area_sqft: float) -> float:
    """Volume of water to cover area_sqft to depth_in inches."""
    return depth_in / 12.0 * area_sqft * GAL_PER_CUFT


# --- Turf need -------------------------------------------------------------------------------


def turf_need_in(eto_in: float, kc: float = TURF_KC, effective_precip_in: float = 0.0) -> float:
    """Net irrigation depth for one period: ETo * Kc minus effective rainfall, floored at 0."""
    return max(0.0, eto_in * kc - effective_precip_in)


def turf_need_gallons(lawn_sqft: float, eto_in: float, kc: float = TURF_KC, effective_precip_in: float = 0.0, efficiency: float = 1.0) -> float:
    """Gallons needed for one period. efficiency < 1 inflates need for sprinkler losses
    (0.7-0.8 typical for spray heads); 1.0 gives the plant requirement."""
    if efficiency <= 0:
        raise ValueError("efficiency must be > 0")
    return depth_to_gallons(turf_need_in(eto_in, kc, effective_precip_in), lawn_sqft) / efficiency


def annual_turf_need_gallons(lawn_sqft: float, eto_monthly_in: dict[int, float], precip_monthly_in: dict[int, float] | None = None, kc: float = TURF_KC, months=IRRIGATION_MONTHS, effective_precip_frac: float = 0.5, efficiency: float = 1.0) -> dict[int, float]:
    """Per-month gallons over the irrigation season. Keys are month numbers 1-12."""
    out = {}
    for m in months:
        p = (precip_monthly_in or {}).get(m, 0.0) * effective_precip_frac
        out[m] = turf_need_gallons(lawn_sqft, eto_monthly_in[m], kc, p, efficiency)
    return out


# --- Bill ------------------------------------------------------------------------------------


@dataclass
class BillResult:
    indoor_baseline_gal: float  # per month
    outdoor_gal_by_month: dict[int, float]
    total_outdoor_gal: float
    baseline_months: tuple


def outdoor_use_from_bill(monthly_use: dict[int, float], unit: str = "gal", baseline_months=(12, 1, 2)) -> BillResult:
    """Outdoor use = monthly use minus the winter (indoor) baseline, floored at 0.

    monthly_use: {month: usage} for up to 12 months in the bill's unit. Baseline is the mean of
    the available baseline months, else the minimum month (bills that only show summer)."""
    if not monthly_use:
        raise ValueError("monthly_use is empty")
    g = {m: to_gallons(v, unit) for m, v in monthly_use.items()}
    base_vals = [g[m] for m in baseline_months if m in g]
    used = tuple(m for m in baseline_months if m in g)
    if not base_vals:
        base = min(g.values())
        used = (min(g, key=g.get),)
    else:
        base = sum(base_vals) / len(base_vals)
    outdoor = {m: max(0.0, v - base) for m, v in g.items()}
    return BillResult(base, outdoor, sum(outdoor.values()), used)


# --- Savings layers ---------------------------------------------------------------------------


def overwatering_gap_gallons(outdoor_gal: float, need_gal: float) -> float:
    """Layer 1: water applied beyond turf need (0 if under-watering)."""
    return max(0.0, outdoor_gal - need_gal)


def rebate_estimate(lawn_sqft: float, rate_per_sqft: float, min_sqft: int = REBATE_MIN_SQFT, max_sqft: float | None = None, max_dollars: float | None = None) -> dict:
    """Layer 2: one-time Utah Water Savers landscape incentive. 'Estimated up to'. Eligibility
    still requires pre-approval and a site visit before any lawn is removed."""
    eligible = lawn_sqft >= min_sqft
    area = min(lawn_sqft, max_sqft) if max_sqft else lawn_sqft
    dollars = area * rate_per_sqft if eligible else 0.0
    if max_dollars is not None:
        dollars = min(dollars, max_dollars)
    return {"eligible": eligible, "eligible_sqft": area if eligible else 0.0, "rate_per_sqft": rate_per_sqft, "estimated_up_to": round(dollars, 2)}


def conversion_savings_gallons(converted_sqft: float, eto_monthly_in: dict[int, float], kc_before: float = TURF_KC, kc_after: float = WATERWISE_KC, months=IRRIGATION_MONTHS) -> float:
    """Layer 3: annual gallons no longer needed after converting lawn to water-wise landscape."""
    eto_season = sum(eto_monthly_in[m] for m in months)
    return depth_to_gallons(eto_season * max(0.0, kc_before - kc_after), converted_sqft)


def gallons_to_acre_feet(gal: float) -> float:
    return gal / GAL_PER_ACRE_FT


# --- Reference ET from gridMET daily rows -----------------------------------------------------


def eto_pm_daily(tmax_c: float, tmin_c: float, rmax_pct: float, rmin_pct: float, srad_wm2: float, lat_deg: float, doy: int, elev_m: float, u2_ms: float = 2.0) -> float:
    """FAO-56 Penman-Monteith daily short-reference ET in mm/day."""
    t = (tmax_c + tmin_c) / 2
    e0 = lambda T: 0.6108 * math.exp(17.27 * T / (T + 237.3))  # noqa: E731
    es = (e0(tmax_c) + e0(tmin_c)) / 2
    ea = (e0(tmin_c) * rmax_pct / 100 + e0(tmax_c) * rmin_pct / 100) / 2
    ea = min(ea, es)
    delta = 4098 * e0(t) / (t + 237.3) ** 2
    p = 101.3 * ((293 - 0.0065 * elev_m) / 293) ** 5.26
    gamma = 0.000665 * p
    rs = srad_wm2 * 0.0864  # MJ m-2 day-1
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi / 365 * doy)
    dec = 0.409 * math.sin(2 * math.pi / 365 * doy - 1.39)
    ws = math.acos(-math.tan(phi) * math.tan(dec))
    ra = 24 * 60 / math.pi * 0.0820 * dr * (ws * math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.sin(ws))
    rso = (0.75 + 2e-5 * elev_m) * ra
    rns = 0.77 * rs
    sigma = 4.903e-9
    rnl = sigma * ((tmax_c + 273.16) ** 4 + (tmin_c + 273.16) ** 4) / 2 * (0.34 - 0.14 * math.sqrt(ea)) * (1.35 * min(rs / rso, 1.0) - 0.35)
    rn = rns - rnl
    num = 0.408 * delta * rn + gamma * 900 / (t + 273) * u2_ms * (es - ea)
    return max(0.0, num / (delta + gamma * (1 + 0.34 * u2_ms)))


def eto_hargreaves_daily(tmax_c: float, tmin_c: float, lat_deg: float, doy: int) -> float:
    """Hargreaves-Samani (1985) ET0 mm/day; temperature-only cross-check."""
    t = (tmax_c + tmin_c) / 2
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi / 365 * doy)
    dec = 0.409 * math.sin(2 * math.pi / 365 * doy - 1.39)
    ws = math.acos(-math.tan(phi) * math.tan(dec))
    ra = 24 * 60 / math.pi * 0.0820 * dr * (ws * math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.sin(ws))
    return max(0.0, 0.0023 * (t + 17.8) * math.sqrt(max(tmax_c - tmin_c, 0)) * ra * 0.408)


def monthly_eto_from_gridmet(df, lat_deg: float, elev_m: float, u2_ms: float = 2.0) -> dict:
    """df: gridMET daily rows (date, tmmx, tmmn [K], rmax, rmin [%], srad [W/m2], pr [mm]).
    Returns {"eto_in": {month: inches}, "eto_hargreaves_in": {...}, "precip_in": {...}, "years": [...]}
    averaged across the years present."""
    import pandas as pd

    d = df.copy()
    d["date"] = pd.to_datetime(d["date"])
    d["doy"] = d["date"].dt.dayofyear
    d["eto_mm"] = [eto_pm_daily(r.tmmx - 273.15, r.tmmn - 273.15, r.rmax, r.rmin, r.srad, lat_deg, int(r.doy), elev_m, u2_ms) for r in d.itertuples()]
    d["hg_mm"] = [eto_hargreaves_daily(r.tmmx - 273.15, r.tmmn - 273.15, lat_deg, int(r.doy)) for r in d.itertuples()]
    d["year"], d["month"] = d["date"].dt.year, d["date"].dt.month
    per_ym = d.groupby(["year", "month"])[["eto_mm", "hg_mm", "pr"]].sum()
    per_m = per_ym.groupby("month").mean() / 25.4
    return {
        "eto_in": {int(m): round(float(v), 2) for m, v in per_m["eto_mm"].items()},
        "eto_hargreaves_in": {int(m): round(float(v), 2) for m, v in per_m["hg_mm"].items()},
        "precip_in": {int(m): round(float(v), 2) for m, v in per_m["pr"].items()},
        "years": sorted(int(y) for y in d["year"].unique()),
        "u2_ms_assumed": u2_ms,
    }
