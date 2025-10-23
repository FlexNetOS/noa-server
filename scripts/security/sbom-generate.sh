#!/bin/bash

###############################################################################
# SBOM (Software Bill of Materials) Generator
#
# Generates comprehensive SBOM documents in multiple formats (SPDX, CycloneDX)
# for supply chain security and compliance tracking.
#
# Usage: ./sbom-generate.sh [options]
#   Options:
#     --format=<spdx|cyclonedx|both>  SBOM format (default: both)
#     --output-dir=<path>              Output directory (default: logs/sbom)
#     --include-dev                    Include development dependencies
#     --sign                           Sign SBOM with GPG key
#     --help                           Show this help message
###############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
FORMAT="both"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/logs/sbom"
INCLUDE_DEV=false
SIGN_SBOM=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --format=*)
      FORMAT="${arg#*=}"
      shift
      ;;
    --output-dir=*)
      OUTPUT_DIR="${arg#*=}"
      shift
      ;;
    --include-dev)
      INCLUDE_DEV=true
      shift
      ;;
    --sign)
      SIGN_SBOM=true
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +3
      exit 0
      ;;
    *)
      ;;
  esac
done

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Create output directory
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$PROJECT_ROOT" || exit 1

# Detect package manager
detect_package_manager() {
  if [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "package-lock.json" ]; then
    echo "npm"
  else
    echo "npm"
  fi
}

PACKAGE_MANAGER=$(detect_package_manager)

# Check for SBOM tools
check_tools() {
  local missing_tools=()

  if [ "$FORMAT" = "spdx" ] || [ "$FORMAT" = "both" ]; then
    if ! command -v syft &> /dev/null; then
      missing_tools+=("syft")
    fi
  fi

  if [ "$FORMAT" = "cyclonedx" ] || [ "$FORMAT" = "both" ]; then
    if ! command -v cyclonedx-npm &> /dev/null && [ "$PACKAGE_MANAGER" = "npm" ]; then
      log_warning "cyclonedx-npm not found. Installing locally..."
      npm install -g @cyclonedx/cyclonedx-npm || missing_tools+=("cyclonedx-npm")
    fi
  fi

  if [ ${#missing_tools[@]} -gt 0 ]; then
    log_warning "Missing SBOM tools: ${missing_tools[*]}"
    log_info "Install instructions:"

    for tool in "${missing_tools[@]}"; do
      case $tool in
        syft)
          echo "  - Syft: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh"
          ;;
        cyclonedx-npm)
          echo "  - CycloneDX: npm install -g @cyclonedx/cyclonedx-npm"
          ;;
      esac
    done

    return 1
  fi

  return 0
}

# Generate SPDX SBOM
generate_spdx() {
  log_info "Generating SPDX SBOM..."

  local output_file="$OUTPUT_DIR/sbom-spdx-$TIMESTAMP.json"

  if command -v syft &> /dev/null; then
    syft "$PROJECT_ROOT" \
      -o spdx-json="$output_file" \
      --scope all-layers

    if [ $? -eq 0 ]; then
      log_success "SPDX SBOM generated: $output_file"

      # Also generate SPDX in tag-value format
      local tv_output="$OUTPUT_DIR/sbom-spdx-$TIMESTAMP.spdx"
      syft "$PROJECT_ROOT" \
        -o spdx="$tv_output" \
        --scope all-layers

      if [ "$SIGN_SBOM" = true ]; then
        sign_sbom "$output_file"
        sign_sbom "$tv_output"
      fi

      return 0
    else
      log_error "Failed to generate SPDX SBOM"
      return 1
    fi
  else
    log_error "Syft not installed"
    return 1
  fi
}

# Generate CycloneDX SBOM
generate_cyclonedx() {
  log_info "Generating CycloneDX SBOM..."

  local output_file="$OUTPUT_DIR/sbom-cyclonedx-$TIMESTAMP.json"
  local output_xml="$OUTPUT_DIR/sbom-cyclonedx-$TIMESTAMP.xml"

  case $PACKAGE_MANAGER in
    npm)
      if command -v cyclonedx-npm &> /dev/null; then
        local dev_flag=""
        if [ "$INCLUDE_DEV" = false ]; then
          dev_flag="--omit=dev"
        fi

        cyclonedx-npm --output-file "$output_file" $dev_flag

        if [ $? -eq 0 ]; then
          log_success "CycloneDX SBOM (JSON) generated: $output_file"

          # Also generate XML format
          cyclonedx-npm --output-format XML --output-file "$output_xml" $dev_flag

          if [ "$SIGN_SBOM" = true ]; then
            sign_sbom "$output_file"
            sign_sbom "$output_xml"
          fi

          return 0
        else
          log_error "Failed to generate CycloneDX SBOM"
          return 1
        fi
      else
        log_error "cyclonedx-npm not installed"
        return 1
      fi
      ;;
    *)
      log_warning "CycloneDX generation not yet supported for $PACKAGE_MANAGER"
      return 1
      ;;
  esac
}

