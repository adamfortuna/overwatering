"""Build docs/pitch/overwatering.pptx and docs/pitch/script.md from one source.

    uv run --with python-pptx --with pillow --with "qrcode[pil]" python docs/pitch/tools/build_deck.py

Art PNGs come from tools/art.mjs and screenshots from tools/shots.mjs. Every slide's speaker
notes are also written, in order and with timings, to script.md. Text stays in real text boxes
(Fredoka headings, Nunito body) so the deck is editable after File > Import slides in Google Slides.
"""

import io
from pathlib import Path

import qrcode
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.util import Emu, Inches, Pt

PITCH = Path(__file__).resolve().parents[1]
ART = PITCH / "art"
SHOTS = PITCH / "shots"
BUILD = PITCH / "tools" / ".build"
BUILD.mkdir(exist_ok=True)

HEAD, BODY = "Fredoka", "Nunito"
WATER, SKY, MIST = "1f86d6", "4cc3f0", "dff3fd"
LAWN, SUN, CORAL, INK, SAND = "2c9a4b", "ffc93c", "e5533f", "12324a", "f7dcae"
GOLD = "c27c00"  # readable "sun" for text
MUTED = "4f6b80"
BG = "eef8fe"
WHITE = "ffffff"

W, H = 13.333, 7.5


def rgb(h):
    return RGBColor.from_string(h)


prs = Presentation()
prs.slide_width, prs.slide_height = Inches(W), Inches(H)
BLANK = prs.slide_layouts[6]
SCRIPT = []  # (slide number, title, timing, notes)


# ---------- helpers ----------

def slide(bg=BG):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(bg)
    return s


def text(s, x, y, w, h, paras, size=20, font=BODY, color=INK, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, line=None, after=0):
    """paras: list of paragraphs; each is a str or a list of (text, {overrides}) runs."""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, side, Inches(0.02))
    for i, para in enumerate(paras if isinstance(paras, list) else [paras]):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line:
            p.line_spacing = line
        p.space_after = Pt(after)
        for run_text, o in ([(para, {})] if isinstance(para, str) else para):
            r = p.add_run()
            r.text = run_text
            f = r.font
            f.name = o.get("font", font)
            f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", bold)
            f.italic = o.get("italic", False)
            f.color.rgb = rgb(o.get("color", color))
    return tb


def kicker(s, t, x=0.75, y=0.55, w=9, color=WATER):
    return text(s, x, y, w, 0.4, t.upper(), size=14, bold=True, color=color)


def title(s, t, x=0.75, y=0.9, w=11.8, h=1.0, size=40, color=INK):
    return text(s, x, y, w, h, t if isinstance(t, list) else [t], size=size, font=HEAD, bold=True, color=color, line=0.95)


def source(s, t, x=0.75, y=6.95, w=11.8):
    return text(s, x, y, w, 0.4, t, size=9, color=MUTED)


def png(s, path, x, y, w=None, h=None):
    kw = {}
    if w is not None:
        kw["width"] = Inches(w)
    if h is not None:
        kw["height"] = Inches(h)
    return s.shapes.add_picture(str(path), Inches(x), Inches(y), **kw)


def box(s, x, y, w, h, fill=WHITE, line=None, radius=0.08, shape=MSO_SHAPE.ROUNDED_RECTANGLE, dash=False):
    b = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        b.adjustments[0] = radius
    if fill:
        b.fill.solid()
        b.fill.fore_color.rgb = rgb(fill)
    else:
        b.fill.background()
    if line:
        b.line.color.rgb = rgb(line)
        b.line.width = Pt(2)
        if dash:
            from pptx.enum.dml import MSO_LINE
            b.line.dash_style = MSO_LINE.DASH
    else:
        b.line.fill.background()
    b.shadow.inherit = False
    b.text_frame.text = ""
    return b


def shot(s, name, x, y, w=None, h=None):
    """Screenshots go in as JPEG (they're photos of a page; keeps the deck small). Framed in white."""
    src = SHOTS / f"{name}.png"
    if not src.exists():
        return None
    out = BUILD / f"{name}.jpg"
    im = Image.open(src).convert("RGB")
    im.thumbnail((2400, 2400))
    im.save(out, quality=86)
    ar = im.width / im.height
    if w is None:
        w = h * ar
    if h is None:
        h = w / ar
    pad = 0.07
    box(s, x - pad, y - pad, w + 2 * pad, h + 2 * pad, fill=WHITE, line="cfe6f5", radius=0.03)
    return png(s, out, x, y, w, h)


