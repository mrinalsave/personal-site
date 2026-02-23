#!/bin/bash

GIF_DIR="./assets/images/gifs"
OUTPUT_FILE="./assets/data/gifs.json"

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "[" > "$OUTPUT_FILE"

first=true
for file in "$GIF_DIR"/*.gif; do
    filename=$(basename "$file")

    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$OUTPUT_FILE"
    fi

    echo "  \"$filename\"" >> "$OUTPUT_FILE"
done

echo "]" >> "$OUTPUT_FILE"

echo "gifs.json generated successfully."