# Sign SBOM with GPG
sign_sbom() {
  local file="$1"

  if command -v gpg &> /dev/null; then
    log_info "Signing SBOM: $(basename "$file")"
    gpg --detach-sign --armor "$file"

    if [ $? -eq 0 ]; then
      log_success "Signature created: $file.asc"
    else
      log_error "Failed to sign SBOM"
    fi
  else
    log_warning "GPG not installed, skipping signature"
  fi
}

# Generate metadata file
generate_metadata() {
  local metadata_file="$OUTPUT_DIR/sbom-metadata-$TIMESTAMP.json"

  cat > "$metadata_file" <<EOF
{
  "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project": {
    "name": "noa-server",
    "root": "$PROJECT_ROOT",
    "packageManager": "$PACKAGE_MANAGER"
  },
  "sbom": {
    "format": "$FORMAT",
    "includeDev": $INCLUDE_DEV,
    "signed": $SIGN_SBOM
  },
  "files": [
EOF

  local files=()
  for file in "$OUTPUT_DIR"/sbom-*-"$TIMESTAMP".*; do
    if [ -f "$file" ]; then
      local filename=$(basename "$file")
      local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
      files+=("    {\"name\": \"$filename\", \"size\": $size}")
    fi
  done

  # Join array with commas
  printf '%s\n' "${files[@]}" | paste -sd ',' >> "$metadata_file"

  cat >> "$metadata_file" <<EOF

  ],
  "statistics": {
    "totalComponents": $(count_components),
    "formats": $(list_formats)
  }
}
EOF

  log_success "Metadata generated: $metadata_file"
}

count_components() {
  # Count components from generated SBOMs
  local count=0
  for file in "$OUTPUT_DIR"/sbom-*-"$TIMESTAMP".json; do
    if [ -f "$file" ]; then
      local file_count=$(jq -r '.components | length // .packages | length // 0' "$file" 2>/dev/null || echo "0")
      count=$((count + file_count))
    fi
  done
  echo $count
}

list_formats() {
  local formats=()
  [ -f "$OUTPUT_DIR"/sbom-spdx-"$TIMESTAMP".json ] && formats+=("\"spdx-json\"")
  [ -f "$OUTPUT_DIR"/sbom-spdx-"$TIMESTAMP".spdx ] && formats+=("\"spdx\"")
  [ -f "$OUTPUT_DIR"/sbom-cyclonedx-"$TIMESTAMP".json ] && formats+=("\"cyclonedx-json\"")
  [ -f "$OUTPUT_DIR"/sbom-cyclonedx-"$TIMESTAMP".xml ] && formats+=("\"cyclonedx-xml\"")

  echo "[$(IFS=,; echo "${formats[*]}")]"
}

# Main execution
main() {
  log_info "Starting SBOM generation..."
  log_info "Format: $FORMAT"
  log_info "Output directory: $OUTPUT_DIR"
  log_info "Package manager: $PACKAGE_MANAGER"

  if ! check_tools; then
    log_error "Required tools not available. Please install them first."
    exit 1
  fi

  local success=true

  case $FORMAT in
    spdx)
      generate_spdx || success=false
      ;;
    cyclonedx)
      generate_cyclonedx || success=false
      ;;
    both)
      generate_spdx || success=false
      generate_cyclonedx || success=false
      ;;
    *)
      log_error "Invalid format: $FORMAT"
      exit 1
      ;;
  esac

  if [ "$success" = true ]; then
    generate_metadata

    echo ""
    echo "================================"
    echo "SBOM Generation Summary"
    echo "================================"
    echo "Timestamp: $(date)"
    echo "Format: $FORMAT"
    echo "Output: $OUTPUT_DIR"
    echo ""
    echo "Generated files:"
    ls -lh "$OUTPUT_DIR"/sbom-*-"$TIMESTAMP".*
    echo ""

    log_success "SBOM generation completed successfully"
  else
    log_error "SBOM generation completed with errors"
    exit 1
  fi
}

# Run main
main

exit 0