def placeholder(s, x, y, w, h, label, detail=""):
    box(s, x, y, w, h, fill="fff6e0", line=CORAL, dash=True, radius=0.05)
    paras = [[("PLACEHOLDER", {"bold": True, "color": CORAL, "size": 13})], [(label, {"font": HEAD, "bold": True, "size": 24})]]
    if detail:
        paras.append([(detail, {"size": 15, "color": MUTED})])
    text(s, x + 0.3, y + 0.3, w - 0.6, h - 0.6, paras, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER, after=6)


def notes(s, timing, body):
    """Speaker notes: a timing line, then the words. Also collected for script.md."""
    body = "\n".join(line.strip() for line in body.strip().splitlines())
    s.notes_slide.notes_text_frame.text = f"[{timing}]\n{body}"
    SCRIPT.append((len(prs.slides), slide_titles.get(len(prs.slides), ""), timing, body))


slide_titles = {}


def named(t):
    slide_titles[len(prs.slides)] = t


def logo_word(s, x, y, size=40):
    return text(s, x, y, 6, size / 50, [[("Overwater", {}), (".ing", {"color": WATER}), ("?", {"color": "f0a92a"})]],
                size=size, font=HEAD, bold=True)


def big_stat(s, x, y, w, number, label, color=WATER, nsize=88, lsize=20, lh=1.4):
    text(s, x, y, w, nsize / 60, number, size=nsize, font=HEAD, bold=True, color=color, line=0.9)
    text(s, x, y + nsize / 60 + 0.05, w, lh, label, size=lsize, color=INK, line=1.1)


def footer_scene(s):
    png(s, ART / "scene-footer.png", 0, H - W * 440 / 2400, w=W)


