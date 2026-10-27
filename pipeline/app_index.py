"""Write <data_dir>/index.json for the app: which datasets are built (with headline totals)
and a compact address index so one search box covers every neighborhood.

  python -m pipeline.app_index app/static/data
"""
from __future__ import annotations

import json
import os
import sys


def build(data_dir: str) -> dict:
    datasets, addresses = [], []
    for ds in sorted(os.listdir(data_dir)):
        p = os.path.join(data_dir, ds, "parcels.json")
        if not os.path.exists(p):
            continue
        with open(p) as f:
            d = json.load(f)
        parcels = d["parcels"]
        datasets.append({
            "id": ds,
            "imagery": d["imagery"],
            "parcels": len(parcels),
            "lawn_sqft": round(sum(x["lawn_sqft"] for x in parcels)),
        })
        for x in parcels:
            if x.get("address"):
                # [address, dataset, parcel_id, lawn_sqft]
                addresses.append([x["address"], ds, x["parcel_id"], round(x["lawn_sqft"])])
    out = {"datasets": datasets, "addresses": addresses}
    with open(os.path.join(data_dir, "index.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    return out


if __name__ == "__main__":
    o = build(sys.argv[1] if len(sys.argv) > 1 else "app/static/data")
    print(f"index.json: {len(o['datasets'])} datasets, {len(o['addresses'])} addresses")
