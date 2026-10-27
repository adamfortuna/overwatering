"""Phase 0 spike runner.

Example (Utah, 2024 NAIP via USDA):
  python -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy --imagery usda --out data/out/sandy

Example (Utah, coarse Sentinel-2 fallback):
  python -m pipeline.run_spike --bbox -111.875 40.565 -111.865 40.573 --parcels sandy --imagery sentinel2 --out data/out/sandy_s2

Example (code-path test on real 4-band NAIP + real parcels, Philadelphia):
  python -m pipeline.run_spike --bbox -75.17 39.95 -75.15 39.97 --parcels dor_parcel.parquet \
      --buildings li_building_footprints.parquet --imagery philly_naip_mosaic.tif --out data/out/philly
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import geopandas as gpd
import numpy as np
import rasterio
from shapely.geometry import box

from . import buildings as bld
from . import export_app
from . import canopy as cnp
from . import imagery as imgmod
from . import lawn, overlay, parcels as pcl
from .common import equal_area_crs_for


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("XMIN", "YMIN", "XMAX", "YMAX"), help="WGS84 lon/lat")
    ap.add_argument("--center", nargs=2, type=float, metavar=("LON", "LAT"))
    ap.add_argument("--radius-m", type=float, default=350)
    ap.add_argument("--aoi", help="AOI polygon: geojson path or an id under pipeline/data/aoi/ (see pipeline.aoi)")
    ap.add_argument("--parcels", default="sandy", help="'sandy', 'ugrc' (SLCo LIR feature service), or path to a parcel file")
    ap.add_argument("--buildings", default="overture", help="'overture' or path to a footprint file")
    ap.add_argument("--imagery", default="usda", help="'usda' (latest NAIP via USDA ImageServer), 'pc' (NAIP via Planetary Computer), 'sentinel2', or path to a 4-band GeoTIFF")
    ap.add_argument("--naip-year", type=int, help="with --imagery pc, use this NAIP year only")
    ap.add_argument("--imagery-date", default="unknown", help="capture date for a local file")
    ap.add_argument("--s2-tile", default="12TVL")
    ap.add_argument("--s2-year", type=int, default=2026)
    ap.add_argument("--ndvi-thr", type=float, default=0.30)
    ap.add_argument("--no-canopy", action="store_true")
    ap.add_argument("--all-parcels", action="store_true", help="keep non-residential parcels")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-overlays", type=int, default=600)
    ap.add_argument("--address", help="address substring to report / validate against")
    ap.add_argument("--truth-sqft", type=float, help="hand-measured lawn sq ft for --address")
    ap.add_argument("--save-rasters", action="store_true")
    a = ap.parse_args(argv)

    aoi_geom = None
    if a.aoi:
        from . import aoi as aoimod

        aoi_geom = aoimod.load(a.aoi)
        bbox = tuple(aoi_geom.bounds)
    elif a.center:
        lon, lat = a.center
        dlat = a.radius_m / 111_320
        dlon = a.radius_m / (111_320 * np.cos(np.radians(lat)))
        bbox = (lon - dlon, lat - dlat, lon + dlon, lat + dlat)
    elif a.bbox:
        bbox = tuple(a.bbox)
    else:
        ap.error("--bbox or --center required")
    area_crs = equal_area_crs_for((bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2)
    os.makedirs(a.out, exist_ok=True)
    t0 = time.time()
    log = lambda *x: print(f"[{time.time()-t0:6.1f}s]", *x, flush=True)  # noqa: E731

    log("parcels:", a.parcels)
    parcels = pcl.load_parcels(a.parcels, bbox, area_crs, residential_only=not a.all_parcels)
    # Keep parcels wholly inside the AOI: a parcel cut by the image edge gets its lawn fraction
    # from a sliver, which is then scaled to the full parcel area and inflates totals.
    aoi = gpd.GeoSeries([box(*bbox)], crs=4326).to_crs(area_crs).iloc[0].buffer(-1.0)
    n_all = len(parcels)
    keep = parcels.within(aoi)
    if aoi_geom is not None:
        # Polygon AOI: a parcel belongs to the neighborhood if its interior point is inside.
        poly = gpd.GeoSeries([aoi_geom], crs=4326).to_crs(area_crs).iloc[0]
        keep &= parcels.representative_point().within(poly)
    parcels = parcels[keep].reset_index(drop=True)
    log(f"  {len(parcels)} parcels inside AOI ({n_all - len(parcels)} outside or on the edge dropped) (schema={parcels.attrs.get('schema')}), area CRS {area_crs}")
    if len(parcels) == 0:
        sys.exit("No parcels in bbox")

    log("buildings:", a.buildings)
    buildings = bld.load_buildings(bbox, area_crs, None if a.buildings == "overture" else a.buildings)
    log(f"  {len(buildings)} footprints")

    log("imagery:", a.imagery)
    img = imgmod.get_imagery(a.imagery, bbox, capture_date=a.imagery_date, tile=a.s2_tile, year=a.s2_year,
                              years=(a.naip_year,) if a.naip_year else None)
    log(f"  {img.source} {img.capture_date} {img.width}x{img.height} px @ {img.gsd_m:.2f} m, CRS {img.crs}", img.extra)

    chm = None
    if not a.no_canopy:
        log("canopy height model (Meta CHM v2)")
        chm = cnp.canopy_height_on_grid(img)
        log(f"  canopy >= {lawn.CANOPY_MIN_M} m on {float((chm >= lawn.CANOPY_MIN_M).mean()):.1%} of pixels")

    log("classify")
    df, masks = lawn.classify(img, parcels, buildings, chm, ndvi_thr=a.ndvi_thr)
    df.to_csv(os.path.join(a.out, "results.csv"), index=False)
    p_img = parcels.to_crs(img.crs)

    log("overlays")
    rgb = overlay.rgb8(img)
    overlay.neighborhood_overlay(img, rgb, masks, p_img, os.path.join(a.out, "neighborhood.png"))
    n_ov = 0
    for i, row in df.iterrows():
        if n_ov >= a.max_overlays:
            break
        if overlay.parcel_overlay(img, rgb, masks, p_img.geometry.iloc[i], row, os.path.join(a.out, "overlays", f"{row.parcel_id}.png")):
            n_ov += 1

    log("export for app")
    export_app.export(img, rgb, masks, parcels, df, a.out, area_crs)

    if a.save_rasters:
        prof = dict(driver="GTiff", height=img.height, width=img.width, crs=img.crs, transform=img.transform, compress="deflate", tiled=True)
        with rasterio.open(os.path.join(a.out, "ndvi.tif"), "w", count=1, dtype="float32", **prof) as d:
            d.write(masks["ndvi"].astype("float32"), 1)
        with rasterio.open(os.path.join(a.out, "classes.tif"), "w", count=1, dtype="uint8", **prof) as d:
            cls = np.zeros(masks["lawn"].shape, dtype="uint8")
            cls[masks["lawn"]] = 1
            cls[masks["tree"]] = 2
            cls[masks["building"]] = 3
            d.write(cls, 1)

    ok = df[df.confidence != "low"]
    summary = {
        "bbox": bbox,
        "area_crs": area_crs,
        "parcels": int(len(df)),
        "parcels_high_or_medium_conf": int(len(ok)),
        "imagery": {"source": img.source, "date": img.capture_date, "gsd_m": round(img.gsd_m, 2), "crs": img.crs, **img.extra},
        "ndvi_threshold": a.ndvi_thr,
        "canopy_used": chm is not None,
        "median_lawn_sqft": float(df.lawn_sqft.median()),
        "median_lawn_frac": float(df.lawn_frac.median()),
        "total_lawn_acres": float(df.lawn_sqft.sum() / 43560),
        "total_lawn_acres_range": [float(df.lawn_lo_sqft.sum() / 43560), float(df.lawn_hi_sqft.sum() / 43560)],
        "confidence_counts": df.confidence.value_counts().to_dict(),
        "overlays_written": n_ov,
        "runtime_s": round(time.time() - t0, 1),
    }
    if a.address:
        hit = df[df.address.str.contains(a.address, case=False, na=False)]
        summary["address_match"] = hit.to_dict("records")
        if a.truth_sqft and len(hit) == 1:
            est = float(hit.lawn_sqft.iloc[0])
            summary["validation"] = {"truth_sqft": a.truth_sqft, "estimate_sqft": est, "error_pct": round((est - a.truth_sqft) / a.truth_sqft * 100, 1),
                                     "range_sqft": [float(hit.lawn_lo_sqft.iloc[0]), float(hit.lawn_hi_sqft.iloc[0])]}
    with open(os.path.join(a.out, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)
    log(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
