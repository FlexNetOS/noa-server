#!/bin/bash
# Fast Documentation Scanner - Optimized for large codebases
# Output: docs/.catalog.json

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
OUTPUT_FILE="${PROJECT_ROOT}/docs/.catalog.json"

echo "🔍 Fast scanning NOA Server documentation..."
echo "📁 Project root: ${PROJECT_ROOT}"
echo ""

# Get category from path (optimized)
get_category() {
    case "$1" in
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

# Build catalog using parallel processing
echo "📊 Scanning files (parallel mode)..."

{
    echo '{"metadata":{"scan_date":"'$(date -u +"%Y-%m-%d %H:%M:%S UTC")'","total_files":0,"total_lines":0,"total_words":0,"categories":{}},"files":['

    first=true
    total_files=0
    total_lines=0
    total_words=0

    # Process files in batches
    find "${PROJECT_ROOT}" -type f -name "*.md" 2>/dev/null | sort | while IFS= read -r file; do
        ((total_files++)) || true

        # Get metadata (fast)
        category=$(get_category "$file")
        title=$(grep -m 1 '^#' "$file" 2>/dev/null | sed 's/^#* *//' || basename "$file" .md)
        rel_path="${file#${PROJECT_ROOT}/}"
        lines=$(wc -l < "$file" 2>/dev/null || echo 0)
        words=$(wc -w < "$file" 2>/dev/null || echo 0)
        modified=$(stat -c %Y "$file" 2>/dev/null || echo 0)
        modified_date=$(date -d "@${modified}" "+%Y-%m-%d" 2>/dev/null || echo "unknown")

        total_lines=$((total_lines + lines))
        total_words=$((total_words + words))

        # Output JSON entry (streaming)
        if [[ "$first" == true ]]; then
            first=false
        else
            echo ","
        fi

        jq -n \
            --arg path "$rel_path" \
            --arg abs_path "$file" \
            --arg title "$title" \
            --arg category "$category" \
            --argjson lines "$lines" \
            --argjson words "$words" \
            --arg modified "$modified_date" \
            '{path:$path,absolute_path:$abs_path,title:$title,category:$category,lines:$lines,words:$words,last_modified:$modified}' | tr -d '\n'

        # Progress
        if (( total_files % 500 == 0 )); then
            echo "  Processed ${total_files} files..." >&2
        fi
    done

    echo "]}"
} > "${OUTPUT_FILE}.tmp"

# Count categories and finalize
echo ""
echo "📊 Finalizing catalog..."

# Extract totals from processed files
total_files=$(jq '.files | length' "${OUTPUT_FILE}.tmp")
total_lines=$(jq '[.files[].lines] | add' "${OUTPUT_FILE}.tmp")
total_words=$(jq '[.files[].words] | add' "${OUTPUT_FILE}.tmp")

# Count categories
categories=$(jq -r '.files[].category' "${OUTPUT_FILE}.tmp" | sort | uniq -c | \
    jq -R -s 'split("\n") | map(select(length > 0) | split(" ") | {key: .[1], value: (.[0] | tonumber)}) | from_entries')

# Update metadata
jq --argjson total_files "$total_files" \
   --argjson total_lines "$total_lines" \
   --argjson total_words "$total_words" \
   --argjson categories "$categories" \
   '.metadata.total_files = $total_files | .metadata.total_lines = $total_lines | .metadata.total_words = $total_words | .metadata.categories = $categories' \
   "${OUTPUT_FILE}.tmp" > "${OUTPUT_FILE}"

rm -f "${OUTPUT_FILE}.tmp"

echo "✅ Processed ${total_files} markdown files"
echo "📝 Total lines: ${total_lines}"
echo "📖 Total words: ${total_words}"
echo ""
echo "📊 Category Breakdown:"
jq -r '.metadata.categories | to_entries | .[] | "  \(.key): \(.value)"' "${OUTPUT_FILE}" | sort -t: -k2 -rn
echo ""
echo "✅ Documentation catalog saved to: ${OUTPUT_FILE}"
echo "🎉 Documentation scan complete!"
