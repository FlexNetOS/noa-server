#!/usr/bin/env bash
# update-doc-hashes.sh
# Recompute SHA-256 baseline for canonical task system artifacts.
# Writes to .orchestration/docs/HASHES.txt

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOC_DIR="${REPO_ROOT}/.orchestration/docs"
BASELINE_FILE="${DOC_DIR}/HASHES.txt"
TMP_FILE="${BASELINE_FILE}.tmp"

CANONICAL=(
  "current.todo"
  "backlog.todo"
  "sop.md"
  "sot.md"
)

if [[ ! -d "${DOC_DIR}" ]]; then
  echo "[ERROR] Canonical docs directory not found: ${DOC_DIR}" >&2
  exit 1
fi

# Build header
{
  echo "# SHA-256 baseline for canonical task system artifacts"
  echo "# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# Update with scripts/ci/update-doc-hashes.sh when intentional changes are made."
  echo
} > "${TMP_FILE}"

# Compute hashes deterministically in fixed order
for f in "${CANONICAL[@]}"; do
  FILE_PATH="${DOC_DIR}/${f}"
  if [[ ! -f "${FILE_PATH}" ]]; then
    echo "[ERROR] Missing canonical file: ${FILE_PATH}" >&2
    rm -f "${TMP_FILE}"
    exit 1
  fi
  hash=$(sha256sum "${FILE_PATH}" | awk '{print $1}')
  rel_path=".orchestration/docs/${f}"
  echo "${hash}  ${rel_path}" >> "${TMP_FILE}"
  echo "[INFO] ${f}: ${hash}"
done

# Replace baseline only if changed
if [[ -f "${BASELINE_FILE}" ]] && cmp -s "${TMP_FILE}" "${BASELINE_FILE}"; then
  echo "[INFO] No changes detected in HASHES.txt"
  rm -f "${TMP_FILE}"
else
  mv "${TMP_FILE}" "${BASELINE_FILE}"
  echo "[INFO] Updated ${BASELINE_FILE}"
fi

# Optional: verify with guardrail if present
if [[ -x "${REPO_ROOT}/scripts/ci/validate-task-canonical.sh" ]]; then
  echo "[INFO] Running guardrail verification..."
  "${REPO_ROOT}/scripts/ci/validate-task-canonical.sh" || true
fi
