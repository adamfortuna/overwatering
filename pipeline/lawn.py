"""NDVI lawn classification and per-parcel accounting."""
from __future__ import annotations

import numpy as np
import pandas as pd
from rasterio import features

from .common import Imagery

CANOPY_MIN_M = 2.5  # pixels with canopy height >= this are trees, not turf


def rasterize_mask(geoms, img: Imagery, buffer_m: float = 0.0) -> np.ndarray:
    if len(geoms) == 0:
        return np.zeros((img.height, img.width), dtype=bool)
    if buffer_m:
        geoms = geoms.buffer(buffer_m)
    return features.rasterize(
        ((g, 1) for g in geoms if not g.is_empty),
        out_shape=(img.height, img.width),
        transform=img.transform,
        fill=0,
        dtype="uint8",
        all_touched=False,
    ).astype(bool)


def label_parcels(parcels_img_crs, img: Imagery) -> np.ndarray:
    """int32 raster: 0 = none, i+1 = parcel i."""
    shapes = ((geom, i + 1) for i, geom in enumerate(parcels_img_crs.geometry) if not geom.is_empty)
    return features.rasterize(shapes, out_shape=(img.height, img.width), transform=img.transform, fill=0, dtype="int32")


def classify(img: Imagery, parcels, buildings, chm: np.ndarray | None, ndvi_thr: float = 0.30, building_buffer_m: float = 0.5):
    """Return (per-parcel DataFrame, masks dict). parcels/buildings are GeoDataFrames in an
    equal-area CRS; parcel_sqft is taken from them, fractions from pixels."""
    ndvi = img.ndvi()
    p_img = parcels.to_crs(img.crs)
    b_img = buildings.to_crs(img.crs)
    bmask = rasterize_mask(b_img.geometry, img, buffer_m=building_buffer_m)
    tree = (chm >= CANOPY_MIN_M) if chm is not None else np.zeros_like(bmask)
    nodata = (img.data[:3].max(axis=0) == 0)
    green = (ndvi > ndvi_thr) & ~nodata
    lawn = green & ~bmask & ~tree
    ambiguous = (np.abs(ndvi - ndvi_thr) < 0.05) & ~bmask & ~tree & ~nodata
    lawn_lo = (ndvi > ndvi_thr + 0.05) & ~bmask & ~tree
    lawn_hi = (ndvi > ndvi_thr - 0.05) & ~bmask & ~tree

    labels = label_parcels(p_img, img)
    n = len(parcels) + 1
    cnt = lambda m: np.bincount(labels[m], minlength=n)[1:]  # noqa: E731
    total = np.bincount(labels.ravel(), minlength=n)[1:]
    # Parcel pixels touching the image edge -> partially outside the AOI
    edge = np.zeros_like(bmask)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True

    sum_ndvi = np.bincount(labels[~bmask], weights=ndvi[~bmask], minlength=n)[1:]
    nb = cnt(~bmask)
    df = pd.DataFrame(
        {
            "parcel_id": parcels["parcel_id"].values,
            "address": parcels["address"].values,
            "prop_type": parcels["prop_type"].values,
            "parcel_sqft": parcels["parcel_sqft"].round(0).values,
            "pixels": total,
            "lawn_frac": np.divide(cnt(lawn), total, out=np.zeros(len(total)), where=total > 0),
            "green_frac": np.divide(cnt(green & ~bmask), total, out=np.zeros(len(total)), where=total > 0),
            "canopy_frac": np.divide(cnt(tree & ~bmask), total, out=np.zeros(len(total)), where=total > 0),
            "building_frac": np.divide(cnt(bmask), total, out=np.zeros(len(total)), where=total > 0),
            "lawn_lo_frac": np.divide(cnt(lawn_lo), total, out=np.zeros(len(total)), where=total > 0),
            "lawn_hi_frac": np.divide(cnt(lawn_hi), total, out=np.zeros(len(total)), where=total > 0),
            "ambiguous_frac": np.divide(cnt(ambiguous), total, out=np.zeros(len(total)), where=total > 0),
            "mean_ndvi_nonbldg": np.divide(sum_ndvi, nb, out=np.zeros(len(total)), where=nb > 0),
            "edge_clipped": cnt(edge) > 0,
            "nodata_frac": np.divide(cnt(nodata), total, out=np.zeros(len(total)), where=total > 0),
        }
    )
    for c in ("lawn", "green", "canopy", "building", "lawn_lo", "lawn_hi"):
        df[f"{c}_sqft"] = (df[f"{c}_frac"] * df["parcel_sqft"]).round(0)
    df["hardscape_other_sqft"] = (df["parcel_sqft"] - df["lawn_sqft"] - df["canopy_sqft"] - df["building_sqft"]).clip(lower=0).round(0)

    def conf(r):
        if r.pixels < 30 or r.nodata_frac > 0.2 or r.edge_clipped:
            return "low"
        if r.ambiguous_frac < 0.08 and r.pixels >= 200:
            return "high"
        if r.ambiguous_frac < 0.20:
            return "medium"
        return "low"

    df["confidence"] = df.apply(conf, axis=1)
    df["ndvi_threshold"] = ndvi_thr
    df["imagery_source"] = img.source
    df["imagery_date"] = img.capture_date
    df["gsd_m"] = round(img.gsd_m, 2)
    masks = {"ndvi": ndvi, "lawn": lawn, "green": green, "tree": tree, "building": bmask, "labels": labels, "nodata": nodata}
    return df, masks
