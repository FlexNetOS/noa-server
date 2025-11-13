#!/bin/bash
# Add table of contents to large documentation files (>500 lines)
# Generates TOC with markdown anchor links

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
MIN_LINES=500

echo "📑 Adding table of contents to large documentation files..."
echo "📏 Minimum file size: ${MIN_LINES} lines"
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found"
    exit 1
fi

# Function to generate TOC anchor
generate_anchor() {
    local heading="$1"
    echo "$heading" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 -]//g' | tr ' ' '-' | sed 's/--*/-/g'
}

# Function to generate TOC for file
generate_toc() {
    local file="$1"
    local toc=""
    local heading=""
    local level=""
    local anchor=""
    local indent=""

    # Extract headings (# to ####)
    while IFS= read -r line; do
        # Count # characters
        level=$(echo "$line" | grep -oE '^#+' | tr -d '\n' | wc -c)

        # Skip level 1 (title)
        if [[ $level -eq 1 ]]; then
            continue
        fi

        # Extract heading text
        heading=$(echo "$line" | sed 's/^#* *//' | sed 's/ *$//')

        # Generate anchor
        anchor=$(generate_anchor "$heading")

        # Generate indentation (2 spaces per level minus 2)
        indent=$(printf '%*s' $((($level - 2) * 2)) '' | tr ' ' ' ')

        # Add to TOC
        toc="${toc}${indent}- [${heading}](#${anchor})\n"
    done < <(grep -E '^#{2,4} ' "$file" 2>/dev/null || true)

    echo -e "$toc"
}

# Function to add TOC to file
add_toc_to_file() {
    local file="$1"

    # Check if TOC already exists
    if grep -q "<!-- TOC -->" "$file" 2>/dev/null || grep -q "## Table of Contents" "$file" 2>/dev/null; then
        echo "  ℹ️  TOC already exists, regenerating..."

        # Remove existing TOC (between <!-- TOC --> and <!-- /TOC --> or between "## Table of Contents" and next ##)
        sed -i '/<!-- TOC -->/,/<!-- \/TOC -->/d' "$file" 2>/dev/null || true
        sed -i '/^## Table of Contents$/,/^## /{ /^## Table of Contents$/d; /^## /!d; }' "$file" 2>/dev/null || true
    fi

    # Generate TOC
    toc=$(generate_toc "$file")

    if [[ -z "$toc" ]]; then
        echo "  ⚠️  No headings found, skipping: $file"
        return
    fi

    # Find position to insert (after first heading)
    temp_file="${file}.toc.tmp"
    inserted=false

    while IFS= read -r line; do
        echo "$line" >> "$temp_file"

        # Insert after first # heading
        if [[ "$line" =~ ^#[^#] ]] && [[ "$inserted" == false ]]; then
            echo "" >> "$temp_file"
            echo "<!-- TOC -->" >> "$temp_file"
            echo "## Table of Contents" >> "$temp_file"
            echo "" >> "$temp_file"
            echo -e "$toc" >> "$temp_file"
            echo "<!-- /TOC -->" >> "$temp_file"
            echo "" >> "$temp_file"
            inserted=true
        fi
    done < "$file"

    # Replace original file
    mv "$temp_file" "$file"

    echo "  ✅ Added TOC to: $file"
}

# Process files from catalog
files_processed=0
files_updated=0

while IFS= read -r file_entry; do
    filepath=$(echo "$file_entry" | jq -r '.absolute_path')
    lines=$(echo "$file_entry" | jq -r '.lines')

    # Skip files smaller than threshold
    if [[ $lines -lt $MIN_LINES ]]; then
        continue
    fi

    ((files_processed++)) || true

    # Check if file exists
    if [[ ! -f "$filepath" ]]; then
        echo "  ⚠️  File not found: $filepath"
        continue
    fi

    # Add TOC
    add_toc_to_file "$filepath"
    ((files_updated++)) || true

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo ""
echo "✅ Processed ${files_processed} large files"
echo "📑 Added/updated TOC in ${files_updated} files"
echo ""
echo "🎉 TOC generation complete!"
