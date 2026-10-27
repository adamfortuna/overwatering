"""Compare our per-parcel estimates with the Utah Division of Water Resources' Greenspace model.

Greenspace 2024 (https://dwre-utahdnr.opendata.arcgis.com/pages/greenspace) is published per
NAIP quarter-quad as shapefile polygons of pixels with NDVI >= 0.15 (field `Threshold`), in
UTM 12N, on the public GCS bucket ut-dwre-2024-greenspace (<county-slug>/<tile>_NDVI.zip; tile
index at aa-tile-index/TileIndex_NAIP.zip). It is all vegetation: lawn, trees, shrubs and beds
are not separated. The zips use LZMA compression (Python's zipfile reads them; old unzip can't).

  python -m pipeline.greenspace 84102              # dataset id under app/static/data
"""
from __future__ import annotations

import io
import json
import os
import sys
import urllib.request
import zipfile

import geopandas as gpd
import numpy as np
import pandas as pd

from .common import raw_path

BUCKET = "https://storage.googleapis.com/ut-dwre-2024-greenspace"
SQFT_PER_SQM = 10.7639


def _tile_index() -> gpd.GeoDataFrame:
    d = raw_path("greenspace_tile_index")
    shp = os.path.join(d, "TileIndex_NAIP.shp")
    if not os.path.exists(shp):
        data = urllib.request.urlopen(f"{BUCKET}/aa-tile-index/TileIndex_NAIP.zip", timeout=120).read()
        zipfile.ZipFile(io.BytesIO(data)).extractall(d)
    return gpd.read_file(shp)


def tiles_for(geom_utm, county_slug: str) -> list[str]:
    """Download (once) the Greenspace tiles touching geom_utm; return their shapefile paths."""
    idx = _tile_index()
    out = []
    for name in idx[idx.intersects(geom_utm)].Name:
        d = raw_path(f"greenspace_{county_slug}")
        shp = os.path.join(d, f"{name}_NDVI_2024.shp")
        if not os.path.exists(shp):
            data = urllib.request.urlopen(f"{BUCKET}/{county_slug}/{name}_NDVI.zip", timeout=300).read()
            zipfile.ZipFile(io.BytesIO(data)).extractall(d)
        out.append(shp)
    return out


def compare(dataset: str, county_slug: str = "salt-lake", data_root: str = "app/static/data") -> pd.DataFrame:
    par = gpd.read_file(os.path.join(data_root, dataset, "parcels.geojson")).to_crs(26912)
    with open(os.path.join(data_root, dataset, "parcels.json")) as f:
        rec = pd.DataFrame(json.load(f)["parcels"])[["parcel_id", "address", "parcel_sqft", "lawn_sqft", "canopy_sqft", "green_sqft"]]
    par = par[["parcel_id", "geometry"]].merge(rec, on="parcel_id")
    bounds = tuple(par.total_bounds)
    shps = tiles_for(gpd.GeoSeries([par.union_all().envelope], crs=26912).iloc[0], county_slug)
    gs = gpd.GeoDataFrame(pd.concat([gpd.read_file(s, bbox=bounds) for s in shps]), crs=26912)
    inter = gpd.overlay(par[["parcel_id", "geometry"]], gs[["geometry"]], how="intersection", keep_geom_type=True)
    inter["gs_sqft"] = inter.area * SQFT_PER_SQM
    df = par.drop(columns="geometry").merge(inter.groupby("parcel_id").gs_sqft.sum(), on="parcel_id", how="left").fillna({"gs_sqft": 0})
    df["lawn_plus_canopy"] = df.lawn_sqft + df.canopy_sqft
    return df


def main():
    ds = sys.argv[1] if len(sys.argv) > 1 else "84102"
    df = compare(ds)
    ac = lambda c: df[c].sum() / 43560  # noqa: E731
    print(f"{ds}: {len(df)} parcels")
    print(f"  Greenspace 2024 (all vegetation)  {ac('gs_sqft'):7.1f} ac")
    print(f"  ours: lawn + canopy               {ac('lawn_plus_canopy'):7.1f} ac")
    print(f"  ours: lawn only                   {ac('lawn_sqft'):7.1f} ac")
    for c in ("lawn_sqft", "lawn_plus_canopy", "green_sqft"):
        r = np.corrcoef(df[c], df.gs_sqft)[0, 1]
        ratio = (df.gs_sqft / df[c].replace(0, np.nan)).median()
        print(f"  vs {c:18s} r = {r:.2f}, median Greenspace/{c} = {ratio:.2f}")


if __name__ == "__main__":
    main()
