"""Build a monthly ETo table for a point from gridMET (Climatology Lab, CC0) via the
Fused H3 mirror on Source Cooperative. Writes pipeline/data/eto_<name>.json."""
from __future__ import annotations

import argparse
import json
import os

import h3
import pandas as pd
import pyarrow.fs as pafs
import pyarrow.parquet as pq

from .water import monthly_eto_from_gridmet

BUCKET = "us-west-2.opendata.source.coop/fused/gridmet-hex/gridmet_daily"


def fetch(lat, lon, years):
    c7 = h3.latlng_to_cell(lat, lon, 7)
    c1 = h3.cell_to_parent(c7, 1)
    fs = pafs.S3FileSystem(anonymous=True, region="us-west-2")
    frames = []
    for y in years:
        for m in range(1, 13):
            tbl = pq.read_table(f"{BUCKET}/month={y}-{m:02d}/{c1}.parquet", filesystem=fs, filters=[("hex", "==", h3.str_to_int(c7))])
            frames.append(tbl.to_pandas())
    return pd.concat(frames), c7


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--elev-m", type=float, required=True)
    ap.add_argument("--years", default="2023,2024,2025")
    ap.add_argument("--u2", type=float, default=2.0, help="2 m wind speed assumption (gridMET wind not in the H3 mirror)")
    ap.add_argument("--name", required=True)
    a = ap.parse_args()
    years = [int(y) for y in a.years.split(",")]
    df, cell = fetch(a.lat, a.lon, years)
    res = monthly_eto_from_gridmet(df, a.lat, a.elev_m, a.u2)
    res.update({"lat": a.lat, "lon": a.lon, "elev_m": a.elev_m, "h3_r7": cell, "source": "gridMET daily (Abatzoglou 2013) via source.coop fused/gridmet-hex; ETo = FAO-56 Penman-Monteith, short reference", "annual_eto_in": round(sum(res["eto_in"].values()), 1)})
    out = os.path.join(os.path.dirname(__file__), "data", f"eto_{a.name}.json")
    with open(out, "w") as f:
        json.dump(res, f, indent=2)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
