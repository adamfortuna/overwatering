"""Overlay PNGs: parcel outline + lawn/canopy/building tint on the source imagery."""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw
from rasterio.transform import rowcol

from .common import Imagery

LAWN_RGBA = (60, 220, 60, 110)
TREE_RGBA = (0, 90, 40, 110)
BLDG_RGBA = (200, 60, 60, 80)


def rgb8(img: Imagery) -> np.ndarray:
    """HxWx3 uint8 display image."""
    d = img.data[:3]
    if d.dtype == np.uint8:
        return np.moveaxis(d, 0, -1).copy()
    out = np.zeros((img.height, img.width, 3), dtype=np.uint8)
    for i in range(3):
        band = d[i]
        lo, hi = np.percentile(band[band > 0], (2, 98)) if (band > 0).any() else (0, 1)
        out[..., i] = np.clip((band - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    return out


def _tint(base: Image.Image, masks: dict, window) -> Image.Image:
    r0, r1, c0, c1 = window
    base = base.convert("RGBA")
    for key, rgba in (("lawn", LAWN_RGBA), ("tree", TREE_RGBA), ("building", BLDG_RGBA)):
        m = masks[key][r0:r1, c0:c1]
        layer = np.zeros((m.shape[0], m.shape[1], 4), dtype=np.uint8)
        layer[m] = rgba
        base = Image.alpha_composite(base, Image.fromarray(layer, "RGBA"))
    return base


def parcel_overlay(img: Imagery, rgb: np.ndarray, masks: dict, geom_img_crs, row, out_path: str, margin_m: float = 6.0, min_width_px: int = 480):
    minx, miny, maxx, maxy = geom_img_crs.bounds
    m = margin_m / img.gsd_m * abs(img.transform.a)  # margin in CRS units
    r0, c0 = rowcol(img.transform, minx - m, maxy + m)
    r1, c1 = rowcol(img.transform, maxx + m, miny - m)
    r0, c0 = max(0, r0), max(0, c0)
    r1, c1 = min(img.height, r1 + 1), min(img.width, c1 + 1)
    if r1 - r0 < 2 or c1 - c0 < 2:
        return None
    base = Image.fromarray(rgb[r0:r1, c0:c1])
    comp = _tint(base, masks, (r0, r1, c0, c1))
    scale = max(1, int(np.ceil(min_width_px / comp.width)))
    if scale > 1:
        comp = comp.resize((comp.width * scale, comp.height * scale), Image.NEAREST)
    draw = ImageDraw.Draw(comp)
    polys = [geom_img_crs] if geom_img_crs.geom_type == "Polygon" else list(geom_img_crs.geoms)
    for poly in polys:
        pts = []
        for x, y in poly.exterior.coords:
            rr, cc = rowcol(img.transform, x, y, op=float)
            pts.append(((cc - c0) * scale, (rr - r0) * scale))
        draw.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=3)
        draw.line(pts + [pts[0]], fill=(0, 0, 0, 255), width=1)
    footer = f"{row.address} | lawn ~{int(row.lawn_sqft):,} sq ft ({row.lawn_frac:.0%}) | canopy {row.canopy_frac:.0%} | {img.source} {img.capture_date} | conf {row.confidence}"
    canvas = Image.new("RGBA", (comp.width, comp.height + 22), (20, 20, 20, 255))
    canvas.paste(comp, (0, 0))
    ImageDraw.Draw(canvas).text((6, comp.height + 5), footer, fill=(240, 240, 240, 255))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert("RGB").save(out_path, optimize=True)
    return out_path


def neighborhood_overlay(img: Imagery, rgb: np.ndarray, masks: dict, parcels_img_crs, out_path: str, max_px: int = 2400):
    base = Image.fromarray(rgb)
    comp = _tint(base, masks, (0, img.height, 0, img.width))
    draw = ImageDraw.Draw(comp)
    for geom in parcels_img_crs.geometry:
        polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
        for poly in polys:
            pts = [tuple(reversed(rowcol(img.transform, x, y, op=float))) for x, y in poly.exterior.coords]
            draw.line(pts + [pts[0]], fill=(255, 255, 0, 200), width=1)
    if max(comp.size) > max_px:
        s = max_px / max(comp.size)
        comp = comp.resize((int(comp.width * s), int(comp.height * s)), Image.BILINEAR)
    comp.convert("RGB").save(out_path, optimize=True)
    return out_path
