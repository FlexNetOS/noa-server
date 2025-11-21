.PHONY: help install build test validate clean

help:
	@echo "RTT v1.0.0 Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  install   - Install Python dependencies"
	@echo "  build     - Build native components (optional)"
	@echo "  test      - Run full test suite"
	@echo "  validate  - Run validation"
	@echo "  clean     - Clean runtime artifacts"

install:
	pip install pyyaml jsonschema

build:
	@echo "Building native components (requires Rust/Go toolchains)..."
	@cd fabric/shm && cargo build --release 2>/dev/null || echo "Rust not installed, skipping fabric"
	@cd planner/rtt_planner_rs && cargo build --release 2>/dev/null || echo "Rust not installed, skipping planner"
	@cd tools/rtt_sign_rs && cargo build --release 2>/dev/null || echo "Rust not installed, skipping sign_rs"
	@cd tools/rtt_sign_go && go build 2>/dev/null || echo "Go not installed, skipping sign_go"
	@echo "Native build complete (errors are non-fatal)"

test:
	@echo "Running RTT test suite..."
	python auto/00-bootstrap.py
	python auto/10-scan_symbols.py
	python auto/20-depdoctor.py
	python auto/40-plan_solver.py
	python auto/50-apply_plan.py
	python tools/cas_ingest.py agents/common/*.agent.json
	python tools/cas_pack.py
	@echo "Test suite complete ✅"

validate:
	python auto/00-bootstrap.py
	@echo "Validation complete ✅"

clean:
	@echo "Cleaning runtime artifacts..."
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name 'target' -exec rm -rf {} + 2>/dev/null || true
	rm -f .rtt/cache/*.json .rtt/wal/*.wal.json plans/*.plan.json 2>/dev/null || true
	@echo "Clean complete ✅"
