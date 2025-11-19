#!/bin/bash
# Deterministic & integrity-verified Node.js bootstrapper.
# - Pins Node into .runtime/node-current
# - Writes .nvmrc with the target version
# - Verifies archive SHA256 (from official SHASUMS256 or env override)
# - Emits integrity manifest (.runtime/node-integrity.json)
# Environment variables:
#   NODE_VERSION            (default 20.17.0)
#   NODE_DISTRO             (default linux-x64)
#   NODE_ARCHIVE_SHA256     (optional expected SHA256 value; skips remote SHASUMS fetch)
#   FORCE_REINSTALL=1       (forces re-download/reinstall even if version present)
#   SKIP_DOWNLOAD=1         (skip download; only verify existing install & manifest)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
NODE_VERSION="${NODE_VERSION:-20.17.0}"
NODE_DISTRO="${NODE_DISTRO:-linux-x64}"
ARCHIVE_NAME="node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz"
DOWNLOAD_URL="https://nodejs.org/dist/v${NODE_VERSION}/${ARCHIVE_NAME}"
SHASUMS_URL="https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
INTEGRITY_FILE="$RUNTIME_DIR/node-integrity.json"
CACHE_ARCHIVE="$RUNTIME_DIR/${ARCHIVE_NAME}"
INSTALL_DIR="$RUNTIME_DIR/node-v${NODE_VERSION}"
PINNED_NODE_BIN="$RUNTIME_DIR/node-current/bin/node"
BIN_DIR="$INSTALL_DIR/bin"

mkdir -p "$RUNTIME_DIR"
echo "$NODE_VERSION" > "$ROOT_DIR/.nvmrc"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(timestamp)] [bootstrap_node] $1"; }
fail() { echo "[$(timestamp)] [bootstrap_node][ERROR] $1" >&2; exit 1; }

current_global_version() { command -v node >/dev/null 2>&1 && node -v | sed 's/^v//' || true; }
current_pinned_version() { [[ -x "$PINNED_NODE_BIN" ]] && "$PINNED_NODE_BIN" -v | sed 's/^v//' || true; }

PINNED_VERSION="$(current_pinned_version || true)"

# Fast-path skip if already installed & integrity manifest present (unless FORCE_REINSTALL)
if [[ -z "${FORCE_REINSTALL:-}" ]] && [[ -x "$PINNED_NODE_BIN" ]] && [[ "$PINNED_VERSION" == "$NODE_VERSION" ]] && [[ -f "$INTEGRITY_FILE" ]]; then
  if grep -q '"verified": true' "$INTEGRITY_FILE" 2>/dev/null; then
    log "Node ${NODE_VERSION} already installed with verified integrity. Skipping."
    exit 0
  else
    log "Integrity file present but not verified. Reinstalling..."
  fi
fi

if [[ -n "${SKIP_DOWNLOAD:-}" ]]; then
  if [[ ! -x "$PINNED_NODE_BIN" ]]; then
    fail "SKIP_DOWNLOAD set but pinned Node not found."
  fi
  log "SKIP_DOWNLOAD set; skipping download."
else
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT
  log "Downloading Node.js ${NODE_VERSION} from ${DOWNLOAD_URL}"
  curl --fail --location --output "$TMP_DIR/${ARCHIVE_NAME}" "$DOWNLOAD_URL" || fail "Download failed"

  # Obtain expected SHA256
  if [[ -n "${NODE_ARCHIVE_SHA256:-}" ]]; then
    EXPECTED_SHA256="$NODE_ARCHIVE_SHA256"
    log "Using provided NODE_ARCHIVE_SHA256=${EXPECTED_SHA256}"
  else
    log "Fetching SHASUMS256.txt from ${SHASUMS_URL}"
    curl --fail --location --output "$TMP_DIR/SHASUMS256.txt" "$SHASUMS_URL" || fail "Failed to fetch SHASUMS256.txt"
    EXPECTED_SHA256="$(grep " ${ARCHIVE_NAME}$" "$TMP_DIR/SHASUMS256.txt" | awk '{print $1}')"
    [[ -n "$EXPECTED_SHA256" ]] || fail "Could not extract expected SHA256 for ${ARCHIVE_NAME}"
  fi

  ACTUAL_SHA256="$(sha256sum "$TMP_DIR/${ARCHIVE_NAME}" | awk '{print $1}')"
  if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
    cat >"$INTEGRITY_FILE" <<JSON
{
  "node_version": "$NODE_VERSION",
  "download_url": "$DOWNLOAD_URL",
  "archive_name": "$ARCHIVE_NAME",
  "expected_sha256": "$EXPECTED_SHA256",
  "actual_sha256": "$ACTUAL_SHA256",
  "verified": false,
  "generated_at": "$(timestamp)",
  "error": "SHA256 mismatch"
}
JSON
    fail "SHA256 mismatch for ${ARCHIVE_NAME}. Expected $EXPECTED_SHA256 got $ACTUAL_SHA256"
  fi
  log "SHA256 verified: $ACTUAL_SHA256"

  # Extract
  log "Extracting archive to ${INSTALL_DIR}"
  tar -xJf "$TMP_DIR/${ARCHIVE_NAME}" -C "$RUNTIME_DIR"
  set +o pipefail
  EXTRACTED_ENTRY="$(tar -tf "$TMP_DIR/${ARCHIVE_NAME}" | head -1)"
  set -o pipefail
  EXTRACTED_ENTRY="${EXTRACTED_ENTRY%%/}"
  EXTRACTED_PATH="$RUNTIME_DIR/${EXTRACTED_ENTRY}"
  if [[ ! -x "$INSTALL_DIR/bin/node" ]]; then
    INSTALL_DIR="$EXTRACTED_PATH"
  fi
  BIN_DIR="$INSTALL_DIR/bin"
  ln -snf "$INSTALL_DIR" "$RUNTIME_DIR/node-current"
  # Persist archive for offline re-verification
  cp "$TMP_DIR/${ARCHIVE_NAME}" "$CACHE_ARCHIVE"

  cat >"$INTEGRITY_FILE" <<JSON
{
  "node_version": "$NODE_VERSION",
  "download_url": "$DOWNLOAD_URL",
  "archive_name": "$ARCHIVE_NAME",
  "expected_sha256": "$EXPECTED_SHA256",
  "actual_sha256": "$ACTUAL_SHA256",
  "verified": true,
  "generated_at": "$(timestamp)",
  "install_dir": "$INSTALL_DIR"
}
JSON
fi

PINNED_VERSION_AFTER="$(current_pinned_version || true)"
[[ "$PINNED_VERSION_AFTER" == "$NODE_VERSION" ]] || fail "Pinned node version mismatch after install (got $PINNED_VERSION_AFTER)"

log "Pinned Node.js ${NODE_VERSION} at ${INSTALL_DIR} (verified)"
log "Integrity manifest: ${INTEGRITY_FILE}"
log "Add ${BIN_DIR} to PATH or: source scripts/runtime/use_node.sh"
