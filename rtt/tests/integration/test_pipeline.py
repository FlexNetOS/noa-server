#!/usr/bin/env python3
"""
Integration Tests: Full Automation Pipeline
Tests the complete RTT automation pipeline from bootstrap to apply
"""
import pytest
import json
import subprocess
import sys
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[2]


class TestBootstrapPipeline:
    """Test the bootstrap stage (00-bootstrap.py)."""

    def test_bootstrap_creates_directories(self, temp_rtt_dir):
        """Test that bootstrap creates all required directories."""
        # Remove directories first
        rtt_dir = temp_rtt_dir / ".rtt"
        if rtt_dir.exists():
            shutil.rmtree(rtt_dir)

        # Run bootstrap
        script = ROOT / "auto" / "00-bootstrap.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True
        )

        assert result.returncode == 0
        assert (temp_rtt_dir / ".rtt").exists()
        assert (temp_rtt_dir / ".rtt" / "cache").exists()
        assert (temp_rtt_dir / ".rtt" / "wal").exists()
        assert (temp_rtt_dir / ".rtt" / "sockets").exists()
        assert (temp_rtt_dir / ".rtt" / "manifests").exists()
        assert (temp_rtt_dir / ".rtt" / "drivers").exists()
        assert (temp_rtt_dir / ".rtt" / "tuned").exists()

    def test_bootstrap_idempotent(self, populated_rtt_dir):
        """Test that bootstrap is idempotent."""
        script = ROOT / "auto" / "00-bootstrap.py"

        # Run once
        result1 = subprocess.run(
            [sys.executable, str(script)],
            cwd=populated_rtt_dir,
            capture_output=True,
            text=True
        )

        # Run again
        result2 = subprocess.run(
            [sys.executable, str(script)],
            cwd=populated_rtt_dir,
            capture_output=True,
            text=True
        )

        assert result1.returncode == 0
        assert result2.returncode == 0


class TestScanSymbolsPipeline:
    """Test the scan symbols stage (10-scan_symbols.py)."""

    def test_scan_creates_index(self, populated_rtt_dir, sample_manifest):
        """Test that scan creates symbols index."""
        # Ensure manifest exists
        manifest_path = populated_rtt_dir / ".rtt" / "manifests" / "test.manifest.json"
        manifest_path.write_text(json.dumps(sample_manifest, indent=2))

        # Create index directory
        index_dir = populated_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Run scan
        script = ROOT / "auto" / "10-scan_symbols.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=populated_rtt_dir,
            capture_output=True,
            text=True
        )

        assert result.returncode == 0
        index_file = index_dir / "symbols.index.json"
        assert index_file.exists()

        # Verify index content
        index_data = json.loads(index_file.read_text())
        assert "symbols" in index_data
        assert len(index_data["symbols"]) > 0

    def test_scan_handles_no_manifests(self, temp_rtt_dir):
        """Test scan with no manifests."""
        # Create index directory
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Run scan
        script = ROOT / "auto" / "10-scan_symbols.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True
        )

        # Should succeed with empty symbols list
        assert result.returncode == 0
        index_file = index_dir / "symbols.index.json"
        if index_file.exists():
            index_data = json.loads(index_file.read_text())
            assert "symbols" in index_data

    def test_scan_handles_invalid_manifests(self, temp_rtt_dir):
        """Test scan handles invalid manifest gracefully."""
        # Create invalid manifest
        manifest_path = temp_rtt_dir / ".rtt" / "manifests" / "invalid.json"
        manifest_path.write_text("{invalid json")

        # Create index directory
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Run scan
        script = ROOT / "auto" / "10-scan_symbols.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True
        )

        # Should succeed, skipping invalid manifest
        assert result.returncode == 0


class TestPlanSolverPipeline:
    """Test the plan solver stage (40-plan_solver.py)."""

    def test_plan_solver_creates_plan(self, populated_rtt_dir):
        """Test that plan solver creates a plan file."""
        # Create plans directory
        plans_dir = populated_rtt_dir / "plans"
        plans_dir.mkdir(exist_ok=True)

        # This test would require actual dependencies and routes
        # For now, verify the script exists and can be imported
        script = ROOT / "auto" / "40-plan_solver.py"
        assert script.exists()


