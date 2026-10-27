"""Build neighborhood AOI polygons for Salt Lake City runs.

Sources:
  * SLC community councils (maps.slc.gov BOUNDARIES/Salt_Lake_City_Community_Councils)
  * UGRC Utah ZIP Code Areas (for zip AOIs)

Each AOI is clipped to the extent of its residential parcels (UGRC SLCo LIR), so Greater
Avenues does not drag in the foothills. Writes pipeline/data/aoi/<id>.geojson.

  python -m pipeline.aoi            # rebuild all AOIs below
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import geopandas as gpd
from shapely.geometry import box, mapping

from .parcels import UGRC_SLCO_LIR_LAYER

COUNCILS = "https://maps.slc.gov/server/rest/services/BOUNDARIES/Salt_Lake_City_Community_Councils/FeatureServer/4"
ZIPS = "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahZipCodeAreas/FeatureServer/0"
OUT = os.path.join(os.path.dirname(__file__), "data", "aoi")

# id -> (kind, value, display name)
AOIS = {
    "84102": ("zip", "84102", "84102 (East Central + Central City)"),
    "central-city": ("council", "Central City", "Central City"),
    "liberty-wells": ("council", "Liberty Wells", "Liberty Wells"),
    "downtown": ("council", "Downtown Community", "Downtown"),
    "avenues": ("council", "Greater Avenues", "The Avenues"),
}


def _geojson(layer: str, where: str, field: str) -> gpd.GeoDataFrame:
    # maps.slc.gov 500s on outFields=* now and then; ask for one field and retry.
    q = urllib.parse.urlencode({"where": where, "outFields": field, "outSR": 4326, "f": "geojson"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{layer}/query?{q}", timeout=120) as r:
                return gpd.GeoDataFrame.from_features(json.load(r)["features"], crs=4326)
        except urllib.error.HTTPError:
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def _residential_extent(geom) -> tuple:
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    s = [p.simplify(0.0002) for p in polys]
    q = {
        "where": "PROP_CLASS='Residential'",
        "geometry": json.dumps({"rings": [list(map(list, p.exterior.coords)) for p in s], "spatialReference": {"wkid": 4326}}),
        "geometryType": "esriGeometryPolygon",
        "inSR": 4326,
        "outSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "returnExtentOnly": "true",
        "f": "json",
    }
    with urllib.request.urlopen(f"{UGRC_SLCO_LIR_LAYER}/query", urllib.parse.urlencode(q).encode(), timeout=120) as r:
        e = json.load(r)["extent"]
    return e["xmin"], e["ymin"], e["xmax"], e["ymax"]


def build(aoi_id: str) -> str:
    kind, value, name = AOIS[aoi_id]
    if kind == "zip":
        g = _geojson(ZIPS, f"ZIP5='{value}'", "ZIP5")
    else:
        g = _geojson(COUNCILS, f"COMCOUNCIL_NAME='{value}'", "COMCOUNCIL_NAME")
    geom = g.geometry.union_all()
    geom = geom.intersection(box(*_residential_extent(geom)).buffer(0.0003))
    geom = geom.simplify(0.00002)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{aoi_id}.geojson")
    with open(path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"id": aoi_id, "name": name, "source": kind, "match": value}, "geometry": mapping(geom)}]}, f)
    return path


def load(path_or_id: str):
    """AOI polygon (WGS84) from a geojson path or an id under pipeline/data/aoi/."""
    path = path_or_id if path_or_id.endswith("json") else os.path.join(OUT, f"{path_or_id}.geojson")
    return gpd.read_file(path).to_crs(4326).geometry.union_all()


if __name__ == "__main__":
    for k in AOIS:
        p = build(k)
        g = gpd.read_file(p).to_crs(26912)
        b = g.total_bounds
        print(f"{k:14s} {g.area.iloc[0] / 1e6:5.2f} km2  bbox {(b[2] - b[0]) / 1000:.1f} x {(b[3] - b[1]) / 1000:.1f} km  -> {p}")
