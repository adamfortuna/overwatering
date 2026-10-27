"""Tree canopy from Meta's 1 m global canopy height model (CHM v2, CC-BY-4.0),
cloud-native mirror on Source Cooperative. Used to separate tree canopy from turf:
both are green in NDVI, only turf is irrigated lawn we can convert."""
from __future__ import annotations

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject, transform_bounds

from .common import Imagery, download, raw_path
from .imagery import _gdal_proxy_env

CHM_BASE = "https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/tge-labs/meta-chm-v2/"


def _tile_index() -> gpd.GeoDataFrame:
    return gpd.read_parquet(download(CHM_BASE + "tiles.parquet", raw_path("meta_chm_v2_tiles.parquet")))


def canopy_height_on_grid(img: Imagery) -> np.ndarray:
    """CHM (metres, float32) resampled onto the imagery grid. 0 = no canopy / no data."""
    _gdal_proxy_env()
    xmin, ymin, xmax, ymax = transform_bounds(img.crs, "EPSG:4326", *img.bounds)
    tiles = _tile_index().cx[xmin:xmax, ymin:ymax]
    out = np.zeros((img.height, img.width), dtype="float32")
    for _, t in tiles.iterrows():
        url = t.cog_url
        # data.source.coop fronts the public S3 bucket; go to S3 directly (works through
        # restricted proxies that only allow amazonaws.com).
        if url.startswith("s3://"):
            url = "https://s3.us-west-2.amazonaws.com/" + url[len("s3://"):]
        url = url.replace("https://data.source.coop/", "https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/")
        with rasterio.open(url) as src:
            b = transform_bounds(img.crs, src.crs, *img.bounds)
            from rasterio.windows import from_bounds

            w = from_bounds(*b, transform=src.transform).round_offsets().round_lengths()
            if w.width <= 0 or w.height <= 0:
                continue
            d = src.read(1, window=w, boundless=True, fill_value=0).astype("float32")
            tmp = np.zeros_like(out)
            reproject(
                d,
                tmp,
                src_transform=src.window_transform(w),
                src_crs=src.crs,
                dst_transform=img.transform,
                dst_crs=img.crs,
                resampling=Resampling.max if src.res[0] > img.gsd_m else Resampling.nearest,
            )
            out = np.maximum(out, tmp)
    return out