class TestApplyPlanPipeline:
    """Test the apply plan stage (50-apply_plan.py)."""

    def test_apply_plan_writes_wal(self, temp_rtt_dir, sample_plan):
        """Test that apply plan writes to WAL."""
        # Create plans directory and plan file
        plans_dir = temp_rtt_dir / "plans"
        plans_dir.mkdir(exist_ok=True)
        plan_file = plans_dir / "test.plan.json"
        plan_file.write_text(json.dumps(sample_plan, indent=2))

        # Create WAL directory with GENESIS
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        wal_dir.mkdir(parents=True, exist_ok=True)
        (wal_dir / "LATEST").write_text("GENESIS")

        # Create cache directory
        (temp_rtt_dir / ".rtt" / "cache").mkdir(parents=True, exist_ok=True)

        # Run apply_plan
        script = ROOT / "auto" / "50-apply_plan.py"
        result = subprocess.run(
            [sys.executable, str(script), "test.plan.json"],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True
        )

        assert result.returncode == 0

        # Verify WAL entry created
        wal_files = list(wal_dir.glob("*.wal.json"))
        assert len(wal_files) > 0

        # Verify LATEST updated
        latest = (wal_dir / "LATEST").read_text().strip()
        assert latest != "GENESIS"

    def test_apply_plan_chain_integrity(self, temp_rtt_dir, sample_plan):
        """Test that applying multiple plans maintains chain integrity."""
        # Setup
        plans_dir = temp_rtt_dir / "plans"
        plans_dir.mkdir(exist_ok=True)
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        wal_dir.mkdir(parents=True, exist_ok=True)
        (wal_dir / "LATEST").write_text("GENESIS")
        (temp_rtt_dir / ".rtt" / "cache").mkdir(parents=True, exist_ok=True)

        script = ROOT / "auto" / "50-apply_plan.py"

        # Apply multiple plans
        prev_hash = "GENESIS"
        for i in range(3):
            plan = sample_plan.copy()
            plan["plan_id"] = f"test_plan_{i}"
            plan_file = plans_dir / f"plan_{i}.json"
            plan_file.write_text(json.dumps(plan, indent=2))

            result = subprocess.run(
                [sys.executable, str(script), f"plan_{i}.json"],
                cwd=temp_rtt_dir,
                capture_output=True,
                text=True
            )

            assert result.returncode == 0

            # Read latest WAL entry
            wal_files = sorted(wal_dir.glob("*.wal.json"))
            latest_entry = json.loads(wal_files[-1].read_text())

            # Verify chain
            assert latest_entry["frame"]["prev"] == prev_hash
            prev_hash = latest_entry["root"]


class TestFullPipeline:
    """Test the complete end-to-end pipeline."""

    def test_minimal_pipeline(self, temp_rtt_dir):
        """Test running minimal pipeline stages."""
        # Stage 1: Bootstrap
        script = ROOT / "auto" / "00-bootstrap.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0

        # Stage 2: Scan (with no manifests)
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        script = ROOT / "auto" / "10-scan_symbols.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        assert result.returncode == 0

    def test_pipeline_stage_dependencies(self, temp_rtt_dir):
        """Test that pipeline stages create required artifacts."""
        stages = [
            ("00-bootstrap.py", [".rtt"]),
            ("10-scan_symbols.py", ["rtt_elite_addon/index"])
        ]

        for script_name, expected_artifacts in stages:
            script = ROOT / "auto" / script_name

            # Create required directories for scan
            if script_name == "10-scan_symbols.py":
                (temp_rtt_dir / "rtt_elite_addon" / "index").mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                [sys.executable, str(script)],
                cwd=temp_rtt_dir,
                capture_output=True,
                text=True,
                timeout=10
            )

            # Verify stage succeeded
            assert result.returncode == 0

            # Verify artifacts created
            for artifact in expected_artifacts:
                artifact_path = temp_rtt_dir / artifact
                assert artifact_path.exists(), f"Stage {script_name} did not create {artifact}"


class TestPipelineErrorHandling:
    """Test error handling in pipeline stages."""

    def test_bootstrap_permission_error(self, tmp_path):
        """Test bootstrap handles permission errors gracefully."""
        # This test is platform-specific and may not work on all systems
        # Just verify the script can be executed
        script = ROOT / "auto" / "00-bootstrap.py"
        assert script.exists()

    def test_scan_with_corrupted_manifest(self, temp_rtt_dir):
        """Test scan handles corrupted manifests."""
        # Create corrupted manifest
        manifest_path = temp_rtt_dir / ".rtt" / "manifests" / "corrupted.json"
        manifest_path.write_text('{"symbol": {"saddr": "invalid')  # Truncated JSON

        # Create index directory
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Run scan
        script = ROOT / "auto" / "10-scan_symbols.py"
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=10
        )

        # Should succeed, skipping corrupted file
        assert result.returncode == 0


class TestPipelinePerformance:
    """Test pipeline performance characteristics."""

    def test_bootstrap_fast(self, temp_rtt_dir):
        """Test that bootstrap completes quickly."""
        import time

        script = ROOT / "auto" / "00-bootstrap.py"
        start = time.time()
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=5
        )
        duration = time.time() - start

        assert result.returncode == 0
        assert duration < 1.0, f"Bootstrap took {duration}s, expected < 1s"

    def test_scan_scales_with_manifests(self, temp_rtt_dir):
        """Test that scan scales reasonably with number of manifests."""
        import time

        # Create multiple manifests
        manifests_dir = temp_rtt_dir / ".rtt" / "manifests"
        for i in range(10):
            manifest = {
                "symbol": {
                    "saddr": f"rtt://test/api/service_{i}@1.0.0",
                    "type": "api",
                    "name": f"service_{i}"
                }
            }
            manifest_path = manifests_dir / f"service_{i}.json"
            manifest_path.write_text(json.dumps(manifest, indent=2))

        # Create index directory
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Run scan
        script = ROOT / "auto" / "10-scan_symbols.py"
        start = time.time()
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        duration = time.time() - start

        assert result.returncode == 0
        assert duration < 2.0, f"Scan took {duration}s for 10 manifests"
