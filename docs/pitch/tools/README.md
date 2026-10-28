# Pitch tools

Regenerate everything in `docs/pitch/` from the repo root:

```bash
(cd app && npm ci) && (cd docs/pitch/tools && npm i)
node docs/pitch/tools/art.mjs                 # app SVG art -> docs/pitch/art/*.png (transparent)
node docs/pitch/tools/shots.mjs [name ...]    # live-site screenshots -> docs/pitch/shots/ (1600x1000 @2x)
scripts/opensprinkler-demo.sh && (cd docs/pitch/tools && node opensprinkler.mjs)   # controller before/after shots
uv run --with python-pptx --with pillow --with "qrcode[pil]" python docs/pitch/tools/build_deck.py
docs/pitch/tools/render.sh                    # LibreOffice -> .build/render/slide-NN.png, for checking layout
uv run --with pillow python docs/pitch/tools/sheet.py [slide numbers]
```

`build_deck.py` writes `overwatering.pptx`, `script.md` and `demo.md` (from `demo.template.md`), so the
speaker notes, script and click path always match. `shots.mjs` also records the demo lot's live numbers
in `shots/facts.json` (lawn, need, rebate, native savings, bill gap, this week's guide line); the deck
quotes those. Shared corrections on the demo lot change them, so rerun both before the pitch. Both scripts use the preinstalled Google Chrome (`channel: 'chrome'`).
Rendering needs the Fredoka and Nunito TTFs in `~/.local/share/fonts` (from github.com/google/fonts).

The OpenSprinkler UI loads from ui.opensprinkler.com, whose Cloudflare blocks the HeadlessChrome
user agent (403 on its assets), so `opensprinkler.mjs` sends a desktop Chrome one.
