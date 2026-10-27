import math

import pytest

from pipeline import water as w


def test_depth_to_gallons_one_inch_on_1000_sqft():
    # 1 inch over 1,000 sq ft = 83.3 ft³ = 623 gal (standard irrigation rule of thumb)
    assert w.depth_to_gallons(1.0, 1000) == pytest.approx(623.4, abs=0.5)


def test_unit_conversions():
    assert w.to_gallons(1, "ccf") == pytest.approx(748.05, abs=0.01)
    assert w.to_gallons(2, "kgal") == 2000
    assert w.to_gallons(1, "acre-ft") == pytest.approx(325851)
    with pytest.raises(ValueError):
        w.to_gallons(1, "litres")


def test_turf_need_uses_kc_and_rain():
    assert w.turf_need_in(8.0, kc=0.8) == pytest.approx(6.4)
    assert w.turf_need_in(8.0, kc=0.8, effective_precip_in=1.0) == pytest.approx(5.4)
    assert w.turf_need_in(0.5, kc=0.8, effective_precip_in=1.0) == 0.0


def test_turf_need_gallons_efficiency():
    base = w.turf_need_gallons(1000, 8.0)
    assert w.turf_need_gallons(1000, 8.0, efficiency=0.75) == pytest.approx(base / 0.75)
    with pytest.raises(ValueError):
        w.turf_need_gallons(1000, 8.0, efficiency=0)


def test_annual_need_only_irrigation_months():
    eto = {m: 5.0 for m in range(1, 13)}
    need = w.annual_turf_need_gallons(1000, eto)
    assert set(need) == set(w.IRRIGATION_MONTHS)
    assert sum(need.values()) == pytest.approx(len(w.IRRIGATION_MONTHS) * w.depth_to_gallons(4.0, 1000))


def test_outdoor_from_bill_winter_baseline():
    use = {12: 5, 1: 5, 2: 5, 6: 20, 7: 30, 8: 25}  # kgal
    r = w.outdoor_use_from_bill(use, unit="kgal")
    assert r.indoor_baseline_gal == 5000
    assert r.outdoor_gal_by_month[7] == 25000
    assert r.outdoor_gal_by_month[1] == 0
    assert r.total_outdoor_gal == 60000
    assert r.baseline_months == (12, 1, 2)


def test_outdoor_from_bill_without_winter_uses_min_month():
    r = w.outdoor_use_from_bill({6: 20, 7: 30, 8: 25}, unit="kgal")
    assert r.indoor_baseline_gal == 20000
    assert r.total_outdoor_gal == 15000


def test_overwatering_gap_floor():
    assert w.overwatering_gap_gallons(60000, 40000) == 20000
    assert w.overwatering_gap_gallons(30000, 40000) == 0


def test_rebate_rules():
    assert w.rebate_estimate(150, 1.5)["eligible"] is False
    r = w.rebate_estimate(2000, 1.5)
    assert r["estimated_up_to"] == 3000
    assert w.rebate_estimate(5000, 2.0, max_sqft=3000)["estimated_up_to"] == 6000
    assert w.rebate_estimate(5000, 2.0, max_dollars=2500)["estimated_up_to"] == 2500


def test_conversion_savings():
    eto = {m: 1.0 for m in range(1, 13)}
    # 7 irrigation months × 1 in × (0.8-0.3) = 3.5 in over 1,000 sq ft
    assert w.conversion_savings_gallons(1000, eto) == pytest.approx(w.depth_to_gallons(3.5, 1000))


def test_pm_eto_matches_fao56_example_20():
    # FAO-56 Example 20 (Bangkok, 6 Apr, 2 m): ET0 = 5.7 mm/day given Tmax 34.8, Tmin 25.6,
    # RHmax 100? Example uses ea from RH... use published daily example 18 instead (Brussels,
    # 6 Jul): Tmax 21.5, Tmin 12.3, RHmax 84, RHmin 63, Rs 22.07 MJ, u2 2.78 m/s, 50 m N, 100 m: 3.9 mm
    rs_wm2 = 22.07 / 0.0864
    eto = w.eto_pm_daily(21.5, 12.3, 84, 63, rs_wm2, 50.8, 187, 100, u2_ms=2.78)
    assert eto == pytest.approx(3.9, abs=0.15)


def test_hargreaves_summer_slc_is_plausible():
    # Hot clear July day in SLC: ~7-9 mm/day
    v = w.eto_hargreaves_daily(36, 20, 40.6, 200)
    assert 6 < v < 10
