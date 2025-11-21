#!/bin/bash
# Build searchable documentation index
# Output: docs/.search-index.json (lunr.js compatible)

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
INDEX_FILE="${PROJECT_ROOT}/docs/.search-index.json"

echo "🔎 Building searchable documentation index..."
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found"
    exit 1
fi

# Initialize search index
cat > "${INDEX_FILE}" <<'EOF'
{
  "version": "1.0.0",
  "generated": "",
  "total_documents": 0,
  "documents": []
}
EOF

# Function to extract keywords from file
extract_keywords() {
    local file="$1"

    # Extract headings and first paragraph
    {
        grep '^#' "$file" 2>/dev/null | sed 's/^#* *//' || true
        head -20 "$file" | grep -v '^#' | head -5 || true
    } | tr '[:upper:]' '[:lower:]' | \
      grep -oE '\w+' | \
      grep -v '^[0-9]*$' | \
      sort | uniq -c | sort -rn | head -20 | \
      awk '{print $2}' | \
      jq -R -s -c 'split("\n") | map(select(length > 0))'
}

# Function to extract headings
extract_headings() {
    local file="$1"
    grep '^#' "$file" 2>/dev/null | sed 's/^#* *//' | jq -R -s -c 'split("\n") | map(select(length > 0))' || echo '[]'
}

# Function to extract first paragraph
extract_summary() {
    local file="$1"

    # Find first non-heading, non-empty paragraph
    awk '
        /^#/ { next }
        /^$/ { next }
        /^```/ { in_code = !in_code; next }
        in_code { next }
        /^[A-Za-z]/ { print; found=1 }
        found { exit }
    ' "$file" | head -c 200 | sed 's/$/.../'
}

echo "📊 Processing documentation files..."
total_docs=0
TEMP_ARRAY="/tmp/search-index-$$.json"
echo "[]" > "${TEMP_ARRAY}"

while IFS= read -r file_entry; do
    filepath=$(echo "$file_entry" | jq -r '.absolute_path')
    rel_path=$(echo "$file_entry" | jq -r '.path')
    title=$(echo "$file_entry" | jq -r '.title')
    category=$(echo "$file_entry" | jq -r '.category')

    ((total_docs++)) || true

    # Extract metadata
    keywords=$(extract_keywords "$filepath")
    headings=$(extract_headings "$filepath")
    summary=$(extract_summary "$filepath")

    # Create document entry
    doc=$(jq -n \
        --arg id "$total_docs" \
        --arg path "$rel_path" \
        --arg title "$title" \
        --arg category "$category" \
        --arg summary "$summary" \
        --argjson keywords "$keywords" \
        --argjson headings "$headings" \
        '{
            id: $id,
            path: $path,
            title: $title,
            category: $category,
            summary: $summary,
            keywords: $keywords,
            headings: $headings
        }')

    # Append to array
    jq --argjson doc "$doc" '. += [$doc]' "${TEMP_ARRAY}" > "${TEMP_ARRAY}.tmp"
    mv "${TEMP_ARRAY}.tmp" "${TEMP_ARRAY}"

    if (( total_docs % 100 == 0 )); then
        echo "  Indexed ${total_docs} documents..."
    fi

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo ""
echo "✅ Indexed ${total_docs} documents"

# Assemble final index
jq -n \
    --arg version "1.0.0" \
    --arg generated "$(date -u +"%Y-%m-%d %H:%M:%S UTC")" \
    --argjson total "$total_docs" \
    --argjson documents "$(cat "${TEMP_ARRAY}")" \
    '{
        version: $version,
        generated: $generated,
        total_documents: $total,
        documents: $documents
    }' > "${INDEX_FILE}"

echo "📄 Search index saved to: ${INDEX_FILE}"
echo "📊 Index size: $(du -h "${INDEX_FILE}" | cut -f1)"

# Cleanup
rm -f "${TEMP_ARRAY}"

echo ""
echo "🎉 Search index build complete!"
