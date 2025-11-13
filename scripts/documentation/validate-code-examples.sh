#!/bin/bash
# Validate code examples in documentation
# Checks syntax for TypeScript, JavaScript, and Bash code blocks

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
REPORT_FILE="${PROJECT_ROOT}/docs/CODE_VALIDATION_REPORT.md"

echo "🔍 Validating code examples in documentation..."
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found"
    exit 1
fi

# Initialize counters
total_blocks=0
valid_blocks=0
invalid_blocks=0
unlabeled_blocks=0

# Initialize report
cat > "${REPORT_FILE}" <<EOF
# Code Example Validation Report

Generated: $(date "+%Y-%m-%d %H:%M:%S")

## Summary

- Total code blocks: TBD
- Valid code blocks: TBD
- Invalid code blocks: TBD
- Unlabeled code blocks: TBD

## Issues Found

EOF

# Temporary files
TEMP_DIR="/tmp/code-validation-$$"
mkdir -p "${TEMP_DIR}"

ISSUES_FILE="${TEMP_DIR}/issues.txt"
touch "${ISSUES_FILE}"

# Function to validate TypeScript/JavaScript
validate_ts_js() {
    local code="$1"
    local temp_file="${TEMP_DIR}/temp.ts"

    echo "$code" > "$temp_file"

    # Try to parse with Node.js
    if node -c "$temp_file" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to validate Bash
validate_bash() {
    local code="$1"
    local temp_file="${TEMP_DIR}/temp.sh"

    echo "$code" > "$temp_file"

    # Check bash syntax
    if bash -n "$temp_file" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to extract and validate code blocks from file
validate_file() {
    local filepath="$1"
    local in_code_block=false
    local code_lang=""
    local code_content=""
    local line_num=0
    local block_start=0

    while IFS= read -r line; do
        ((line_num++)) || true

        # Detect code block start
        if [[ "$line" =~ ^\`\`\`(.*)$ ]]; then
            if [[ "$in_code_block" == false ]]; then
                # Start of code block
                in_code_block=true
                code_lang="${BASH_REMATCH[1]}"
                code_content=""
                block_start=$line_num
                ((total_blocks++)) || true
            else
                # End of code block
                in_code_block=false

                # Validate based on language
                valid=true
                reason=""

                if [[ -z "$code_lang" ]]; then
                    ((unlabeled_blocks++)) || true
                    echo "UNLABELED|${filepath}|${block_start}|No language specified" >> "${ISSUES_FILE}"
                    valid=false
                    reason="No language label"
                elif [[ "$code_lang" =~ ^(typescript|ts|javascript|js)$ ]]; then
                    if ! validate_ts_js "$code_content"; then
                        ((invalid_blocks++)) || true
                        echo "INVALID|${filepath}|${block_start}|${code_lang}|Syntax error" >> "${ISSUES_FILE}"
                        valid=false
                        reason="Syntax error"
                    fi
                elif [[ "$code_lang" =~ ^(bash|sh|shell)$ ]]; then
                    if ! validate_bash "$code_content"; then
                        ((invalid_blocks++)) || true
                        echo "INVALID|${filepath}|${block_start}|${code_lang}|Syntax error" >> "${ISSUES_FILE}"
                        valid=false
                        reason="Syntax error"
                    fi
                fi

                if [[ "$valid" == true ]] && [[ -n "$code_lang" ]]; then
                    ((valid_blocks++)) || true
                fi

                # Reset
                code_lang=""
                code_content=""
            fi
        elif [[ "$in_code_block" == true ]]; then
            # Accumulate code content
            code_content="${code_content}${line}\n"
        fi
    done < "$filepath"
}

# Process all markdown files
echo "📊 Processing documentation files..."
files_processed=0

while IFS= read -r file_entry; do
    filepath=$(echo "$file_entry" | jq -r '.absolute_path')

    ((files_processed++)) || true

    if (( files_processed % 100 == 0 )); then
        echo "  Processed ${files_processed} files..."
    fi

    validate_file "$filepath"

done < <(jq -c '.files[]' "${CATALOG_FILE}")

echo ""
echo "✅ Processed ${files_processed} files"
echo "📦 Total code blocks: ${total_blocks}"
echo "✅ Valid code blocks: ${valid_blocks}"
echo "❌ Invalid code blocks: ${invalid_blocks}"
echo "⚠️  Unlabeled code blocks: ${unlabeled_blocks}"
echo ""

# Generate issues report
if [[ $invalid_blocks -gt 0 ]] || [[ $unlabeled_blocks -gt 0 ]]; then
    echo "### Invalid Code Blocks" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"

    while IFS='|' read -r status source_file line_num lang reason; do
        rel_source="${source_file#${PROJECT_ROOT}/}"

        if [[ "$status" == "INVALID" ]]; then
            echo "#### \`${rel_source}\` (line ${line_num})" >> "${REPORT_FILE}"
            echo "" >> "${REPORT_FILE}"
            echo "- **Language**: \`${lang}\`" >> "${REPORT_FILE}"
            echo "- **Issue**: ${reason}" >> "${REPORT_FILE}"
            echo "" >> "${REPORT_FILE}"
        fi
    done < <(grep '^INVALID' "${ISSUES_FILE}" 2>/dev/null || true)

    echo "### Unlabeled Code Blocks" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"

    while IFS='|' read -r status source_file line_num reason; do
        rel_source="${source_file#${PROJECT_ROOT}/}"

        echo "#### \`${rel_source}\` (line ${line_num})" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
        echo "- **Issue**: ${reason}" >> "${REPORT_FILE}"
        echo "- **Recommendation**: Add language identifier (e.g., \`\`\`typescript)" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
    done < <(grep '^UNLABELED' "${ISSUES_FILE}" 2>/dev/null || true)

    echo "## Recommendations" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "1. Fix syntax errors in code examples" >> "${REPORT_FILE}"
    echo "2. Add language labels to all code blocks" >> "${REPORT_FILE}"
    echo "3. Test code examples before committing" >> "${REPORT_FILE}"
    echo "4. Use linters on code examples" >> "${REPORT_FILE}"
else
    echo "✅ All code blocks are valid and labeled!" >> "${REPORT_FILE}"
fi

# Update summary
sed -i "s/Total code blocks: TBD/Total code blocks: ${total_blocks}/" "${REPORT_FILE}"
sed -i "s/Valid code blocks: TBD/Valid code blocks: ${valid_blocks}/" "${REPORT_FILE}"
sed -i "s/Invalid code blocks: TBD/Invalid code blocks: ${invalid_blocks}/" "${REPORT_FILE}"
sed -i "s/Unlabeled code blocks: TBD/Unlabeled code blocks: ${unlabeled_blocks}/" "${REPORT_FILE}"

echo "📄 Report saved to: ${REPORT_FILE}"

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo "🎉 Code validation complete!"

# Exit with warning if issues found
if [[ $invalid_blocks -gt 0 ]] || [[ $unlabeled_blocks -gt 0 ]]; then
    exit 1
fi
