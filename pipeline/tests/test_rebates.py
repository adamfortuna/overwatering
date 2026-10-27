from pipeline import rebates


def test_city_resolution_and_fallback():
    t = rebates.load_table()
    assert rebates.resolve_provider("Sandy", t)["id"] == "cuwcd"
    assert rebates.resolve_provider("salt lake city", t)["id"] == "cuwcd"
    assert rebates.resolve_provider("Draper", t)["id"] == "jvwcd"
    assert rebates.resolve_provider("Provo", t)["id"] == "cuwcd_rural"
    assert rebates.resolve_provider("Nowhere", t)["id"] == "state"


def test_estimate_ranges_and_minimum():
    e = rebates.estimate(3361, "Sandy")
    assert e["eligible"] and e["estimated_up_to"] == 3361 * 3.0
    assert e["estimated_range"][0] <= e["estimated_up_to"]
    assert rebates.estimate(150, "Sandy")["eligible"] is False
    assert "BEFORE" in e["warning"]


def test_per_property_cap():
    assert rebates.estimate(20000, "Salt Lake City")["estimated_up_to"] == 50000
