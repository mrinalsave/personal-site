#!/bin/bash

set -e

INPUT_DIR="assets/images/cards/original"
THUMBNAIL_DIR="assets/images/cards/thumbnail"
FULLSIZE_DIR="assets/images/cards/fullsize"
MANIFEST="cards.json"

echo "Cleaning old builds..."
rm -rf "$THUMBNAIL_DIR" "$FULLSIZE_DIR"
mkdir -p "$THUMBNAIL_DIR" "$FULLSIZE_DIR"

echo "Processing images..."

for img in "$INPUT_DIR"/*; do
  filename=$(basename "$img")
  name="${filename%.*}"

  # Generate thumbnail (500px height max).
  magick "$img" \
    -resize x500 \
    -quality 90 \
    "$THUMBNAIL_DIR/$name.webp"

  # Generate fullsize version (1000px height max).
  magick "$img" \
    -resize x1000 \
    -quality 90 \
    "$FULLSIZE_DIR/$name.webp"

  echo "✔ $name processed"
done

echo "Generating cards.json..."

ls "$THUMBNAIL_DIR" \
  | sort \
  | jq -R -s -c 'split("\n")[:-1]' > "$MANIFEST"

echo "Done!"