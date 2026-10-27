"""Shared types and helpers."""
from __future__ import annotations

import hashlib
import math
import os
from dataclasses import dataclass, field

import numpy as np
from rasterio.transform import Affine

SQM_PER_SQFT = 0.09290304
SQFT_PER_SQM = 1 / SQM_PER_SQFT
# Equal-area-ish working CRS for Utah: UTM 12N (NAD83). Areas are computed from
# parcel geometry in this CRS, so imagery can stay in whatever CRS it arrives in.
UTAH_AREA_CRS = "EPSG:26912"

RAW_DIR = os.environ.get("LAWN_RAW_DIR", os.path.join(os.path.dirname(__file__), "..", "data", "raw"))


def raw_path(name: str) -> str:
    os.makedirs(RAW_DIR, exist_ok=True)
    return os.path.join(RAW_DIR, name)


def bbox_key(bbox) -> str:
    return hashlib.md5(",".join(f"{v:.5f}" for v in bbox).encode()).hexdigest()[:8]


@dataclass
class Imagery:
    """A 4-band (R, G, B, NIR) raster window plus georeferencing and provenance."""

    data: np.ndarray  # shape (4, H, W); uint8 for NAIP, float for S2 reflectance
    transform: Affine
    crs: str
    source: str  # "naip-pc", "naip-local", "sentinel2", ...
    capture_date: str  # ISO date (or year) the pixels were captured
    gsd_m: float  # ground sample distance (m)
    extra: dict = field(default_factory=dict)

    @property
    def height(self) -> int:
        return self.data.shape[1]

    @property
    def width(self) -> int:
        return self.data.shape[2]

    @property
    def bounds(self):
        from rasterio.transform import array_bounds

        return array_bounds(self.height, self.width, self.transform)

    def ndvi(self) -> np.ndarray:
        r = self.data[0].astype("float32")
        nir = self.data[3].astype("float32")
        with np.errstate(divide="ignore", invalid="ignore"):
            v = (nir - r) / (nir + r)
        return np.nan_to_num(v, nan=0.0)


def equal_area_crs_for(lat: float, lon: float) -> str:
    """UTM zone for the AOI (good enough for parcel-scale areas)."""
    zone = int(math.floor((lon + 180) / 6) + 1)
    epsg = 26900 + zone if lat >= 0 else 32700 + zone
    return f"EPSG:{epsg}"