def qr(url):
    q = qrcode.QRCode(border=1, box_size=20, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    img = q.make_image(fill_color="#12324a", back_color="white")
    out = BUILD / "qr.png"
    img.save(out)
    return out


# ---------- the deck ----------

# 1. Title
s = slide()
named("Title")
png(s, ART / "scene-hero.png", 6.9, 0.9, w=6.2)
png(s, ART / "logo.png", 0.75, 1.15, w=1.3)
logo_word(s, 2.15, 1.42, size=46)
text(s, 0.75, 2.85, 6.4, 2.0, [
    [("Is your lawn getting more water than it needs?", {})],
], size=34, font=HEAD, bold=True, line=1.0)
text(s, 0.75, 4.55, 6.0, 1.2, "Every lawn in Utah, measured from the air. What it really needs, sent to the sprinkler controller.",
     size=20, color=MUTED, line=1.15)
text(s, 0.75, 6.25, 6.4, 0.5, [[("Adam Fortuna", {"bold": True}), ("  ·  overwater.ing  ·  Nucleus × Startup State", {})]],
     size=16, color=INK)
notes(s, "0:00–0:05", """
Hi, I'm Adam Fortuna. This is Overwater.ing. Question mark.
""")

# 2. The story
s = slide()
named("How I got here")
kicker(s, "How I got here")
title(s, "It started over a pint.")
steps = [
    ("July", "Perspectives Over Pints, Fisher Brewing.", "The Yard Farmer gave the talk."),
    ("That night", "Most of our water goes on grass.", "And Utah will pay you to replace it."),
    ("November", "Our own yard consult is booked.", "So: how much lawn do I actually have?"),
]
for i, (when, a, b) in enumerate(steps):
    x = 0.75 + i * 4.05
    box(s, x, 2.2, 3.75, 2.85, fill=WHITE, line="cfe6f5", radius=0.1)
    text(s, x + 0.3, 2.4, 3.2, 0.45, when.upper(), size=14, bold=True, color=WATER)
    text(s, x + 0.3, 2.85, 3.2, 1.2, a, size=21, font=HEAD, bold=True, line=1.0)
    text(s, x + 0.3, 4.1, 3.2, 0.85, b, size=17, color=MUTED, line=1.1)
text(s, 0.75, 5.3, 8.0, 1.2, [[("Nobody could tell me. ", {"bold": True}), ("Not for my lot, and not for any lot in Utah.", {})]],
     size=24, line=1.1)
png(s, ART / "grass.png", 10.9, 4.95, w=1.6)
png(s, ART / "drop.png", 10.2, 5.65, w=0.62)
notes(s, "0:05–0:30", """
In July I went to Perspectives Over Pints at Fisher Brewing, and The Yard Farmer gave the talk.
Most of Utah's water goes on grass, and the state will pay you to replace it. We booked our own
yard consult for November. But my first question was: how much lawn do I have, and what does it
really need? Nobody could tell me.
""")

# 3. Where the water goes
s = slide()
named("Where the water goes")
kicker(s, "The problem")
title(s, "Utah's water goes on the yard.")
big_stat(s, 0.75, 2.2, 4.6, "~60%", "of Utah's city water is used outdoors, mostly on grass.")
big_stat(s, 5.35, 2.2, 4.6, "96%", "of what cities use up is outdoor water. Indoor water goes back to the river.", color=CORAL)
text(s, 0.75, 5.35, 9.0, 0.9, [[("500,993 acre-feet a year ", {"bold": True, "color": WATER}),
                                ("on Utah's residential yards alone.", {})]], size=22)
png(s, ART / "sprinkler.png", 9.75, 2.35, w=3.3)
source(s, "Sources: USU Extension citing Utah DWR (60%, 500,993 AF/yr, 2021 data); USU Institute for Land, Water & Air, 2025 (96% of M&I depletion); Utah DWR GSL Basin M&I report, Aug 2025.")
notes(s, "0:30–0:42", """
About 60 percent of Utah's city water goes outdoors. And since indoor water flows back to the
river, outdoor watering is 96 percent of what our cities use up.
""")

# 4. The lake and the AI build-out
s = slide()
named("The lake and the AI build-out")
kicker(s, "Why now")
title(s, "The lake is short. Now AI wants water too.")
# lake gauge
box(s, 0.75, 2.2, 5.7, 3.75, fill=WHITE, line="cfe6f5", radius=0.06)
text(s, 1.05, 2.4, 5.2, 0.4, "GREAT SALT LAKE", size=14, bold=True, color=WATER)
text(s, 1.05, 2.8, 5.2, 1.2, "4,190.4 ft", size=64, font=HEAD, bold=True, color=CORAL, line=0.9)
text(s, 1.05, 4.0, 5.2, 0.6, "August 2026. The healthy range starts at 4,198 ft.", size=18, line=1.1)
text(s, 1.05, 4.75, 5.2, 1.2, [[("471,000–1,055,000 ", {"bold": True}), ("more acre-feet a year to get it back.", {})]],
     size=18, line=1.1)
# data centers
box(s, 6.8, 2.2, 5.8, 3.75, fill=WHITE, line="cfe6f5", radius=0.06)
text(s, 7.1, 2.4, 5.2, 0.4, "UTAH'S AI BUILD-OUT", size=14, bold=True, color=WATER)
text(s, 7.1, 2.8, 2.3, 1.2, "48", size=64, font=HEAD, bold=True, color=WATER, line=0.9)
text(s, 8.55, 2.95, 3.9, 0.9, "data centers operating in Utah today.", size=18, line=1.1)
text(s, 7.1, 4.0, 5.3, 2.0, [
    [("Executive Order 2026-03: ", {"bold": True}), ("new data centers may not add to the lake's depletion.", {})],
    [("One proposed campus in Box Elder County: ", {"bold": True}), ("~987 acre-feet a year.", {})],
], size=18, line=1.1, after=10)
text(s, 0.75, 6.2, 11.8, 0.5, "Every new megawatt has to find its water somewhere. The biggest place to find it is the yard.",
     size=18, bold=True, color=INK)
source(s, "Sources: Utah News Dispatch / USGS gauge (lake level); GSL Strategic Plan (inflow need); Utah Exec. Order 2026-03 (May 29, 2026); Deseret News, Aug 19 2026 (48 data centers); SL Tribune, Oct 20 2026 (Stratos project estimate, net depletion).")
notes(s, "0:42–1:00", """
Great Salt Lake is eight feet below healthy. Meanwhile Utah has 48 data centers, and since May,
new ones can't add to the lake's depletion. One proposed campus is about a thousand acre-feet a
year. That water has to come from somewhere. The biggest place to find it is the yard.
""")

# 5. Utah pays, but can't see
s = slide()
named("Utah pays, but can't see the yards")
kicker(s, "The gap")
title(s, "Utah pays to fix it. It can't see the yards.")
png(s, ART / "coin.png", 0.85, 2.35, w=1.25)
text(s, 2.35, 2.25, 4.3, 0.9, "$1.50–$3", size=48, font=HEAD, bold=True, color=GOLD, line=0.9)
text(s, 2.35, 3.15, 4.3, 0.9, "per square foot of lawn you replace (Utah Water Savers).", size=18, line=1.1)
text(s, 0.85, 4.25, 5.8, 1.0, [[("~3 million sq ft converted in 2024, ", {"bold": True}), (">$7M paid.", {})]], size=19, line=1.1)
png(s, ART / "sprinkler-off.png", 7.0, 2.3, w=1.1)
text(s, 8.4, 2.25, 4.3, 0.9, "About half", size=48, font=HEAD, bold=True, color=CORAL, line=0.9)
text(s, 8.4, 3.15, 4.2, 0.9, "of Utahns overwater (BYU, aerial imagery + water bills).", size=18, line=1.1)
box(s, 0.75, 5.25, 11.85, 1.25, fill=MIST, radius=0.15)
text(s, 1.05, 5.3, 11.3, 1.15, "But nobody knows, lot by lot, how much lawn there is or how much water it really needs.",
     size=24, font=HEAD, bold=True, anchor=MSO_ANCHOR.MIDDLE, line=1.0)
source(s, "Sources: Utah Water Savers program rates (checked Oct 27 2026); Utah DWR turf buyback results 2024; Sowby et al., BYU 2022.")
notes(s, "1:00–1:10", """
The state already pays up to three dollars a square foot to replace grass. But nobody knows, lot
by lot, how much lawn there is. So I built it.
""")

# 6. Demo
s = slide()
named("Live demo")
kicker(s, "Live demo · overwater.ing")
title(s, "Type any Utah address.")
shot(s, "03-lot", 3.55, 2.05, h=4.85)
text(s, 0.75, 2.15, 2.6, 4.6, [
    [("1", {"font": HEAD, "bold": True, "color": WATER}), ("  Find the lawn", {"bold": True})],
    [("2", {"font": HEAD, "bold": True, "color": WATER}), ("  What it needs", {"bold": True})],
    [("3", {"font": HEAD, "bold": True, "color": WATER}), ("  Read the bill", {"bold": True})],
    [("4", {"font": HEAD, "bold": True, "color": WATER}), ("  Watering plan", {"bold": True})],
    [("5", {"font": HEAD, "bold": True, "color": WATER}), ("  The controller", {"bold": True})],
    [("6", {"font": HEAD, "bold": True, "color": WATER}), ("  Go native", {"bold": True})],
    [("7", {"font": HEAD, "bold": True, "color": WATER}), ("  The rebate", {"bold": True})],
], size=19, after=12)
notes(s, "1:10–3:00", """
(Switch to the browser. Full click path and fallbacks are in demo.md.)
1:10 Home page. Type "603 E South Temple", the Governor's Mansion. Pick it.
1:20 This is the 2024 aerial photo. Green is lawn, dark green is trees, red is buildings. 11,000
square feet of lawn, confidence high. If we got a shape wrong, you tap it, and that correction
trains the model.
1:35 What it needs: about 29 inches a season in Salt Lake's weather, 200,000 gallons a year.
1:45 Add the bill: upload the photo. Claude reads twelve months of usage in a few seconds and
we compare outdoor use to what the lawn needs.
2:00 Build my watering plan: pick spray heads and a basic timer. One thing to do, gallons saved,
and a month-by-month schedule.
2:15 Subscribe to the watering calendar, and the controller picks it up. This week the state
guide says no watering, so the controller pauses itself.
2:35 Go native: the before and after, the plants, the designers to call.
2:45 The rebate: up to $33,000 here, from Central Utah Water Conservancy District, with the city
and water district this lot is in.
2:55 And it isn't just these neighborhoods: any address in Utah gets measured live.
""")

# 7. Built, live, checked
s = slide()
named("Built, live, checked")
kicker(s, "Progress")
title(s, "Live, statewide, and checked against the state.")
tiles = [
    ("12,791", "lots precomputed in six Salt Lake City and Sandy neighborhoods: 319 acres of lawn.", WATER),
    ("29 / 29", "Utah counties searchable. Any other address is measured live in the browser.", LAWN),
    ("r = 0.77", "per-lot agreement with the state's Greenspace model (3,104 lots, median ratio 0.97).", CORAL),
]
for i, (n, label, c) in enumerate(tiles):
    x = 0.75 + i * 4.05
    box(s, x, 2.25, 3.75, 3.2, fill=WHITE, line="cfe6f5", radius=0.08)
    text(s, x + 0.3, 2.5, 3.2, 1.1, n, size=54, font=HEAD, bold=True, color=c, line=0.9)
    text(s, x + 0.3, 3.65, 3.2, 1.7, label, size=17, line=1.15)
text(s, 0.75, 5.75, 11.8, 0.9, [[("Built on real data: ", {"bold": True}),
                                 ("USDA aerial imagery, county parcels, Meta tree heights, gridMET weather, Utah Water Savers rebates, and Claude reading real bills.", {})]],
     size=18, line=1.15)
source(s, "Greenspace comparison: Utah DWRe Greenspace 2024 (NDVI ≥ 0.15) vs. our lawn + tree canopy for ZIP 84102: 189.2 vs 170.2 acres. Data shared by Jack Hinzman, Senior GIS Analyst, DWRe. Method: RESULTS.md, Run 7.")
notes(s, "3:00–3:10", """
It's live: twelve thousand eight hundred lots precomputed, any address in all 29 counties
measured on demand, and it tracks the state's own Greenspace model lot by lot.
""")

# 8. Hard tech
s = slide()
named("How it works")
kicker(s, "Hard tech")
title(s, "From satellite pixels to the sprinkler valve.")
rows = [
    ("SEE THE LAWN", WATER, ["NAIP aerial imagery, 60 cm, 4 bands", "Haze-corrected NDVI", "Meta LiDAR-derived tree heights (COG range reads)", "Building footprints", "Turf polygons per lot"]),
    ("KNOW THE NEED", LAWN, ["gridMET reference ET, every county", "FAO-56 turf water need", "State Weekly Lawn Watering Guide", "Month-by-month schedule"]),
    ("CLOSE THE LOOP", CORAL, ["Open API + watering calendar", "Sprinkler controller (OpenSprinkler now, Rachio next)", "Claude reads water bills", "Your corrections = labels", "Trained lawn segmentation model"]),
]
for r, (label, c, items) in enumerate(rows):
    y = 2.05 + r * 1.45
    text(s, 0.75, y + 0.2, 1.4, 0.7, label, size=13, bold=True, color=c, line=1.0)
    n = len(items)
    gap = 0.32
    bw = (12.6 - 2.35 - gap * (n - 1)) / n
    for i, it in enumerate(items):
        x = 2.35 + i * (bw + gap)
        b = box(s, x, y, bw, 1.1, fill=WHITE, line=c, radius=0.12)
        text(s, x + 0.08, y + 0.05, bw - 0.16, 1.0, it, size=13.5, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, line=1.0)
        if i < n - 1:
            a = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x + bw + 0.05), Inches(y + 0.45), Inches(gap - 0.1), Inches(0.2))
            a.fill.solid(); a.fill.fore_color.rgb = rgb(c); a.line.fill.background(); a.shadow.inherit = False
