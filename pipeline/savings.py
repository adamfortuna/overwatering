"""Savings card: the three layers for one parcel. Gallons first, dollars second."""
from __future__ import annotations

import json
import os

from . import water as w

DEFAULT_ETO = os.path.join(os.path.dirname(__file__), "data", "eto_sandy_ut.json")


def load_eto(path: str = DEFAULT_ETO) -> dict:
    with open(path) as f:
        d = json.load(f)
    d["eto_in"] = {int(k): v for k, v in d["eto_in"].items()}
    d["precip_in"] = {int(k): v for k, v in d["precip_in"].items()}
    return d


def savings_card(lawn_sqft: float, eto: dict, monthly_bill_use: dict | None = None, bill_unit: str = "gal", rebate_rate_per_sqft: float = 1.5, price_per_kgal: float | None = None, kc: float = w.TURF_KC) -> dict:
    """lawn_sqft: detected lawn. eto: load_eto() dict. monthly_bill_use: {month: usage} or None.
    price_per_kgal: optional marginal water price to translate gallons to dollars."""
    need_by_month = w.annual_turf_need_gallons(lawn_sqft, eto["eto_in"], eto["precip_in"], kc=kc)
    need = sum(need_by_month.values())
    card = {
        "lawn_sqft": round(lawn_sqft),
        "turf_need_gal_per_year": round(need),
        "turf_need_in_per_season": round(sum(w.turf_need_in(eto["eto_in"][m], kc, eto["precip_in"].get(m, 0) * 0.5) for m in w.IRRIGATION_MONTHS), 1),
        "layer1_overwatering": None,
        "layer2_rebate": w.rebate_estimate(lawn_sqft, rebate_rate_per_sqft),
        "layer3_conversion_gal_per_year": round(w.conversion_savings_gallons(lawn_sqft, eto["eto_in"], kc_before=kc)),
        "calibrated_with_bill": monthly_bill_use is not None,
    }
    if monthly_bill_use:
        bill = w.outdoor_use_from_bill(monthly_bill_use, bill_unit)
        gap = w.overwatering_gap_gallons(bill.total_outdoor_gal, need)
        card["layer1_overwatering"] = {
            "indoor_baseline_gal_per_month": round(bill.indoor_baseline_gal),
            "outdoor_gal_per_year": round(bill.total_outdoor_gal),
            "overwatering_gal_per_year": round(gap),
            "overwatering_pct_of_need": round(gap / need * 100) if need else None,
            "applied_inches_per_season": round(bill.total_outdoor_gal / w.GAL_PER_CUFT * 12 / lawn_sqft, 1) if lawn_sqft else None,
        }
    if price_per_kgal is not None:
        for key in ("layer3_conversion_gal_per_year",):
            card[key.replace("_gal_per_year", "_dollars_per_year")] = round(card[key] / 1000 * price_per_kgal)
        if card["layer1_overwatering"]:
            card["layer1_overwatering"]["dollars_per_year"] = round(card["layer1_overwatering"]["overwatering_gal_per_year"] / 1000 * price_per_kgal)
    return card


def neighborhood_totals(lawn_sqft_list, eto: dict, kc: float = w.TURF_KC, overwater_in: float = 0.75) -> dict:
    """District framing. overwater_in: Utah DWR estimates Utahns overwater 0.5-1 ft per year;
    0.75 ft (9 in) midpoint used as the default assumption when no bills are available."""
    total = float(sum(lawn_sqft_list))
    need = sum(sum(w.annual_turf_need_gallons(a, eto["eto_in"], eto["precip_in"], kc=kc).values()) for a in lawn_sqft_list)
    over = w.depth_to_gallons(overwater_in * 12, total)
    conv = w.conversion_savings_gallons(total, eto["eto_in"], kc_before=kc)
    return {
        "parcels": len(lawn_sqft_list),
        "lawn_acres": round(total / 43560, 1),
        "turf_need_acre_ft_per_year": round(w.gallons_to_acre_feet(need), 1),
        "overwatering_acre_ft_per_year_assumed": round(w.gallons_to_acre_feet(over), 1),
        "conversion_acre_ft_per_year_if_all_converted": round(w.gallons_to_acre_feet(conv), 1),
        "assumptions": {"kc": kc, "overwater_ft_per_year": overwater_in},
    }


if __name__ == "__main__":
    import sys

    import pandas as pd

    eto = load_eto()
    lawn = float(sys.argv[1]) if len(sys.argv) > 1 else 3361
    # Example SLC-style bill in CCF: winter ~6, summer peaking ~30
    bill = {1: 6, 2: 6, 3: 7, 4: 10, 5: 18, 6: 26, 7: 32, 8: 30, 9: 22, 10: 12, 11: 7, 12: 6}
    print(json.dumps(savings_card(lawn, eto, bill, "ccf", rebate_rate_per_sqft=1.5, price_per_kgal=2.5), indent=2))
    if len(sys.argv) > 2:
        df = pd.read_csv(sys.argv[2])
        print(json.dumps(neighborhood_totals(df.lawn_sqft.tolist(), eto), indent=2))
