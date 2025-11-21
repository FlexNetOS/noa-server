#!/bin/bash
# Validate all internal documentation links
# Generates report of broken links

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
REPORT_FILE="${PROJECT_ROOT}/docs/LINK_VALIDATION_REPORT.md"

echo "🔗 Validating documentation links..."
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found"
    exit 1
fi

# Initialize counters
total_links=0
valid_links=0
broken_links=0
external_links=0

# Initialize report
cat > "${REPORT_FILE}" <<EOF
# Documentation Link Validation Report

Generated: $(date "+%Y-%m-%d %H:%M:%S")

## Summary

- Total links checked: TBD
- Valid links: TBD
- Broken links: TBD
- External links (not checked): TBD

## Broken Links

EOF

# Temporary file for broken links
BROKEN_LINKS_FILE="/tmp/broken-links-$$.txt"
touch "${BROKEN_LINKS_FILE}"

# Function to check if link is valid
check_link() {
    local source_file="$1"
    local link_path="$2"
    local source_dir=$(dirname "$source_file")

    # Skip external links
    if [[ "$link_path" =~ ^https?:// ]] || [[ "$link_path" =~ ^mailto: ]] || [[ "$link_path" =~ ^ftp:// ]]; then
        ((external_links++)) || true
        return 0
    fi

    # Skip anchors only
    if [[ "$link_path" =~ ^# ]]; then
        return 0
    fi

    # Remove anchor from path
    link_path="${link_path%%#*}"

    # Resolve path
    if [[ "$link_path" = /* ]]; then
        # Absolute from project root
        full_path="${PROJECT_ROOT}${link_path}"
    else
        # Relative to source file
        full_path="${source_dir}/${link_path}"
    fi

    # Normalize path
    full_path=$(realpath -m "$full_path" 2>/dev/null || echo "$full_path")

    # Check if file exists
    if [[ -f "$full_path" ]] || [[ -d "$full_path" ]]; then
        ((valid_links++)) || true
        return 0
    else
        ((broken_links++)) || true
        echo "BROKEN|${source_file}|${link_path}|${full_path}" >> "${BROKEN_LINKS_FILE}"
        return 1
    fi
}

# Process all files
echo "🔍 Scanning documentation files..."
files_scanned=0

while IFS= read -r file_entry; do
    filepath=$(echo "$file_entry" | jq -r '.absolute_path')

    ((files_scanned++)) || true

    if (( files_scanned % 100 == 0 )); then
        echo "  Scanned ${files_scanned} files..."
    fi

    # Extract all markdown links
    while IFS= read -r link; do
        ((total_links++)) || true

        # Extract link path
        link_path=$(echo "$link" | grep -oE '\([^)]*\)' | tr -d '()')

        # Check link
        check_link "$filepath" "$link_path" || true

    done < <(grep -oE '\[.*?\]\([^)]*\)' "$filepath" 2>/dev/null || true)

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo ""
echo "✅ Scanned ${files_scanned} files"
echo "🔗 Total links: ${total_links}"
echo "✅ Valid links: ${valid_links}"
echo "❌ Broken links: ${broken_links}"
echo "🌐 External links: ${external_links}"
echo ""

# Generate broken links report
if [[ $broken_links -gt 0 ]]; then
    echo "### By Source File" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"

    while IFS='|' read -r status source_file link_path full_path; do
        rel_source="${source_file#${PROJECT_ROOT}/}"
        echo "#### \`${rel_source}\`" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
        echo "- **Broken link**: \`${link_path}\`" >> "${REPORT_FILE}"
        echo "- **Resolved to**: \`${full_path}\`" >> "${REPORT_FILE}"
        echo "- **Reason**: File not found" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
    done < <(sort -t'|' -k2 "${BROKEN_LINKS_FILE}")

    echo "## Recommendations" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "1. Review and fix broken links in the listed files" >> "${REPORT_FILE}"
    echo "2. Consider creating missing documentation files" >> "${REPORT_FILE}"
    echo "3. Update links to reflect current file structure" >> "${REPORT_FILE}"
    echo "4. Run this validation script regularly" >> "${REPORT_FILE}"
else
    echo "✅ No broken links found!" >> "${REPORT_FILE}"
fi

# Update summary in report
sed -i "s/Total links checked: TBD/Total links checked: ${total_links}/" "${REPORT_FILE}"
sed -i "s/Valid links: TBD/Valid links: ${valid_links}/" "${REPORT_FILE}"
sed -i "s/Broken links: TBD/Broken links: ${broken_links}/" "${REPORT_FILE}"
sed -i "s/External links (not checked): TBD/External links (not checked): ${external_links}/" "${REPORT_FILE}"

echo "📄 Report saved to: ${REPORT_FILE}"

# Cleanup
rm -f "${BROKEN_LINKS_FILE}"

echo ""
echo "🎉 Link validation complete!"

# Exit with error if broken links found
if [[ $broken_links -gt 0 ]]; then
    exit 1
fi