text(s, 0.75, 6.4, 11.8, 0.5, [[("Runs in the browser and on Cloudflare's edge. ", {"bold": True}),
                               ("No GIS desktop, no per-lot cost: a new address is measured in seconds.", {})]], size=16)
notes(s, "3:10–3:40", """
Under the hood: 60-centimeter aerial imagery, haze-corrected NDVI to find what's growing, Meta's
LiDAR tree heights to pull out trees, and building footprints, all computed in the browser and
on Cloudflare's edge. Then local weather and the FAO-56 method give what the lawn needs, tied to
the state's weekly guide. And we close the loop: a calendar and API the sprinkler controller
follows. Claude reads bills to measure the result, and every correction trains our model.
""")

# 9. Water = energy = AI headroom
s = slide()
named("Water, energy, AI")
kicker(s, "Why it's an energy and AI story")
title(s, "Saved water is saved power, and AI headroom.")
tiles = [
    ("650 kWh", "to treat and deliver one acre-foot of water.", WATER),
    ("~390 kg", "of CO₂ per acre-foot on Utah's grid (0.60 kg/kWh).", CORAL),
    ("0.2%", "of Utah's residential outdoor water equals one ~987 AF/yr data-center campus.", LAWN),
]
for i, (n, label, c) in enumerate(tiles):
    x = 0.75 + i * 4.05
    box(s, x, 2.3, 3.75, 2.9, fill=WHITE, line="cfe6f5", radius=0.08)
    text(s, x + 0.3, 2.55, 3.2, 1.1, n, size=54, font=HEAD, bold=True, color=c, line=0.9)
    text(s, x + 0.3, 3.7, 3.2, 1.4, label, size=17, line=1.15)
