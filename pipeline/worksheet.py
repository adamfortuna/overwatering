"""Tape-measure worksheet for validating one lot.

Draws the lot's imagery crop with every detected lawn patch (and tree-canopy patch) lettered,
plus each patch's approximate length x width (sides of its minimum rotated rectangle) and
area in feet. Measuring two sides per patch is much faster than tracing the whole yard.

  python -m pipeline.worksheet --dataset 84102 --parcel <parcel id> --out worksheet.png
"""
from __future__ import annotations

import argparse
import json
import math
import os

import geopandas as gpd
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import shape

FT_PER_M = 3.28084
COLORS = {"lawn": (74, 222, 128), "canopy": (21, 128, 61)}


def _font(size: int):
	for p in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"):
		if os.path.exists(p):
			return ImageFont.truetype(p, size)
	return ImageFont.load_default()


def _sides_ft(geom_utm) -> tuple[float, float]:
	r = geom_utm.minimum_rotated_rectangle
	xs = list(r.exterior.coords)
	a = math.dist(xs[0], xs[1]) * FT_PER_M
	b = math.dist(xs[1], xs[2]) * FT_PER_M
	return max(a, b), min(a, b)


def build(data_dir: str, parcel_id: str, out: str, scale: int = 8, min_sqft: float = 25) -> list[dict]:
	with open(os.path.join(data_dir, "parcels.json")) as f:
		parcel = next(p for p in json.load(f)["parcels"] if p["parcel_id"] == parcel_id)
	with open(os.path.join(data_dir, "regions", f"{parcel_id}.geojson")) as f:
		feats = json.load(f)["features"]
	crop = Image.open(os.path.join(data_dir, "crops", f"{parcel_id}.png")).convert("RGB")
	w, h = crop.size
	img = crop.resize((w * scale, h * scale), Image.NEAREST)
	draw = ImageDraw.Draw(img, "RGBA")

	# Crop corners (lon, lat): top-left, top-right, bottom-right, bottom-left. Pixel mapping is
	# bilinear in lon/lat, which is exact enough at lot scale.
	(tlx, tly), (trx, try_), _, (blx, bly) = parcel["crop_corners"]

	def to_px(lon, lat):
		u = (lon - tlx) / (trx - tlx)
		v = (lat - tly) / (bly - tly)
		return u * w * scale, v * h * scale

	gdf = gpd.GeoDataFrame([f["properties"] for f in feats], geometry=[shape(f["geometry"]) for f in feats], crs=4326)
	utm = gdf.to_crs(26912)
	rows, letter = [], 0
	order = sorted(range(len(gdf)), key=lambda i: (gdf.cls[i] != "lawn", -gdf.sqft[i]))
	for i in order:
		cls, sqft = gdf.cls[i], gdf.sqft[i]
		if cls not in COLORS or sqft < min_sqft:
			continue
		label = chr(ord("A") + letter) if cls == "lawn" else f"T{letter - sum(r['cls'] == 'lawn' for r in rows) + 1}"
		letter += 1
		geom = gdf.geometry[i]
		polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
		for p in polys:
			pts = [to_px(x, y) for x, y in p.exterior.coords]
			draw.polygon(pts, fill=COLORS[cls] + (90,), outline=(255, 255, 255, 230))
		c = geom.representative_point()
		cx, cy = to_px(c.x, c.y)
		long_ft, short_ft = _sides_ft(utm.geometry[i])
		r = 16 if cls == "lawn" else 14
		draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(11, 16, 32, 230), outline=(255, 201, 64, 255), width=3)
		draw.text((cx, cy), label, font=_font(16 if len(label) == 1 else 13), fill=(255, 201, 64), anchor="mm")
		rows.append({"label": label, "cls": cls, "sqft": int(sqft), "long_ft": round(long_ft), "short_ft": round(short_ft)})

	# Parcel outline: the parcel is the lawn+canopy+building+other union, so trace all regions' outer edge.
	lot = gdf.geometry.union_all()
	for p in [lot] if lot.geom_type == "Polygon" else list(lot.geoms):
		draw.line([to_px(x, y) for x, y in p.exterior.coords], fill=(255, 201, 64, 255), width=3)

	# Table under the image.
	line_h, pad = 30, 20
	table_h = pad * 2 + line_h * (len(rows) + 3)
	sheet = Image.new("RGB", (img.width, img.height + table_h), (11, 16, 32))
	sheet.paste(img, (0, 0))
	d = ImageDraw.Draw(sheet)
	y = img.height + pad
	d.text((pad, y), f"{parcel['address']}  ·  lot {parcel['parcel_sqft']:,.0f} sq ft  ·  measure each patch: long side x short side", font=_font(18), fill=(245, 241, 230))
	y += line_h + 6
	d.text((pad, y), "Patch   Type          Our estimate (approx. L x W)      Area      Your tape (L x W)", font=_font(16), fill=(164, 172, 200))
	for r in rows:
		y += line_h
		kind = "grass" if r["cls"] == "lawn" else "under trees"
		d.text((pad, y), f"{r['label']:<7} {kind:<13} {r['long_ft']:>3} ft x {r['short_ft']:>3} ft               {r['sqft']:>5} sq ft   ______ x ______", font=_font(16), fill=(245, 241, 230))
	sheet.save(out)
	return rows


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("--dataset", default="84102")
	ap.add_argument("--parcel", default="09314870040000", help="default: the Governor's Mansion")
	ap.add_argument("--data-root", default="app/static/data")
	ap.add_argument("--out", default="worksheet.png")
	a = ap.parse_args()
	rows = build(os.path.join(a.data_root, a.dataset), a.parcel, a.out)
	for r in rows:
		print(r)
	print(f"-> {a.out}")


if __name__ == "__main__":
	main()
