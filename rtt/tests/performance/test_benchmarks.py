#!/usr/bin/env python3
"""
Performance Tests: Benchmarks
Tests performance characteristics of RTT automation pipeline
"""
import pytest
import time
import subprocess
import sys
import json
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parents[2]


class TestBootstrapPerformance:
    """Test bootstrap stage performance."""

    def test_bootstrap_speed(self, temp_rtt_dir):
        """Test that bootstrap completes within performance budget."""
        script = ROOT / "auto" / "00-bootstrap.py"

        # Run multiple times to get average
        times = []
        for _ in range(5):
            start = time.time()
            result = subprocess.run(
                [sys.executable, str(script)],
                cwd=temp_rtt_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            duration = time.time() - start
            times.append(duration)

            assert result.returncode == 0

        avg_time = statistics.mean(times)
        max_time = max(times)

        assert avg_time < 0.1, f"Bootstrap average time {avg_time:.3f}s exceeds 0.1s budget"
        assert max_time < 0.2, f"Bootstrap max time {max_time:.3f}s exceeds 0.2s budget"

    def test_bootstrap_memory_efficiency(self, temp_rtt_dir):
        """Test that bootstrap uses minimal memory."""
        script = ROOT / "auto" / "00-bootstrap.py"

        # Just verify it completes - detailed memory profiling would need psutil
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=5
        )

        assert result.returncode == 0


class TestScanPerformance:
    """Test scan symbols performance."""

    def test_scan_empty_manifests(self, temp_rtt_dir):
        """Test scan performance with no manifests."""
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        script = ROOT / "auto" / "10-scan_symbols.py"

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
        assert duration < 0.5, f"Empty scan took {duration:.3f}s, expected < 0.5s"

    def test_scan_scales_linearly(self, temp_rtt_dir):
        """Test that scan scales approximately linearly with manifest count."""
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)
        manifests_dir = temp_rtt_dir / ".rtt" / "manifests"

        script = ROOT / "auto" / "10-scan_symbols.py"

        # Test with different manifest counts
        results = []
        for count in [10, 50, 100]:
            # Clear previous manifests
            for f in manifests_dir.glob("*.json"):
                f.unlink()

            # Create manifests
            for i in range(count):
                manifest = {
                    "symbol": {
                        "saddr": f"rtt://test/api/service_{i}@1.0.0",
                        "type": "api",
                        "name": f"service_{i}"
                    }
                }
                (manifests_dir / f"service_{i}.json").write_text(
                    json.dumps(manifest, indent=2)
                )

            # Time scan
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
            results.append((count, duration))

        # Verify performance
        for count, duration in results:
            per_manifest = duration / count if count > 0 else 0
            assert per_manifest < 0.01, f"Scan takes {per_manifest:.4f}s per manifest"

    def test_scan_large_manifest(self, temp_rtt_dir):
        """Test scan with large manifest files."""
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)
        manifests_dir = temp_rtt_dir / ".rtt" / "manifests"

        # Create large manifest
        large_manifest = {
            "symbol": {
                "saddr": "rtt://test/api/large@1.0.0",
                "type": "api",
                "name": "large"
            },
            "provides": [f"service_{i}" for i in range(100)],
            "requires": [f"dependency_{i}" for i in range(100)],
            "metadata": {f"key_{i}": f"value_{i}" for i in range(100)}
        }

        (manifests_dir / "large.json").write_text(json.dumps(large_manifest, indent=2))

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
        assert duration < 1.0, f"Large manifest scan took {duration:.3f}s"


