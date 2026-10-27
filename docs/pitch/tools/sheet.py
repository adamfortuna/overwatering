"""Contact sheets of rendered slides: uv run --with pillow python docs/pitch/tools/sheet.py [slide numbers...]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

R = Path(__file__).parent / ".build" / "render"
fs = sorted(R.glob("slide-*.png"))
if sys.argv[1:]:
    fs = [f for f in fs if int(f.stem.split("-")[1]) in {int(a) for a in sys.argv[1:]}]
cw, ch = 1280, 720
for k in range(0, len(fs), 6):
    grp = fs[k:k + 6]
    rows = (len(grp) + 1) // 2
    sheet = Image.new("RGB", (2 * cw + 30, rows * (ch + 30)), "#888")
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(grp):
        x, y = (i % 2) * (cw + 30), (i // 2) * (ch + 30)
        sheet.paste(Image.open(f).convert("RGB").resize((cw, ch)), (x, y + 30))
        d.text((x + 4, y + 8), f.name, fill="white")
    out = R / f"sheet-{k // 6}.png"
    sheet.save(out)
    print(out)