text(s, 0.75, 5.5, 11.8, 0.9, [[("Per home it's small (~30 kWh a year). ", {"bold": True}),
                               ("At district and state scale, verified yard savings are how Utah grows AI without draining the lake.", {})]],
     size=18, line=1.15)
source(s, "Sources: EPRI via ACEEE 2009 (650 kWh/AF, range 260–880); EIA Utah profile 2024 (1,322 lb CO₂/MWh); USU Extension citing DWR (500,993 AF/yr); SL Tribune Oct 20 2026 (Stratos estimate). Saved water can increase potential flows to the lake; it may be reused upstream.")
notes(s, "3:40–3:52", """
Water is energy: about 650 kilowatt-hours per acre-foot. And two tenths of a percent of Utah's
yard water equals one entire data-center campus.
""")

# 10. Who pays
s = slide()
named("Who pays")
kicker(s, "Path to reality")
title(s, "Three customers, in order.")
cols = [
    ("1", "Water districts", "sprinkler-solo.png",
     "They already spend on rebate outreach. We hand them a ranked list of the lots with the most lawn to replace and the biggest savings.",
     "Pilot: one district, metered before and after."),
    ("2", "Data centers", "drop.png",
     "EO 2026-03 means new campuses need offsets. We're the lot-by-lot measurement, reporting and verification layer that turns their money into verified acre-feet.",
     "Turf conversions + controller schedules."),
    ("3", "Homeowners", "grass.png",
     "They're the distribution and the ground truth. Every correction they make is a label.",
     "Never ranked, never shared."),
]
for i, (n, head, art, body, foot) in enumerate(cols):
    x = 0.75 + i * 4.05
    box(s, x, 2.15, 3.75, 4.55, fill=WHITE, line="cfe6f5", radius=0.07)
    png(s, ART / art, x + 2.75, 2.35, h=0.95)
    text(s, x + 0.3, 2.35, 2.4, 0.45, n, size=28, font=HEAD, bold=True, color=WATER)
    text(s, x + 0.3, 2.9, 2.6, 0.5, head, size=24, font=HEAD, bold=True)
    text(s, x + 0.3, 3.5, 3.2, 2.3, body, size=15.5, line=1.15)
    text(s, x + 0.3, 5.95, 3.2, 0.65, foot, size=15, bold=True, color=WATER, line=1.05)
