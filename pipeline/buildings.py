"""Building footprints from Overture Maps (public S3, anonymous)."""
from __future__ import annotations

import os

import geopandas as gpd
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pafs
import pyarrow.parquet as pq

from .common import bbox_key, raw_path

OVERTURE_RELEASE = os.environ.get("OVERTURE_RELEASE", "2026-10-21.0")


def load_buildings(bbox_wgs84, area_crs: str, local_path: str | None = None) -> gpd.GeoDataFrame:
    """Overture building footprints intersecting bbox, in area_crs.

    local_path: optional file (any geopandas-readable) to use instead of Overture.
    """
    xmin, ymin, xmax, ymax = bbox_wgs84
    if local_path:
        g = gpd.read_parquet(local_path) if local_path.endswith(".parquet") else gpd.read_file(local_path)
        if g.crs is None:
            g = g.set_crs(4326)
        g = g.to_crs(4326).cx[xmin:xmax, ymin:ymax]
        return g.to_crs(area_crs)[["geometry"]].reset_index(drop=True)

    cache = raw_path(f"overture_buildings_{OVERTURE_RELEASE}_{bbox_key(bbox_wgs84)}.parquet")
    if not os.path.exists(cache):
        fs = pafs.S3FileSystem(anonymous=True, region="us-west-2")
        d = ds.dataset(
            f"overturemaps-us-west-2/release/{OVERTURE_RELEASE}/theme=buildings/type=building/",
            filesystem=fs,
            format="parquet",
        )
        # bbox struct columns are row-group indexed, so this is a cheap pushdown.
        f = (
            (pc.field("bbox", "xmin") < xmax)
            & (pc.field("bbox", "xmax") > xmin)
            & (pc.field("bbox", "ymin") < ymax)
            & (pc.field("bbox", "ymax") > ymin)
        )
        tbl = d.to_table(filter=f, columns=["id", "height", "subtype", "class", "geometry"])
        pq.write_table(tbl, cache)
    g = gpd.read_parquet(cache)
    if g.crs is None:
        g = g.set_crs(4326)
    return g.to_crs(area_crs).reset_index(drop=True)
