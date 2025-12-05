#!/bin/bash
# Update all README files with consistent structure and master index links
# Updates root README and all package READMEs

set -euo pipefail

PROJECT_ROOT="/home/deflex/noa-server"
CATALOG_FILE="${PROJECT_ROOT}/docs/.catalog.json"
TIMESTAMP=$(date "+%Y-%m-%d")

echo "📚 Updating all README files..."
echo ""

# Check if catalog exists
if [[ ! -f "${CATALOG_FILE}" ]]; then
    echo "❌ Error: Documentation catalog not found at ${CATALOG_FILE}"
    echo "   Run scan-docs.sh first to generate catalog."
    exit 1
fi

# Escape content for safe insertion in sed replacement blocks
escape_sed_replacement() {
    printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

# Function to add/update master index link
add_master_index_link() {
    local readme_file="$1"
    local link_text="📚 [Master Documentation Index](docs/INDEX.md)"
    local escaped_link_text

    # Check if link already exists
    if ! grep -q "Master Documentation Index" "$readme_file" 2>/dev/null; then
        # Add at the beginning after title
        if grep -q '^#' "$readme_file"; then
            # Insert after first heading
            escaped_link_text="$(escape_sed_replacement "$link_text")"
            sed -i "0,/^#.*$/s//&\n\n${escaped_link_text}\n/" "$readme_file"
        else
            # Prepend to file
            echo -e "${link_text}\n" | cat - "$readme_file" > "$readme_file.tmp"
            mv "$readme_file.tmp" "$readme_file"
        fi
        echo "  ✅ Added master index link to: $readme_file"
    fi
}

# Function to add/update last updated timestamp
update_timestamp() {
    local readme_file="$1"

    # Remove existing timestamp
    sed -i '/^> Last updated:/d' "$readme_file"

    # Add new timestamp at end
    echo "" >> "$readme_file"
    echo "> Last updated: ${TIMESTAMP}" >> "$readme_file"

    echo "  ✅ Updated timestamp in: $readme_file"
}

# Function to validate and fix internal links
validate_links() {
    local readme_file="$1"
    local dir
    dir=$(dirname "$readme_file")
    local broken_links=0

    # Extract all markdown links
    while IFS= read -r link; do
        # Clean link path
        link_path=$(echo "$link" | grep -oE '\([^)]*\)' | tr -d '()')

        # Skip external links
        if [[ "$link_path" =~ ^https?:// ]] || [[ "$link_path" =~ ^mailto: ]]; then
            continue
        fi

        # Resolve relative path
        if [[ "$link_path" = /* ]]; then
            # Absolute path from project root
            full_path="${PROJECT_ROOT}${link_path}"
        else
            # Relative path
            full_path="${dir}/${link_path}"
        fi

        # Check if file exists
        if [[ ! -f "$full_path" ]]; then
            echo "  ⚠️  Broken link in $readme_file: $link_path"
            ((broken_links++)) || true
        fi
    done < <(grep -oE '\[.*\]\([^)]*\)' "$readme_file" 2>/dev/null || true)

    return $broken_links
}

# Update root README
echo "🔧 Updating root README..."
ROOT_README="${PROJECT_ROOT}/README.md"

if [[ -f "${ROOT_README}" ]]; then
    add_master_index_link "${ROOT_README}"
    update_timestamp "${ROOT_README}"
    validate_links "${ROOT_README}" || true
else
    echo "  ⚠️  Root README not found, creating..."
    cat > "${ROOT_README}" <<'EOF'
# NOA Server

📚 [Master Documentation Index](docs/INDEX.md)

## Overview

NOA Server is a comprehensive AI infrastructure platform with multi-agent orchestration, neural processing, and cloud deployment capabilities.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build
```

## Documentation

- [Master Documentation Index](docs/INDEX.md) - Complete documentation hub
- [Architecture Overview](docs/ARCHITECTURE.md) - System architecture
- [API Documentation](docs/API_DOCS.md) - API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions
- [Testing Guide](docs/TESTING.md) - Testing documentation

## Project Structure

```
noa-server/
├── packages/          # Individual packages
├── docs/              # Documentation
├── scripts/           # Utility scripts
├── tests/             # E2E and integration tests
└── .claude/           # Claude Code configuration
```

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development workflow and guidelines.

## License

See [LICENSE](LICENSE) file for details.

> Last updated: TIMESTAMP
EOF
    sed -i "s/TIMESTAMP/${TIMESTAMP}/" "${ROOT_README}"
    echo "  ✅ Created root README"
fi

echo ""

# Update package READMEs
echo "🔧 Updating package READMEs..."
total_packages=0
updated_packages=0

while IFS= read -r package_dir; do
    ((total_packages++)) || true
    package_name=$(basename "$package_dir")
    package_readme="${package_dir}/README.md"

    if [[ ! -f "${package_readme}" ]]; then
        echo "  📝 Creating README for package: ${package_name}"

        # Create basic README structure
        cat > "${package_readme}" <<EOF
# @noa/${package_name}

📚 [Master Documentation Index](../../docs/INDEX.md)

## Description

Package description for ${package_name}.

## Installation

\`\`\`bash
pnpm add @noa/${package_name}
\`\`\`

## Usage

\`\`\`typescript
import { /* exports */ } from '@noa/${package_name}';

// Usage examples
\`\`\`

## API Reference

See [API Documentation](../../docs/api/${package_name}.md) for detailed API reference.

## Related Documentation

- [Master Documentation Index](../../docs/INDEX.md)
- [Architecture Overview](../../docs/ARCHITECTURE.md)
- [Contributing Guide](../../docs/CONTRIBUTING.md)

## Contributing

See [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for development workflow.

> Last updated: ${TIMESTAMP}
EOF
        ((updated_packages++)) || true
    else
        add_master_index_link "${package_readme}"
        update_timestamp "${package_readme}"
        validate_links "${package_readme}" || true
        ((updated_packages++)) || true
    fi
done < <(find "${PROJECT_ROOT}/packages" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)

echo ""
echo "✅ Updated ${updated_packages} of ${total_packages} package READMEs"
echo ""
echo "📊 Summary:"
echo "  - Root README: Updated"
echo "  - Package READMEs: ${updated_packages}"
echo "  - Timestamp: ${TIMESTAMP}"
echo ""
echo "🎉 README update complete!"
