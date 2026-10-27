"""Export what the web app needs: editable regions, imagery crops, parcel list.

Layout (out_dir/app/):
  parcels.json            list of parcel records (results.csv rows + bounds + centroid)
  regions/<parcel_id>.geojson   one polygon per contiguous class region inside the parcel,
                                properties: cls (lawn|canopy|building|other), sqft
  crops/<parcel_id>.png   untinted RGB crop with margin; corners in parcels.json ("crop_corners")
  neighborhood.png + neighborhood.json   whole-AOI RGB and its corner coordinates
  parcels.geojson         parcel outlines with lawn_frac etc. for the district view
"""
from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image
from pyproj import Transformer
from rasterio import features
from rasterio.transform import rowcol, xy
from shapely.geometry import mapping, shape
from shapely.ops import transform as shp_transform

from .common import SQFT_PER_SQM, Imagery

CLASS_NAMES = {0: "other", 1: "lawn", 2: "canopy", 3: "building"}


def class_raster(masks) -> np.ndarray:
    cls = np.zeros(masks["lawn"].shape, dtype="uint8")
    cls[masks["lawn"]] = 1
    cls[masks["tree"]] = 2
    cls[masks["building"]] = 3
    return cls


def _corners_wgs84(img: Imagery, r0, r1, c0, c1):
    """MapLibre image-source corners: [top-left, top-right, bottom-right, bottom-left] lon/lat."""
    to_wgs = Transformer.from_crs(img.crs, "EPSG:4326", always_xy=True)
    pts = [(r0, c0), (r0, c1), (r1, c1), (r1, c0)]
    out = []
    for r, c in pts:
        x, y = xy(img.transform, r, c, offset="ul")
        lon, lat = to_wgs.transform(x, y)
        out.append([round(lon, 7), round(lat, 7)])
    return out


def export(img: Imagery, rgb: np.ndarray, masks: dict, parcels, df, out_dir: str, area_crs: str, margin_m: float = 6.0, max_parcels: int | None = None):
    app = os.path.join(out_dir, "app")
    for d in ("regions", "crops"):
        os.makedirs(os.path.join(app, d), exist_ok=True)
    cls = class_raster(masks)
    labels = masks["labels"]
    p_img = parcels.to_crs(img.crs)
    to_wgs = Transformer.from_crs(img.crs, "EPSG:4326", always_xy=True).transform
    to_area = Transformer.from_crs(img.crs, area_crs, always_xy=True).transform
    simplify_tol = abs(img.transform.a) * 0.6
    px_m = img.gsd_m
    records = []
    for i, row in df.iterrows():
        if max_parcels and i >= max_parcels:
            break
        geom = p_img.geometry.iloc[i]
        minx, miny, maxx, maxy = geom.bounds
        m = margin_m / px_m * abs(img.transform.a)
        r0, c0 = rowcol(img.transform, minx - m, maxy + m)
        r1, c1 = rowcol(img.transform, maxx + m, miny - m)
        r0, c0 = max(0, r0), max(0, c0)
        r1, c1 = min(img.height, r1 + 1), min(img.width, c1 + 1)
        if r1 - r0 < 2 or c1 - c0 < 2:
            continue
        pid = str(row.parcel_id)
        # crop
        Image.fromarray(rgb[r0:r1, c0:c1]).save(os.path.join(app, "crops", f"{pid}.png"), optimize=True)
        # regions
        sub_cls = cls[r0:r1, c0:c1]
        sub_mask = labels[r0:r1, c0:c1] == (i + 1)
        sub_tr = img.transform * img.transform.translation(c0, r0)
        feats = []
        for geomjson, val in features.shapes(sub_cls, mask=sub_mask, transform=sub_tr, connectivity=4):
            g = shape(geomjson)
            area_sqft = shp_transform(to_area, g).area * SQFT_PER_SQM
            if area_sqft < 10:
                continue
            g = g.simplify(simplify_tol, preserve_topology=True)
            if g.is_empty:
                continue
            feats.append({"type": "Feature", "properties": {"cls": CLASS_NAMES[int(val)], "sqft": round(area_sqft)}, "geometry": mapping(shp_transform(to_wgs, g))})
        with open(os.path.join(app, "regions", f"{pid}.geojson"), "w") as f:
            json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
        gw = shp_transform(to_wgs, geom)
        rec = {k: (None if (isinstance(v, float) and np.isnan(v)) else (v.item() if hasattr(v, "item") else v)) for k, v in row.items()}
        rec.update({"parcel_id": pid, "crop_corners": _corners_wgs84(img, r0, r1, c0, c1), "bounds": [round(b, 7) for b in gw.bounds], "centroid": [round(gw.centroid.x, 7), round(gw.centroid.y, 7)], "n_regions": len(feats)})
        records.append(rec)
    with open(os.path.join(app, "parcels.json"), "w") as f:
        json.dump({"imagery": {"source": img.source, "date": img.capture_date, "gsd_m": round(img.gsd_m, 2)}, "parcels": records}, f, separators=(",", ":"), default=str)
    # district view
    feats = []
    for i, row in df.iterrows():
        gw = shp_transform(to_wgs, p_img.geometry.iloc[i]).simplify(2e-6)
        feats.append({"type": "Feature", "properties": {"parcel_id": str(row.parcel_id), "lawn_frac": round(float(row.lawn_frac), 3), "lawn_sqft": float(row.lawn_sqft), "confidence": row.confidence}, "geometry": mapping(gw)})
    with open(os.path.join(app, "parcels.geojson"), "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    im = Image.fromarray(rgb)
    if max(im.size) > 2048:
        s = 2048 / max(im.size)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
    im.save(os.path.join(app, "neighborhood.png"), optimize=True)
    with open(os.path.join(app, "neighborhood.json"), "w") as f:
        json.dump({"corners": _corners_wgs84(img, 0, img.height, 0, img.width), "imagery": {"source": img.source, "date": img.capture_date, "gsd_m": round(img.gsd_m, 2)}}, f)
    return app
