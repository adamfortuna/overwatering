"""4-band imagery access.

Sources (all return an Imagery with bands R, G, B, NIR):
  * "pc"        - NAIP via Microsoft Planetary Computer STAC (60 cm, 4-band COGs).
  * "sentinel2" - Sentinel-2 L2A on AWS (10 m). Coarse fallback; parcel-level
                  numbers from this are indicative only.
  * <path.tif>  - any local 4-band GeoTIFF (e.g. a NAIP tile from UGRC/USGS).
"""
from __future__ import annotations

import datetime as dt
import os

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

from .common import Imagery

PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"


def _gdal_proxy_env():
    """Let GDAL's libcurl use the same proxy/CA as everything else."""
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        os.environ.setdefault("GDAL_HTTP_PROXY", proxy)
    ca = os.environ.get("CURL_CA_BUNDLE") or os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE") or os.environ.get("AWS_CA_BUNDLE")
    if ca:
        os.environ.setdefault("GDAL_CURL_CA_BUNDLE", ca)
        os.environ.setdefault("CURL_CA_BUNDLE", ca)
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff,.jp2,.json")


def _read_window(src, bbox_wgs84):
    b = transform_bounds("EPSG:4326", src.crs, *bbox_wgs84)
    w = from_bounds(*b, transform=src.transform).round_offsets().round_lengths()
    data = src.read(window=w, boundless=True, fill_value=0)
    return data, src.window_transform(w)


def fetch_naip_pc(bbox_wgs84, years=(2024, 2023, 2022, 2021)) -> Imagery:
    import planetary_computer
    import pystac_client

    _gdal_proxy_env()
    cat = pystac_client.Client.open(PC_STAC, modifier=planetary_computer.sign_inplace)
    items = list(cat.search(collections=["naip"], bbox=list(bbox_wgs84)).items())
    if not items:
        raise RuntimeError("No NAIP items on Planetary Computer for bbox")
    by_year = {}
    for it in items:
        by_year.setdefault(int(it.properties.get("naip:year", it.datetime.year)), []).append(it)
    year = next((y for y in years if y in by_year), max(by_year))
    chosen = by_year[year]
    srcs = [rasterio.open(it.assets["image"].href) for it in chosen]
    crs = srcs[0].crs
    b = transform_bounds("EPSG:4326", crs, *bbox_wgs84)
    data, tr = merge(srcs, bounds=b, nodata=0)
    dates = sorted({it.datetime.date().isoformat() for it in chosen})
    gsd = float(chosen[0].properties.get("gsd", abs(srcs[0].res[0])))
    for s in srcs:
        s.close()
    return Imagery(data[:4], tr, crs.to_string(), "naip-pc", dates[0] if len(dates) == 1 else f"{dates[0]}..{dates[-1]}", gsd, {"year": year, "items": [it.id for it in chosen]})


def load_local(path: str, bbox_wgs84=None, capture_date: str = "unknown", source: str = "naip-local") -> Imagery:
    with rasterio.open(path) as src:
        if src.count < 4:
            raise ValueError("Need a 4-band (R,G,B,NIR) raster")
        if bbox_wgs84 is None:
            data, tr = src.read(), src.transform
        else:
            data, tr = _read_window(src, bbox_wgs84)
        gsd = abs(src.res[0])
        crs = src.crs.to_string()
        if src.crs.to_epsg() == 3857:
            # Web Mercator pixels are not ground metres; report true GSD at centre latitude.
            import math

            cy = (src.bounds.top + src.bounds.bottom) / 2
            lat = math.degrees(2 * math.atan(math.exp(cy / 6378137)) - math.pi / 2)
            gsd = gsd * math.cos(math.radians(lat))
    return Imagery(data[:4], tr, crs, source, capture_date, gsd)


# --- Sentinel-2 (AWS sentinel-cogs, anonymous) ------------------------------------------------

S2_BUCKET = "sentinel-cogs"
S2_CLOUD_CLASSES = (3, 8, 9, 10, 11)  # shadow, cloud med/high, cirrus, snow


def _s2_scenes(tile: str, year: int, months):
    import boto3
    import botocore

    s3 = boto3.client("s3", region_name="us-west-2", config=botocore.config.Config(signature_version=botocore.UNSIGNED))
    utm, band, grid = tile[:2], tile[2], tile[3:]
    out = []
    for m in months:
        r = s3.list_objects_v2(Bucket=S2_BUCKET, Prefix=f"sentinel-s2-l2a-cogs/{utm}/{band}/{grid}/{year}/{m}/", Delimiter="/")
        out += [p["Prefix"] for p in r.get("CommonPrefixes", [])]
    return out


def fetch_sentinel2(bbox_wgs84, tile="12TVL", year=2026, months=(7, 8, 6), max_cloud_frac=0.02) -> Imagery:
    _gdal_proxy_env()
    best = None
    for prefix in _s2_scenes(tile, year, months):
        url = f"https://{S2_BUCKET}.s3.us-west-2.amazonaws.com/{prefix}"
        with rasterio.open(url + "SCL.tif") as scl:
            d, _ = _read_window(scl, bbox_wgs84)
        frac = float(np.isin(d, S2_CLOUD_CLASSES).mean())
        if best is None or frac < best[1]:
            best = (url, frac)
        if frac <= max_cloud_frac:
            break
    url, frac = best
    scene = url.rstrip("/").split("/")[-1]
    date = dt.datetime.strptime(scene.split("_")[2], "%Y%m%d").date().isoformat()
    bands = []
    for b in ("B04", "B03", "B02", "B08"):
        with rasterio.open(url + f"{b}.tif") as src:
            d, tr = _read_window(src, bbox_wgs84)
            crs = src.crs.to_string()
        bands.append(d[0].astype("float32"))
    # L2A processing baseline >= 04.00 adds a 1000 DN offset.
    data = np.stack(bands)
    data = np.clip((data - 1000.0) / 10000.0, 0, 1)
    return Imagery(data, tr, crs, "sentinel2", date, 10.0, {"scene": scene, "cloud_frac": frac})


def get_imagery(spec: str, bbox_wgs84, **kw) -> Imagery:
    if spec == "pc":
        return fetch_naip_pc(bbox_wgs84, **{k: v for k, v in kw.items() if k == "years"})
    if spec == "sentinel2":
        return fetch_sentinel2(bbox_wgs84, **{k: v for k, v in kw.items() if k in ("tile", "year", "months")})
    return load_local(spec, bbox_wgs84, capture_date=kw.get("capture_date", "unknown"), source=kw.get("source", "naip-local"))
