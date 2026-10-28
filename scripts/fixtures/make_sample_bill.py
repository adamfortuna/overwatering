"""Regenerate sample_slc_bill.png: a synthetic Salt Lake City water bill (CCF usage history,
Oct 2025-Sep 2026) for testing /api/bill. Not a real bill; the address is the Governor's Mansion.

  python scripts/fixtures/make_sample_bill.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

# Sized for the mansion's ~11,000 sq ft of lawn: about 320k gal outdoors vs. ~200k the lawn needs,
# so the demo shows an overwatering gap.
MONTHS = [("Oct 25", 40), ("Nov 25", 12), ("Dec 25", 10), ("Jan 26", 10), ("Feb 26", 10), ("Mar 26", 11), ("Apr 26", 26), ("May 26", 58), ("Jun 26", 92), ("Jul 26", 108), ("Aug 26", 102), ("Sep 26", 70)]


def font(size):
    for p in ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    im = Image.new("RGB", (1100, 1400), "white")
    d = ImageDraw.Draw(im)
    d.text((60, 50), "SALT LAKE CITY DEPARTMENT OF PUBLIC UTILITIES", fill="black", font=font(30))
    d.text((60, 100), "Statement date: 09/15/2026     Account: 000-000000-0  (SAMPLE)", fill="black", font=font(22))
    d.text((60, 140), "Service address: 603 E South Temple, Salt Lake City UT 84102", fill="black", font=font(22))
    d.text((60, 220), "WATER USAGE HISTORY (CCF - 1 CCF = 748 gallons)", fill="black", font=font(26))
    x0, y0, bw = 80, 820, 70
    for i, (m, v) in enumerate(MONTHS):
        x, h = x0 + i * (bw + 10), v * 520 // max(v for _, v in MONTHS)
        d.rectangle([x, y0 - h, x + bw, y0], fill=(60, 110, 200))
        d.text((x + 18, y0 - h - 30), str(v), fill="black", font=font(22))
        d.text((x + 2, y0 + 10), m, fill="black", font=font(18))
    d.line([x0 - 10, y0, x0 + 12 * (bw + 10), y0], fill="black", width=2)
    d.text((60, 900), "Current charges", fill="black", font=font(26))
    for j, (a, b) in enumerate([("Water base charge", "$12.34"), ("Water usage 70 CCF", "$186.90"), ("Sewer", "$31.20"), ("Storm water", "$9.80"), ("Total due 10/05/2026", "$240.24")]):
        d.text((80, 950 + j * 40), a, fill="black", font=font(22))
        d.text((700, 950 + j * 40), b, fill="black", font=font(22))
    out = os.path.join(os.path.dirname(__file__), "sample_slc_bill.png")
    im.save(out)
    print(out)


if __name__ == "__main__":
    main()
