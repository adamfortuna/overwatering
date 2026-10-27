#!/usr/bin/env bash
# Render overwatering.pptx to one PNG per slide (LibreOffice headless + pdftoppm) for checking
# layout. Output: docs/pitch/tools/.build/render/slide-NN.png (gitignored), plus a contact sheet.
set -euo pipefail
cd "$(dirname "$0")"
OUT=.build/render
rm -rf "$OUT" && mkdir -p "$OUT"
SOFFICE=$(command -v soffice || ls /opt/libreoffice*/program/soffice | head -1)
"$SOFFICE" --headless --convert-to pdf --outdir "$OUT" ../overwatering.pptx >/dev/null
pdftoppm -r 96 -png "$OUT/overwatering.pdf" "$OUT/slide"
ls "$OUT"/slide-*.png | wc -l
