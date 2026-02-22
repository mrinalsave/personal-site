#!/bin/bash

set -e

INPUT_DIR="cards/original"
THUMBS_DIR="cards/thumbnail"
FULL_DIR="cards/fullsize"
MANIFEST="../cards.json"

echo "Cleaning old builds..."
rm -rf "$THUMBS_DIR" "$FULL_DIR"
mkdir -p "$THUMBS_DIR" "$FULL_DIR"

echo "Processing images..."

for img in "$INPUT_DIR"/*; do
  filename=$(basename "$img")
  name="${filename%.*}"

  # Generate thumbnail (400px height max)
  magick "$img" \
    -resize x400 \
    -quality 90 \
    "$THUMBS_DIR/$name.webp"

  # Generate full version (1000px height max)
  magick "$img" \
    -resize x1000 \
    -quality 88 \
    "$FULL_DIR/$name.webp"

  echo "✔ $name processed"
done

echo "Generating cards.json..."

ls "$THUMBS_DIR" \
  | sort \
  | jq -R -s -c 'split("\n")[:-1]' > "$MANIFEST"

echo "Done!"