source(s, "Districts already named on the site: Central Utah, Jordan Valley, Weber Basin, Washington County, and the statewide program.")
notes(s, "3:52–4:15", """
Who pays? Water districts first: they already spend on rebate outreach, and we hand them the
lots with the most to save, proven with a metered pilot. Then data centers, which now need
offsets: we're the verification layer that turns their money into real acre-feet. Homeowners are
the distribution and the ground truth.
""")

# 11. What $10K unlocks
s = slide()
named("What $10K unlocks")
kicker(s, "The plan")
title(s, "What $10K unlocks.")
budget = [
    ("$3,000", "Every Utah lot, precomputed and hosted", WATER),
    ("$3,000", "Train the lawn segmentation model on app labels + the state's Greenspace data", LAWN),
    ("$2,500", "A district pilot with real meter data, before and after", CORAL),
    ("$1,500", "Controller integrations: Rachio and Hydrawise partner access", GOLD),
]
for i, (amt, what, c) in enumerate(budget):
    y = 2.1 + i * 0.95
    text(s, 0.75, y, 2.0, 0.8, amt, size=32, font=HEAD, bold=True, color=c, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 2.75, y, 5.0, 0.8, what, size=17, anchor=MSO_ANCHOR.MIDDLE, line=1.1)
box(s, 8.25, 2.1, 4.35, 4.4, fill=WHITE, line="cfe6f5", radius=0.07)
text(s, 8.55, 2.3, 3.8, 0.4, "ALREADY IN MOTION", size=14, bold=True, color=WATER)
text(s, 8.55, 2.8, 3.8, 3.6, [
    [("Live at overwater.ing", {"bold": True}), (", any Utah address.", {})],
    [("Utah DWRe GIS ", {"bold": True}), ("shared the state's Greenspace model; we validated against it.", {})],
    [("[Confirm with Adam] ", {"bold": True, "color": CORAL}), ("Outreach to districts and controller makers going out this week.", {})],
], size=16, line=1.15, after=12)
notes(s, "4:15–4:40", """
Ten thousand dollars takes it statewide: every Utah lot precomputed, a trained lawn model, a
district pilot with real meter data, and integrations with the big smart controllers. It's
already live, and the state's GIS team shared their data with us to validate it.
(DRAFT split: Adam to confirm the dollar amounts and the outreach line before presenting.)
""")

