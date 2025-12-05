#!/usr/bin/env bash
# validate-task-canonical.sh
# Guardrail: ensure canonical task docs exist only under .orchestration/docs
# and verify their SHA-256 hashes against baseline.
# Fails CI if duplicates reappear or hashes drift without update.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOC_DIR="${REPO_ROOT}/.orchestration/docs"
BASELINE_FILE="${DOC_DIR}/HASHES.txt"
CANONICAL=(current.todo backlog.todo sop.md sot.md)
DUPLICATES=(current.todo backlog.todo SOP.md SOT.md sop.md sot.md)

error() { echo "[ERROR] $*" >&2; }
info()  { echo "[INFO] $*"; }

missing=0
for f in "${CANONICAL[@]}"; do
  if [[ ! -f "${DOC_DIR}/${f}" ]]; then
    error "Missing canonical file: ${DOC_DIR}/${f}"
    missing=1
  fi
done

for f in "${DUPLICATES[@]}"; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    error "Duplicate file present at repo root: ${f}"
    missing=1
  fi
done

if [[ ! -f "${BASELINE_FILE}" ]]; then
  error "Baseline hash file missing: ${BASELINE_FILE}"
  missing=1
fi

# Hash verification
if [[ -f "${BASELINE_FILE}" ]]; then
  info "Verifying hashes against baseline..."
  while read -r hash path; do
    [[ -z "${hash}" || -z "${path}" ]] && continue
    # Normalize path (baseline stores full relative path including directory)
    FILE_PATH="${REPO_ROOT}/${path}"
    if [[ ! -f "${FILE_PATH}" ]]; then
      error "Baseline entry missing file: ${path}"
      missing=1
      continue
    fi
    actual="$(sha256sum "${FILE_PATH}" | awk '{print $1}')"
    if [[ "${actual}" != "${hash}" ]]; then
      error "Hash mismatch for ${path}: baseline=${hash} current=${actual}"
      missing=1
    else
      info "Hash OK: ${path}"
    fi
  done < <(grep -E '^[0-9a-f]{64} +' "${BASELINE_FILE}")
fi

if [[ ${missing} -ne 0 ]]; then
  error "Task canonical verification FAILED"
  exit 1
fi

info "Task canonical verification PASSED"
