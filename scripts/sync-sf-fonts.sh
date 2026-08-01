#!/usr/bin/env bash
# Sync + Latin-subset SF Pro / Rounded / Mono from the local Apple fonts folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${SF_FONTS_SRC:-$HOME/Documents/apple-san-francisco-pro-fonts}"
DEST="$ROOT/public/fonts/sf"
UNICODES="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD"

if [[ ! -d "$SRC" ]]; then
  echo "Font source not found: $SRC"
  echo "Set SF_FONTS_SRC to your apple-san-francisco-pro-fonts directory."
  exit 1
fi

if ! command -v pyftsubset >/dev/null 2>&1; then
  echo "pyftsubset required (pip install fonttools brotli)"
  exit 1
fi

mkdir -p "$DEST"

convert() {
  local in="$1" out="$2"
  echo "→ $(basename "$out")"
  pyftsubset "$in" \
    --flavor=woff2 \
    --output-file="$out" \
    --unicodes="$UNICODES" \
    --layout-features="kern,liga,calt" \
    --desubroutinize \
    >/dev/null
}

convert "$SRC/SF-Pro-Text-Regular.otf" "$DEST/SF-Pro-Text-Regular.woff2"
convert "$SRC/SF-Pro-Text-Medium.otf" "$DEST/SF-Pro-Text-Medium.woff2"
convert "$SRC/SF-Pro-Text-Semibold.otf" "$DEST/SF-Pro-Text-Semibold.woff2"
convert "$SRC/SF-Pro-Text-Bold.otf" "$DEST/SF-Pro-Text-Bold.woff2"
convert "$SRC/SF-Pro-Display-Semibold.otf" "$DEST/SF-Pro-Display-Semibold.woff2"
convert "$SRC/SF-Pro-Display-Bold.otf" "$DEST/SF-Pro-Display-Bold.woff2"
convert "$SRC/SF-Pro-Rounded-Regular.otf" "$DEST/SF-Pro-Rounded-Regular.woff2"
convert "$SRC/SF-Pro-Rounded-Medium.otf" "$DEST/SF-Pro-Rounded-Medium.woff2"
convert "$SRC/SF-Pro-Rounded-Semibold.otf" "$DEST/SF-Pro-Rounded-Semibold.woff2"
convert "$SRC/SF-Pro-Rounded-Bold.otf" "$DEST/SF-Pro-Rounded-Bold.woff2"
convert "$SRC/SF-Mono-Regular.otf" "$DEST/SF-Mono-Regular.woff2"
convert "$SRC/SF-Mono-Medium.otf" "$DEST/SF-Mono-Medium.woff2"

du -sh "$DEST"
echo "Done. Import in apps via: import '../fonts/sf.css' (from src/) or './fonts/sf.css'"