class TestWALPerformance:
    """Test WAL operation performance."""

    def test_wal_write_speed(self, temp_rtt_dir):
        """Test WAL write performance."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        wal_dir.mkdir(parents=True, exist_ok=True)
        (wal_dir / "LATEST").write_text("GENESIS")

        plans_dir = temp_rtt_dir / "plans"
        plans_dir.mkdir(exist_ok=True)
        (temp_rtt_dir / ".rtt" / "cache").mkdir(parents=True, exist_ok=True)

        script = ROOT / "auto" / "50-apply_plan.py"

        # Write multiple WAL entries
        times = []
        for i in range(10):
            plan = {
                "plan_id": f"perf_test_{i}",
                "timestamp": time.time(),
                "routes_add": [],
                "routes_remove": []
            }
            plan_file = plans_dir / f"plan_{i}.json"
            plan_file.write_text(json.dumps(plan, indent=2))

            start = time.time()
            result = subprocess.run(
                [sys.executable, str(script), f"plan_{i}.json"],
                cwd=temp_rtt_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            duration = time.time() - start
            times.append(duration)

            assert result.returncode == 0

        avg_time = statistics.mean(times)
        assert avg_time < 0.1, f"WAL write average time {avg_time:.3f}s exceeds 0.1s budget"

    def test_wal_chain_read_performance(self, temp_rtt_dir):
        """Test reading WAL chain performance."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        wal_dir.mkdir(parents=True, exist_ok=True)

        # Create multiple WAL entries
        for i in range(50):
            entry = {
                "root": f"hash_{i}",
                "frame": {
                    "ts": 1000000000 + i,
                    "plan_id": f"plan_{i}",
                    "prev": f"hash_{i-1}" if i > 0 else "GENESIS",
                    "apply": []
                }
            }
            wal_file = wal_dir / f"{entry['frame']['ts']}-{entry['root']}.wal.json"
            wal_file.write_text(json.dumps(entry, indent=2))

        # Time reading all entries
        start = time.time()
        entries = []
        for wal_file in sorted(wal_dir.glob("*.wal.json")):
            entry = json.loads(wal_file.read_text())
            entries.append(entry)
        duration = time.time() - start

        assert len(entries) == 50
        assert duration < 0.5, f"Reading 50 WAL entries took {duration:.3f}s"


class TestValidationPerformance:
    """Test validation performance."""

    def test_semver_parsing_speed(self):
        """Test semver parsing performance."""
        sys.path.insert(0, str(ROOT / "tools"))
        from semver import parse, check_set

        # Parse many versions
        versions = [f"{i}.{j}.{k}" for i in range(10) for j in range(10) for k in range(10)]

        start = time.time()
        for ver in versions:
            parse(ver)
        duration = time.time() - start

        per_parse = duration / len(versions)
        assert per_parse < 0.001, f"Semver parse takes {per_parse*1000:.3f}ms per version"

    def test_semver_constraint_checking_speed(self):
        """Test semver constraint checking performance."""
        sys.path.insert(0, str(ROOT / "tools"))
        from semver import check_set

        constraints = [
            ">=1.0.0 <2.0.0",
            ">=2.0.0 <3.0.0",
            ">1.5.0 <=2.5.0"
        ]

        versions = [f"1.{i}.0" for i in range(100)]

        start = time.time()
        for version in versions:
            for constraint in constraints:
                check_set(version, constraint)
        duration = time.time() - start

        total_checks = len(versions) * len(constraints)
        per_check = duration / total_checks
        assert per_check < 0.001, f"Constraint check takes {per_check*1000:.3f}ms"

    def test_policy_matching_speed(self):
        """Test policy matching performance."""
        sys.path.insert(0, str(ROOT / "tools"))
        from policy_match import allowed

        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "rtt://core/*"},
                {"from": "rtt://test/*", "to": "rtt://test/*"},
                {"from": "rtt://prod/*", "to": "rtt://prod/*"},
                {"from": "*", "to": "rtt://public/*"}
            ]
        }

        # Test many policy checks
        checks = []
        for i in range(100):
            from_addr = f"rtt://test/api/service_{i}@1.0.0"
            to_addr = f"rtt://test/api/target_{i}@1.0.0"
            checks.append((from_addr, to_addr))

        start = time.time()
        for from_addr, to_addr in checks:
            allowed(policy, from_addr, to_addr)
        duration = time.time() - start

        per_check = duration / len(checks)
        assert per_check < 0.001, f"Policy check takes {per_check*1000:.3f}ms"


