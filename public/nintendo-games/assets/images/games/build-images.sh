#!/bin/bash

# Input directory (default: current directory)
INPUT_DIR="${1:-.}"

# Output directory
OUTPUT_DIR="${INPUT_DIR}/webp_output"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Loop through all .jpeg files
for file in "$INPUT_DIR"/*.jpeg; do
    # Skip if no files found
    [ -e "$file" ] || continue

    # Extract filename without extension
    filename=$(basename "$file" .jpeg)

    # Output file path
    output_file="$OUTPUT_DIR/${filename}.webp"

    # Resize and convert
    magick "$file" -resize 300x300^ -gravity center -extent 300x300 "$output_file"

    echo "Processed: $file -> $output_file"
done

echo "Done!"