"""Parcel loading.

Sources:
  * "sandy"  - Sandy City (Salt Lake County Recorder) parcels with LIR attributes,
               mirrored on Source Cooperative (public S3). Covers Sandy/Draper/
               Midvale/Cottonwood Heights area, July 2022 fabric.
  * path     - any local file geopandas can read (UGRC Salt Lake County Parcels
               LIR GeoPackage/Shapefile/GeoParquet, or Philadelphia DOR parcels
               for code-path testing). Columns are normalised below.
"""
from __future__ import annotations

import os
import urllib.request

import geopandas as gpd
import pandas as pd

from .common import SQFT_PER_SQM, bbox_key, raw_path

# UGRC SGID feature services (ArcGIS Online). LIR = tax-roll attributes joined.
UGRC_SLCO_LIR_LAYER = (
    "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/"
    "Utah_Salt_Lake_County_Parcels_LIR/FeatureServer/0"
)

SANDY_PARCELS_URL = (
    "https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/"
    "portolan-mirrors/sandy-utah-catalog/property-and-land-use/parcels/parcels.parquet"
)

# Normalised schema: parcel_id, address, prop_type, is_residential, parcel_sqft,
# year_built, bldg_sqft, geometry
COLUMN_MAPS = {
    # Sandy / SLCo recorder
    "sandy": {
        "parcel_id": "parcel_id",
        "address": "prop_location",
        "prop_type": "Property_Type_Desc",
        "prop_type_simple": "Property_Type_Simple_Desc",
        "year_built": "year_built",
        "bldg_sqft": "total_sq_ft",
    },
    # UGRC LIR (Salt Lake County Parcels LIR)
    "ugrc_lir": {
        "parcel_id": "PARCEL_ID",
        "address": "PARCEL_ADD",
        "prop_type": "PROP_CLASS",
        "prop_type_simple": "PROP_CLASS",
        "year_built": "BUILT_YR",
        "bldg_sqft": "BLDG_SQFT",
    },
    # Philadelphia DOR parcels (code-path test only)
    "phl_dor": {
        "parcel_id": "objectid",
        "address": "addr_std",
        "prop_type": "status",
        "prop_type_simple": "status",
        "year_built": None,
        "bldg_sqft": None,
    },
}

RESIDENTIAL_TOKENS = ("resid", "sngl fam", "single", "duplex", "condo", "townhouse", "mobile home")


def _detect_schema(df: pd.DataFrame) -> str:
    cols = set(df.columns)
    if "prop_location" in cols and "parcel_id" in cols:
        return "sandy"
    if "PARCEL_ID" in cols:
        return "ugrc_lir"
    if "objectid" in cols and "addr_std" in cols:
        return "phl_dor"
    raise ValueError(f"Unrecognised parcel schema: {sorted(cols)[:20]}")


def _download(url: str, dest: str) -> str:
    if not os.path.exists(dest):
        urllib.request.urlretrieve(url, dest)
    return dest


def _fetch_ugrc(layer_url: str, bbox_wgs84, cache: str) -> gpd.GeoDataFrame:
    """Page through an ArcGIS FeatureServer layer query for a bbox and cache as GeoParquet."""
    import json
    import urllib.parse

    if os.path.exists(cache):
        return gpd.read_parquet(cache)
    xmin, ymin, xmax, ymax = bbox_wgs84
    feats, offset = [], 0
    while True:
        q = {
            "where": "1=1",
            "geometry": f"{xmin},{ymin},{xmax},{ymax}",
            "geometryType": "esriGeometryEnvelope",
            "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "outSR": 4326,
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": 1000,
        }
        with urllib.request.urlopen(f"{layer_url}/query?{urllib.parse.urlencode(q)}", timeout=120) as r:
            fc = json.load(r)
        feats += fc.get("features", [])
        if not fc.get("properties", {}).get("exceededTransferLimit") and len(fc.get("features", [])) < 1000:
            break
        offset += 1000
    g = gpd.GeoDataFrame.from_features(feats, crs=4326)
    g.to_parquet(cache)
    return g


def load_parcels(source: str, bbox_wgs84, area_crs: str, residential_only: bool = True) -> gpd.GeoDataFrame:
    """Return parcels intersecting bbox (xmin, ymin, xmax, ymax in lon/lat), in area_crs.

    source: "sandy", "ugrc" (Salt Lake County Parcels LIR feature service), or a file path."""
    if source == "sandy":
        path = _download(SANDY_PARCELS_URL, raw_path("sandy_parcels.parquet"))
    elif source == "ugrc":
        path = None
    else:
        path = source
    if path is None:
        g = _fetch_ugrc(UGRC_SLCO_LIR_LAYER, bbox_wgs84, raw_path(f"ugrc_slco_lir_{bbox_key(bbox_wgs84)}.parquet"))
    else:
        g = gpd.read_parquet(path) if path.endswith(".parquet") else gpd.read_file(path)
    if g.crs is None:
        g = g.set_crs(4326)  # Philadelphia DOR mirror ships lon/lat without CRS metadata
    schema = _detect_schema(g)
    m = COLUMN_MAPS[schema]

    xmin, ymin, xmax, ymax = bbox_wgs84
    g = g.to_crs(4326).cx[xmin:xmax, ymin:ymax].copy()
    g = g.to_crs(area_crs)
    g = g[g.geometry.notna() & ~g.geometry.is_empty]

    out = gpd.GeoDataFrame(
        {
            "parcel_id": g[m["parcel_id"]].astype(str).values,
            "address": g[m["address"]].fillna("").astype(str).str.strip().values if m["address"] else "",
            "prop_type": g[m["prop_type"]].fillna("").astype(str).values if m["prop_type"] else "",
            "prop_type_simple": g[m["prop_type_simple"]].fillna("").astype(str).values if m["prop_type_simple"] else "",
            "year_built": pd.to_numeric(g[m["year_built"]], errors="coerce").values if m["year_built"] else None,
            "bldg_sqft_taxroll": pd.to_numeric(g[m["bldg_sqft"]], errors="coerce").values if m["bldg_sqft"] else None,
        },
        geometry=g.geometry.values,
        crs=area_crs,
    )
    out["parcel_sqft"] = out.geometry.area * SQFT_PER_SQM
    out["parcel_acres"] = out["parcel_sqft"] / 43560.0
    pts = out["prop_type_simple"].fillna("").astype(str).str.lower()
    out["is_residential"] = pts.apply(lambda s: any(t in s for t in RESIDENTIAL_TOKENS))
    if schema == "phl_dor":
        out["is_residential"] = True  # DOR layer has no use code; treat all as candidates
    if residential_only:
        out = out[out["is_residential"]]
    # Drop slivers and giant parcels (parks, churches); residential lots in SLCo are ~0.1-1 acre.
    out = out[(out["parcel_sqft"] > 800) & (out["parcel_acres"] < 3)]
    out = out.drop_duplicates(subset="parcel_id").reset_index(drop=True)
    out.attrs["schema"] = schema
    return out
