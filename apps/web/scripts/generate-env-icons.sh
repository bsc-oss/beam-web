#!/bin/bash
# PG_CHANGED: generate environment-specific PWA/favicon icon sets.
#
# The production icons live in res/vector-icons/. For the DEV, TST and ACC
# environments we draw the environment name next to the "b" stem of the logo,
# matching the launcher icons of the Beam Android app
# (pg-android/appicon/element/src/{dev,tst,acc}).
#
# Only the icons an installed app uses are branded, so no favicon.ico is
# produced here: every environment keeps the production favicon, which is too
# small to carry a readable label.
#
# The generated icons are committed to the repo so that neither CI nor the
# Docker build needs ImageMagick. Re-run this script whenever the production
# icons change:
#
#   apps/web/scripts/generate-env-icons.sh
#
# Requires ImageMagick 7 (`brew install imagemagick`).

set -euo pipefail

cd "$(dirname "$0")/.."

SRC_DIR="res/vector-icons"
FONT="res/fonts/Nunito/Nunito-Bold.ttf"

# <target directory suffix>:<label>:<colour>. The colours are taken from the logo
# itself: the navy of the "b" and the yellow and red of the Belgian flag.
ENVIRONMENTS=(
    "dev:DEV:#282830"
    "tst:TST:#F9B66B"
    "acc:BETA:#E61B55"
)

# Colour of the thin outline drawn around the letters, as the Android icons do. It is the navy of
# the logo, so it is only visible on the labels that are not navy themselves, exactly like there.
OUTLINE_COLOUR="#282830"
# Stroke widths at the point size the label is rendered at, before it is scaled down. The inner one
# thickens Nunito Bold to match the heavier face the Android launcher icons use; the outer one is
# that plus the outline.
LABEL_STROKE=10
OUTLINE_STROKE=22

# Cap height of the label, as a multiple of the width of the "b" stem.
CAP_RATIO=0.95
# Gap between the stem and the label, as a fraction of the icon width.
GAP_RATIO=0.012

if ! command -v magick >/dev/null 2>&1; then
    echo "error: ImageMagick 7 (\`magick\`) is required, install it with \`brew install imagemagick\`" >&2
    exit 1
fi

# Prints "<first> <last>" for the non-white pixels of one row of an icon, so the
# label can be anchored off the actual artwork rather than off hardcoded offsets
# (the icons are not all laid out on the same grid).
row_extent() { # <file> <width> <y>
    magick "$1" -background white -alpha remove -alpha off -crop "${2}x1+0+${3}" +repage txt:- |
        awk -F'[,:]' '
            NR > 1 {
                split($0, pixel, ": ")
                if (pixel[2] !~ /^\(2[45][0-9],2[45][0-9],2[45][0-9]/) {
                    if (first == "") first = $1
                    last = $1
                }
            }
            END { if (first != "") print first, last }
        '
}

for entry in "${ENVIRONMENTS[@]}"; do
    IFS=":" read -r suffix label colour <<<"$entry"
    out_dir="${SRC_DIR}-${suffix}"

    rm -rf "$out_dir"
    mkdir -p "$out_dir"

    for src in "$SRC_DIR"/*.png; do
        name="$(basename "$src")"
        read -r width height <<<"$(magick identify -format "%w %h" "$src")"

        # The topmost and leftmost pixel of the artwork both belong to the stem of
        # the "b", so the trimmed bounding box gives us the top left of the stem.
        read -r stem_left stem_top <<<"$(
            magick "$src" -background white -alpha remove -alpha off -fuzz 4% -trim \
                -format "%X %Y" info: | tr -d '+'
        )"
        # Measure a couple of rows down to skip the anti-aliased top edge.
        probe_y=$((stem_top + height / 32 + 1))
        read -r _ stem_right <<<"$(row_extent "$src" "$width" "$probe_y")"

        stem_width=$((stem_right - stem_left + 1))
        cap_height=$(awk -v w="$stem_width" -v r="$CAP_RATIO" 'BEGIN { printf "%d", (w * r) + 0.5 }')
        label_x=$(awk -v x="$stem_right" -v w="$width" -v g="$GAP_RATIO" 'BEGIN { printf "%d", x + (w * g) + 0.5 }')

        # Render the label large and scale it down to the wanted cap height, so the result does
        # not depend on the font's ascender/descender metrics. The outline and the letters are two
        # `annotate` passes over one canvas of a fixed size, which keeps them aligned; drawing each
        # into its own `label:` would size the two canvases differently.
        magick -size 2000x800 xc:none -gravity center -font "$FONT" -pointsize 400 \
            -fill "$OUTLINE_COLOUR" -stroke "$OUTLINE_COLOUR" -strokewidth "$OUTLINE_STROKE" \
            -annotate 0 "$label" \
            -fill "$colour" -stroke "$colour" -strokewidth "$LABEL_STROKE" \
            -annotate 0 "$label" \
            -trim +repage -resize "x${cap_height}" "png:-" |
            magick "$src" "png:-" -geometry "+${label_x}+${stem_top}" -composite \
                -depth 8 -strip "$out_dir/$name"
    done

    echo "generated $out_dir"
done
