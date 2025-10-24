#!/bin/bash
# Documentation Scanner - Catalog all markdown files across NOA Server
# Output: docs/.catalog.json with metadata for 8000+ markdown files

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
OUTPUT_FILE="${PROJECT_ROOT}/docs/.catalog.json"
TEMP_FILE="/tmp/doc-catalog-$$.json"

echo "🔍 Scanning NOA Server documentation..."
echo "📁 Project root: ${PROJECT_ROOT}"
echo ""

# Initialize JSON structure
cat > "${TEMP_FILE}" <<'EOF'
{
  "metadata": {
    "scan_date": "",
    "total_files": 0,
    "total_lines": 0,
    "total_words": 0,
    "categories": {}
  },
  "files": []
}
EOF

# Function to get file category
get_category() {
    local filepath="$1"

    case "$filepath" in
        */packages/*/docs/*) echo "package-docs" ;;
        */packages/*/README.md) echo "package-readme" ;;
        */docs/api/*) echo "api-docs" ;;
        */docs/architecture/*) echo "architecture" ;;
        */docs/onboarding/*) echo "onboarding" ;;
        */docs/runbooks/*) echo "runbooks" ;;
        */docs/testing/*) echo "testing" ;;
        */docs/deployment/*) echo "deployment" ;;
        */docs/monitoring/*) echo "monitoring" ;;
        */.claude/*) echo "claude-config" ;;
        */docs/*) echo "general-docs" ;;
        */README.md) echo "readme" ;;
        *) echo "other" ;;
    esac
}

# Function to extract title from markdown
get_title() {
    local file="$1"
    # Extract first # heading
    grep -m 1 '^#' "$file" 2>/dev/null | sed 's/^#* *//' || basename "$file" .md
}

# Function to extract dependencies (links to other docs)
get_dependencies() {
    local file="$1"
    local deps=$(grep -oE '\[.*\]\([^)]*\.md\)' "$file" 2>/dev/null | grep -oE '\([^)]*\.md\)' | tr -d '()' | sort -u || echo "")
    if [[ -z "$deps" ]]; then
        echo '[]'
    else
        echo "$deps" | jq -R -s -c 'split("\n") | map(select(length > 0))'
    fi
}

# Initialize counters
total_files=0
total_lines=0
total_words=0

# Temporary array file
ARRAY_FILE="/tmp/doc-array-$$.json"
echo "[]" > "${ARRAY_FILE}"

# Find and process all markdown files
echo "📊 Processing markdown files..."
while IFS= read -r file; do
    ((total_files++)) || true

    # Get file metadata
    category=$(get_category "$file")
    title=$(get_title "$file")
    rel_path="${file#${PROJECT_ROOT}/}"
    lines=$(wc -l < "$file" 2>/dev/null || echo 0)
    words=$(wc -w < "$file" 2>/dev/null || echo 0)
    modified=$(stat -c %Y "$file" 2>/dev/null || echo 0)
    modified_date=$(date -d "@${modified}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "unknown")
    dependencies=$(get_dependencies "$file")

    total_lines=$((total_lines + lines))
    total_words=$((total_words + words))

    # Create JSON entry
    entry=$(jq -n \
        --arg path "$rel_path" \
        --arg abs_path "$file" \
        --arg title "$title" \
        --arg category "$category" \
        --argjson lines "$lines" \
        --argjson words "$words" \
        --arg modified "$modified_date" \
        --argjson dependencies "$dependencies" \
        '{
            path: $path,
            absolute_path: $abs_path,
            title: $title,
            category: $category,
            lines: $lines,
            words: $words,
            last_modified: $modified,
            dependencies: $dependencies
        }')

    # Append to array
    jq --argjson entry "$entry" '. += [$entry]' "${ARRAY_FILE}" > "${ARRAY_FILE}.tmp"
    mv "${ARRAY_FILE}.tmp" "${ARRAY_FILE}"

    # Progress indicator
    if (( total_files % 100 == 0 )); then
        echo "  Processed ${total_files} files..."
    fi
done < <(find "${PROJECT_ROOT}" -type f -name "*.md" 2>/dev/null | sort)

echo ""
echo "✅ Processed ${total_files} markdown files"
echo "📝 Total lines: ${total_lines}"
echo "📖 Total words: ${total_words}"
echo ""

# Calculate category statistics
echo "📊 Generating category statistics..."
category_stats=$(jq -r '.[] | .category' "${ARRAY_FILE}" | sort | uniq -c | awk '{printf "{\"name\":\"%s\",\"count\":%d},", $2, $1}' | sed 's/,$//')

# Assemble final JSON
jq -n \
    --arg scan_date "$(date -u +"%Y-%m-%d %H:%M:%S UTC")" \
    --argjson total_files "$total_files" \
    --argjson total_lines "$total_lines" \
    --argjson total_words "$total_words" \
    --argjson files "$(cat "${ARRAY_FILE}")" \
    --argjson categories "[${category_stats}]" \
    '{
        metadata: {
            scan_date: $scan_date,
            total_files: $total_files,
            total_lines: $total_lines,
            total_words: $total_words,
            categories: ($categories | map({(.name): .count}) | add)
        },
        files: $files
    }' > "${OUTPUT_FILE}"

echo "✅ Documentation catalog saved to: ${OUTPUT_FILE}"
echo ""
echo "📊 Category Breakdown:"
jq -r '.metadata.categories | to_entries | .[] | "  \(.key): \(.value)"' "${OUTPUT_FILE}" | sort -t: -k2 -rn

# Cleanup
rm -f "${TEMP_FILE}" "${ARRAY_FILE}"

echo ""
echo "🎉 Documentation scan complete!"
