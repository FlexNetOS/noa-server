# RTT Installation Guide

Complete installation instructions for all supported platforms.

## System Requirements

### Minimum Requirements

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+, Arch), macOS 11+, or WSL2
- **Python**: 3.8 or higher
- **RAM**: 512 MB minimum, 2 GB recommended
- **Disk**: 100 MB for RTT core, 500 MB with native components
- **CPU**: x86_64 or ARM64

### Optional Components

- **Rust**: 1.70+ (for native planner, fabric, signers, ViewFS)
- **Go**: 1.19+ (for Go signer)
- **Node.js**: 18+ (for Node.js drivers)
- **pnpm**: 8.0+ (for Node.js workspace)
- **Docker**: 20.10+ (for containerized deployment)
- **Kubernetes**: 1.24+ (for orchestrated deployment)

---

## Installation Steps

These steps assume you are in the RTT project root (for example the `rtt/` directory that
contains `rtt-prd.md`, `auto/`, and `Makefile`).

### 1. Create a Python virtual environment (recommended)

```bash
python3 -m venv .venv
source .venv/bin/activate
```

If you prefer, you can also use your existing Python environment, but isolating RTT
dependencies via a virtual environment is recommended for reproducibility.

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
# or, equivalently:
make install
```

The `Makefile` target simply installs the packages listed in `requirements.txt` (`pyyaml`
and `jsonschema`).

### 3. (Optional) Build native components

If you have the Rust and Go toolchains installed and want the native planner, fabric, and
signing helpers, you can build them via:

```bash
make build
```

This target compiles the Rust crates under `fabric/shm`, `planner/rtt_planner_rs`,
`tools/rtt_sign_rs`, and the Go signer under `tools/rtt_sign_go`. Any missing toolchains
will be skipped with a non-fatal message.

### 4. Initialize RTT state

Run the bootstrap script once to create the `.rtt/` directories and initial configuration:

```bash
python auto/00-bootstrap.py
```

After this step you should see `.rtt/` populated with `panel.yaml`, `policy.json`,
`routes.json`, and the runtime subdirectories referenced in the PRD.

---

## Verification

### Quick smoke test

To quickly verify that the core automation pipeline and CAS tooling are wired up, run:

```bash
make test
```

This runs the bootstrap and core automation scripts (`auto/00`–`50`) and exercises the
CAS ingest/pack tools. It may take a few minutes on the first run.

If you prefer to step through manually:

```bash
python auto/00-bootstrap.py
python auto/10-scan_symbols.py
python auto/20-depdoctor.py
python auto/40-plan_solver.py
python auto/50-apply_plan.py
```

Successful completion of these commands without errors is a good indication that your
installation is healthy.

For a more exhaustive readiness check (including providers, views, and plans), follow the
P0/P1 gates in `docs/ACCEPTANCE-CRITERIA.md`.

---

## Production Deployment Pointers

RTT supports multiple deployment modes (manual, systemd, Docker, Kubernetes). Detailed
operational guidance lives in:

- `docs/OPERATIONS.md` – deployment flows, health checks, logging, metrics, backup, and feature-flag operations for non-owned integrations.
- `docs/PHASE-GUIDE.md` – the 12‑phase execution guide for bringing RTT into an existing environment.
- `docs/RSD-PLAN.md` and `docs/DROPIN-MAPPING.md` – mapping from archive phases into the `rtt-gateway/` delivery tree.

Use this `INSTALL.md` for getting a single node into a working state, then hand off to the
operations and phase guides for staging and production rollouts.

---

## Clean Up

To remove build artifacts and common runtime-generated files created during installation or
testing, you can run:

```bash
make clean
```

This removes Python `__pycache__` directories, Rust `target/` trees, and common `.rtt/` and
`plans/` runtime artifacts while leaving your source, configuration, and validation reports
intact.
