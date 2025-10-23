#!/bin/bash
# Deterministic Node.js bootstrapper.
# Installs/pins Node LTS into .runtime/node and writes .nvmrc.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
NODE_VERSION="${NODE_VERSION:-20.17.0}"
NODE_DISTRO="${NODE_DISTRO:-linux-x64}"
ARCHIVE_NAME="node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz"
DOWNLOAD_URL="https://nodejs.org/dist/v${NODE_VERSION}/${ARCHIVE_NAME}"
INSTALL_DIR="$RUNTIME_DIR/node-v${NODE_VERSION}"
PINNED_NODE_BIN="$RUNTIME_DIR/node-current/bin/node"
PINNED_NPM_BIN="$RUNTIME_DIR/node-current/bin/npm"
BIN_DIR="$INSTALL_DIR/bin"

mkdir -p "$RUNTIME_DIR"
echo "$NODE_VERSION" > "$ROOT_DIR/.nvmrc"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  echo "[$(timestamp)] [bootstrap_node] $1"
}

if command -v node >/dev/null 2>&1; then
  CURRENT="$(node -v | sed 's/^v//')"
else
  CURRENT=""
fi

if [[ -x "$PINNED_NODE_BIN" ]]; then
  INSTALLED_VERSION="$($PINNED_NODE_BIN -v | sed 's/^v//')"
else
  INSTALLED_VERSION=""
fi

if [[ "$CURRENT" == "$NODE_VERSION" ]] || [[ "$INSTALLED_VERSION" == "$NODE_VERSION" ]]; then
  log "Node ${NODE_VERSION} already available."
  exit 0
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log "Downloading Node.js ${NODE_VERSION} from ${DOWNLOAD_URL}"
curl --fail --location --output "$TMP_DIR/${ARCHIVE_NAME}" "$DOWNLOAD_URL"

log "Extracting archive to ${INSTALL_DIR}"
tar -xJf "$TMP_DIR/${ARCHIVE_NAME}" -C "$RUNTIME_DIR"

# Node archives unpack as node-vX.Y.Z-linux-x64
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

log "Pinned Node.js ${NODE_VERSION} at ${INSTALL_DIR}"
log "Add ${BIN_DIR} to your PATH or source scripts/runtime/use_node.sh"
