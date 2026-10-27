from pipeline import savings, water as w


def test_card_without_bill_has_no_layer1():
    eto = savings.load_eto()
    c = savings.savings_card(3000, eto)
    assert c["layer1_overwatering"] is None
    assert c["layer2_rebate"]["estimated_up_to"] == 4500
    assert c["turf_need_gal_per_year"] > 0
    assert 0 < c["layer3_conversion_gal_per_year"] < c["turf_need_gal_per_year"]


def test_card_with_bill_detects_overwatering():
    eto = savings.load_eto()
    bill = {m: 6 for m in range(1, 13)}
    bill.update({6: 40, 7: 50, 8: 45})  # CCF: huge summer spike for a 1,500 sq ft lawn
    c = savings.savings_card(1500, eto, bill, "ccf")
    assert c["layer1_overwatering"]["overwatering_gal_per_year"] > 0
    assert c["layer1_overwatering"]["indoor_baseline_gal_per_month"] == round(6 * w.GAL_PER_CCF)


def test_neighborhood_totals_in_acre_feet():
    eto = savings.load_eto()
    t = savings.neighborhood_totals([3000] * 100, eto)
    assert t["lawn_acres"] == 6.9
    assert t["turf_need_acre_ft_per_year"] > 0