class TestSolverPerformance:
    """Test placement solver performance."""

    def test_solver_small_topology(self):
        """Test solver with small topology."""
        sys.path.insert(0, str(ROOT / "tools"))
        from solver_placement import optimize

        manifests = {
            f"sym_{i}": {"qos": {}, "tags": {}}
            for i in range(10)
        }

        routes = [
            {"from": f"sym_{i}", "to": f"sym_{i+1}"}
            for i in range(9)
        ]

        topology = {
            "nodes": {
                "0": {"capacity": {"cpu": 64.0, "mem_mb": 65536}},
                "1": {"capacity": {"cpu": 64.0, "mem_mb": 65536}}
            }
        }

        start = time.time()
        place, lane_map, cost = optimize(
            manifests, routes, topology, {}, {}, ["shm", "uds"]
        )
        duration = time.time() - start

        assert duration < 1.0, f"Solver took {duration:.3f}s for 10 symbols"

    def test_solver_medium_topology(self):
        """Test solver with medium topology."""
        sys.path.insert(0, str(ROOT / "tools"))
        from solver_placement import optimize

        manifests = {
            f"sym_{i}": {"qos": {}, "tags": {}}
            for i in range(50)
        }

        routes = [
            {"from": f"sym_{i}", "to": f"sym_{i+1}"}
            for i in range(49)
        ]

        topology = {
            "nodes": {
                str(i): {"capacity": {"cpu": 64.0, "mem_mb": 65536}}
                for i in range(4)
            }
        }

        start = time.time()
        place, lane_map, cost = optimize(
            manifests, routes, topology, {}, {}, ["shm", "uds"],
            churn_weight=0.5
        )
        duration = time.time() - start

        assert duration < 5.0, f"Solver took {duration:.3f}s for 50 symbols"


class TestMemoryEfficiency:
    """Test memory efficiency of operations."""

    def test_json_normalization_memory(self):
        """Test JSON normalization doesn't use excessive memory."""
        sys.path.insert(0, str(ROOT / "tools"))
        import cas_ingest

        # Large object
        large_obj = {
            f"key_{i}": {
                "data": [j for j in range(100)],
                "metadata": {f"field_{k}": f"value_{k}" for k in range(10)}
            }
            for i in range(100)
        }

        # Should complete without memory error
        normalized = cas_ingest.normalize(large_obj)
        content_hash = cas_ingest.sha256_bytes(normalized)

        assert len(content_hash) == 64

    def test_manifest_scanning_memory(self, temp_rtt_dir):
        """Test manifest scanning with many files."""
        manifests_dir = temp_rtt_dir / ".rtt" / "manifests"
        index_dir = temp_rtt_dir / "rtt_elite_addon" / "index"
        index_dir.mkdir(parents=True, exist_ok=True)

        # Create many manifests
        for i in range(200):
            manifest = {
                "symbol": {
                    "saddr": f"rtt://test/api/service_{i}@1.0.0",
                    "type": "api"
                }
            }
            (manifests_dir / f"service_{i}.json").write_text(
                json.dumps(manifest)
            )

        script = ROOT / "auto" / "10-scan_symbols.py"

        # Should complete without memory error
        result = subprocess.run(
            [sys.executable, str(script)],
            cwd=temp_rtt_dir,
            capture_output=True,
            text=True,
            timeout=10
        )

        assert result.returncode == 0


class TestThroughput:
    """Test system throughput."""

    def test_wal_write_throughput(self, temp_rtt_dir):
        """Test WAL write throughput (entries per second)."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        wal_dir.mkdir(parents=True, exist_ok=True)
        (wal_dir / "LATEST").write_text("GENESIS")

        plans_dir = temp_rtt_dir / "plans"
        plans_dir.mkdir(exist_ok=True)
        (temp_rtt_dir / ".rtt" / "cache").mkdir(parents=True, exist_ok=True)

        script = ROOT / "auto" / "50-apply_plan.py"

        # Write many entries
        num_entries = 20
        start = time.time()

        for i in range(num_entries):
            plan = {
                "plan_id": f"throughput_test_{i}",
                "timestamp": time.time(),
                "routes_add": []
            }
            plan_file = plans_dir / f"plan_{i}.json"
            plan_file.write_text(json.dumps(plan))

            result = subprocess.run(
                [sys.executable, str(script), f"plan_{i}.json"],
                cwd=temp_rtt_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            assert result.returncode == 0

        duration = time.time() - start
        throughput = num_entries / duration

        assert throughput > 10, f"WAL throughput {throughput:.1f} entries/s is too low"
