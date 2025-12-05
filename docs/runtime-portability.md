# Runtime Portability and Self-Contained Setup

This repository supports a portable, self-contained runtime:
- Node.js pinned under `.runtime/node-current` with cryptographic integrity verification
- Python virtual environment under `.venv`
- Evidence artifacts to aid repeatability and audits

## Quick start

- Pin and verify Node, set up Python, and record versions:

  Optional: export overrides
  - NODE_VERSION (default: 20.17.0)
  - NODE_DISTRO (default: linux-x64)
  - NODE_ARCHIVE_SHA256 (to pin to a specific checksum)
  - FORCE_REINSTALL=1 (force re-download even if present)

  ./scripts/runtime/setup_all.sh

- Use the pinned Node in your shell:

  source scripts/runtime/use_node.sh
  node -v

## Integrity verification

The Node bootstrap script downloads the official archive and verifies its SHA-256.
- Source: https://nodejs.org/dist/v<version>/SHASUMS256.txt
- Override: set NODE_ARCHIVE_SHA256 to avoid network lookup

Outputs an integrity manifest at `.runtime/node-integrity.json`:

{
  "node_version": "20.17.0",
  "download_url": "https://nodejs.org/dist/v20.17.0/node-v20.17.0-linux-x64.tar.xz",
  "archive_name": "node-v20.17.0-linux-x64.tar.xz",
  "expected_sha256": "<hex>",
  "actual_sha256": "<hex>",
  "verified": true,
  "generated_at": "<UTC ISO8601>",
  "install_dir": "/abs/path/.runtime/node-v20.17.0-linux-x64"
}

If the checksum does not match, bootstrap will fail and emit the manifest with verified=false.

We also retain the downloaded archive as `.runtime/node-v<version>-<distro>.tar.xz` for offline re-verification.

## Python environment

- Creates `.venv` using your system `python3` (configurable via `PYTHON_BIN`)
- Installs `requirements.txt` if present

To activate manually:

  source .venv/bin/activate

## Evidence and reproducibility

- Node integrity manifest: `.runtime/node-integrity.json`
- Runtime version ledger: `EvidenceLedger/runtime.json`

Regenerate versions ledger:

  ./scripts/runtime/record_versions.sh

## CI integration

A dedicated workflow ensures bootstrap integrity on changes to runtime scripts. It will:
- Run the Node bootstrap (with checksum verification)
- Assert the integrity manifest reports verified=true

## Troubleshooting

- Check network access: the bootstrap fetches from nodejs.org unless NODE_ARCHIVE_SHA256 is provided
- Set FORCE_REINSTALL=1 to re-download after changing configuration
- Ensure `sha256sum` is available (Linux) or install coreutils on macOS for equivalent tooling