# 12. Ask + close
s = slide()
named("The ask")
footer_scene(s)
text(s, 0.75, 0.75, 8.0, 0.4, "THE ASK", size=14, bold=True, color=WATER)
text(s, 0.75, 1.15, 8.2, 1.9, "Type your address at overwater.ing", size=48, font=HEAD, bold=True, line=0.95)
text(s, 0.75, 3.05, 8.0, 1.5, [
    [("$10K ", {"bold": True, "color": WATER}), ("to go statewide and run the first district pilot.", {})],
    [("Intros ", {"bold": True, "color": WATER}), ("to a water district's conservation team and a data-center sustainability lead.", {})],
], size=20, line=1.15, after=8)
png(s, qr("https://overwater.ing"), 9.75, 0.85, w=2.6)
text(s, 9.75, 3.5, 2.6, 0.4, "overwater.ing", size=18, font=HEAD, bold=True, align=PP_ALIGN.CENTER)
notes(s, "4:40–5:00", """
So: ten thousand dollars to go statewide and run a district pilot, and introductions to a water
district and a data-center sustainability team. And right now, take out your phone and type
your address at overwater.ing. Thank you.
""")

# ---------- backup / appendix ----------

s = slide(MIST)
named("Backup")
text(s, 0.75, 2.6, 11.8, 1.2, "Backup: the demo, step by step", size=44, font=HEAD, bold=True)
text(s, 0.75, 3.75, 11.8, 0.8, "If the Wi-Fi fails, click through these instead. Same order as the live demo.", size=20, color=MUTED)
png(s, ART / "sprinkler-off.png", 10.8, 4.6, w=1.4)
notes(s, "backup", "Only if the live demo fails. Each following slide matches one demo step in demo.md.")


def backup(name, head, caption, timing, note, ph=None):
    s = slide()
    named(head)
    text(s, 0.75, 0.4, 11.8, 0.7, head, size=30, font=HEAD, bold=True)
    has = (SHOTS / f"{name}.png").exists() if name else False
    if has and not ph:
        sh = 5.15
        shot(s, name, (W - sh * 1.6) / 2, 1.3, h=sh)
    else:
        placeholder(s, (W - 8.24) / 2, 1.3, 8.24, 5.15, *(ph or ("Screenshot missing", name or "")))
    if caption:
        text(s, 0.75, 6.65, 11.8, 0.6, caption, size=15, color=MUTED, align=PP_ALIGN.CENTER)
    notes(s, timing, note)


backup("02-search", "1 · Any Utah address", "Search covers parcels in all 29 counties.", "demo 1:10",
       "Type 603 E South Temple and pick the first result.")
backup("03-lot", "2 · The lawn, from the air", "2024 USDA imagery at 0.6 m. Green = lawn, dark green = trees, red = buildings. Tap a shape to correct it.",
       "demo 1:20", "11,141 sq ft of lawn on the Governor's Mansion lot, confidence high, about 29 inches and 200,000 gallons a year.")
backup("04-bill-read", "3 · Claude reads the bill", "Twelve months of usage from a photo of the bill, in a few seconds.", "demo 1:45",
       "Upload scripts/fixtures/sample_slc_bill.png. Claude reads twelve months; the page compares outdoor use to the lawn's need.")
backup("05-watering-plan", "4 · One thing to do, and how much it saves", "Spray heads + a basic timer, Salt Lake City weather.", "demo 2:00",
       "The single change with the most gallons saved, then the month-by-month schedule.")
backup("05-watering-schedule", "4 · The schedule", "Days a week and cycle-and-soak minutes per zone, from local reference ET.", "demo 2:05",
       "Deep and infrequent, split into short cycles so it soaks in.")
backup(None, "5 · Subscribe to the watering calendar", None, "demo 2:15",
       "PLACEHOLDER until the calendar ships: subscribe from the watering plan; the calendar follows the state's Weekly Lawn Watering Guide.",
       ph=("Watering calendar", "Screenshot of the subscribe button and a week in Google Calendar, once the calendar feature lands."))
backup(None, "6 · The controller follows the state guide", None, "demo 2:25",
       "PLACEHOLDER until the OpenSprinkler connector ships: the guide says No Watering this week, so the controller pauses itself; switch to a July week and the minutes change.",
       ph=("OpenSprinkler, demo firmware", "Before/after: 'No Watering' week paused, July week with minutes per zone. Lands with connect/."))
backup("07-native", "7 · Go native", "Before and after for this lot, then the plants and designers.", "demo 2:35",
       "About 145,000 gallons a year saved if this lawn becomes water-wise landscape.")
backup("08-rebate", "8 · The rebate, and who's in charge here", "City, water provider, wholesale districts and program for this exact lot.", "demo 2:45",
       "Up to $33,423 from Central Utah Water Conservancy District, Salt Lake City, plus the $100 smart controller rebate.")
backup("09-live", "9 · Any address, measured live", "Outside Salt Lake County, computed in the browser.", "demo 2:55",
       "Any Utah address is measured live in the browser in seconds.",
       ph=None if (SHOTS / "09-live.png").exists() else ("Live lot outside Salt Lake County", "Screenshot pending: the statewide imagery proxy was failing when this deck was built."))
backup("11-district-avenues", "Neighborhood view for districts", "Totals only, never household rankings.", "backup",
       "What a district sees: lawn, need, likely overwatering and savings for a whole neighborhood.")
backup(None, "/impact: statewide, energy and data centers", None, "backup",
       "PLACEHOLDER until /impact ships.", ph=("/impact page", "Statewide totals, energy and data-center framing. Lands with /impact."))

# Sources
s = slide()
named("Sources")
text(s, 0.75, 0.4, 11.8, 0.7, "Sources", size=30, font=HEAD, bold=True)
SOURCES = [
    "~60% of Utah M&I water used outdoors; 500,993 AF/yr residential outdoor: USU Extension citing Utah DWR, extension.usu.edu/climate/research/water-wise-policies-and-programs-utah; DWR GSL Basin M&I report, Aug 2025",
    "96% of M&I depletion is outdoor: USU Institute for Land, Water & Air, 2025, usu.edu/ilwa/reports/2025/utahs-future",
    "About half of Utahns overwater: Sowby, BYU 2022 (aerial imagery + bills)",
    "Great Salt Lake 4,190.4 ft (Aug 2026), healthy range from 4,198 ft: Utah News Dispatch; wre-rapps.utah.gov/GSLApp",
    "471,000–1,055,000 AF/yr more inflow: Great Salt Lake Strategic Plan, greatsaltlake.utah.gov",
    "Data centers may not add GSL depletion: Utah Executive Order 2026-03 (May 29, 2026); reporting ≥75 AF/yr: HB 76 (2026)",
    "48 Utah data centers: Deseret News, Aug 19 2026. Stratos ~987 AF/yr net depletion (project estimate): SL Tribune, Oct 20 2026",
    "Smart controllers save up to 15,000 gal/home/yr: EPA WaterSense",
    "~650 kWh per acre-foot to treat and deliver (260–880): EPRI via ACEEE 2009. Utah grid 0.60 kg CO₂/kWh: EIA 2024",
    "~3M sq ft converted in 2024, >$7M paid: Utah DWR turf buyback results",
    "Our numbers: 12,791 lots, 319 acres of lawn; Greenspace r = 0.77, median ratio 0.97 (84102, 3,104 lots): RESULTS.md Runs 6–7",
]
text(s, 0.75, 1.25, 11.8, 5.9, [[("•  " + t, {})] for t in SOURCES], size=13, line=1.1, after=5)
notes(s, "reference", "Sources for every number in the deck. Saved water can increase potential flows to the lake; it may be reused upstream.")

out = PITCH / "overwatering.pptx"
prs.save(out)
print("wrote", out, f"{out.stat().st_size / 1e6:.1f} MB,", len(prs.slides), "slides")

# ---------- script.md ----------
md = ["# Pitch script: Overwater.ing?", "",
      "Generated by `docs/pitch/tools/build_deck.py` from the same text as the slide notes. Edit it there,",
      "or edit freely here once Adam has the deck in Google Slides. Target: 5:00. Demo click path: `demo.md`.", "",
      "| # | Slide | Time |", "|---|---|---|"]
main = [row for row in SCRIPT if row[2][0].isdigit()]
for n, t, timing, _ in main:
    md.append(f"| {n} | {t} | {timing} |")
md.append("")
for n, t, timing, body in main:
    md += [f"## {timing} · Slide {n}: {t}", "", body, ""]
md += ["## Backup slides", "", "Only if the live demo fails. They follow the demo order.", ""]
for n, t, timing, body in SCRIPT:
    if not timing[0].isdigit():
        md.append(f"- **Slide {n}: {t}** ({timing}). {body}")
(PITCH / "script.md").write_text("\n".join(md) + "\n")
print("wrote script.md")
