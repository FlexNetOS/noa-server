#!/usr/bin/env python3
"""
RTT v1.0.0 Test Suite - Pytest Configuration and Fixtures
Provides reusable test fixtures for all test modules
"""
import pytest
from pathlib import Path
import tempfile
import shutil
import json
import os
import sys

# Add root to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))


@pytest.fixture
def temp_rtt_dir():
    """Create temporary RTT directory structure for testing."""
    tmpdir = tempfile.mkdtemp(prefix="rtt_test_")
    rtt_dir = Path(tmpdir) / ".rtt"
    rtt_dir.mkdir()

    # Create standard RTT subdirectories
    for subdir in ["manifests", "wal", "cache", "sockets", "drivers", "tuned"]:
        (rtt_dir / subdir).mkdir()

    # Create plans directory
    (Path(tmpdir) / "plans").mkdir()

    # Create index directory
    (Path(tmpdir) / "rtt_elite_addon" / "index").mkdir(parents=True)

    yield Path(tmpdir)

    # Cleanup
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def sample_manifest():
    """Generate a sample RTT manifest."""
    return {
        "symbol": {
            "saddr": "rtt://test/api/example@1.0.0",
            "type": "api",
            "name": "example"
        },
        "provides": ["test"],
        "requires": [],
        "qos": {
            "latency_ms": 10,
            "throughput_qps": 100
        },
        "tags": {
            "cpu_weight": 1.0,
            "mem_mb": 64
        }
    }


@pytest.fixture
def sample_policy():
    """Generate a sample RTT policy."""
    return {
        "version": "1.0.0",
        "allow": [
            {"from": "rtt://test/*", "to": "rtt://test/*"},
            {"from": "rtt://core/*", "to": "*"}
        ]
    }


@pytest.fixture
def sample_routes():
    """Generate sample RTT routes."""
    return [
        {
            "from": "rtt://test/api/client@1.0.0",
            "to": "rtt://test/api/server@1.0.0",
            "lane": "uds"
        },
        {
            "from": "rtt://core/logger@1.0.0",
            "to": "rtt://test/api/server@1.0.0",
            "lane": "shm"
        }
    ]


@pytest.fixture
def sample_topology():
    """Generate a sample topology configuration."""
    return {
        "nodes": {
            "0": {
                "capacity": {"cpu": 64.0, "mem_mb": 65536}
            },
            "1": {
                "capacity": {"cpu": 32.0, "mem_mb": 32768}
            }
        },
        "place": {}
    }


@pytest.fixture
def sample_plan():
    """Generate a sample execution plan."""
    return {
        "plan_id": "test_plan_001",
        "timestamp": 1234567890,
        "routes_add": [
            {
                "from": "rtt://test/api/client@1.0.0",
                "to": "rtt://test/api/server@1.0.0",
                "lane": "uds"
            }
        ],
        "routes_remove": [],
        "placement": {
            "rtt://test/api/client@1.0.0": "0",
            "rtt://test/api/server@1.0.0": "0"
        }
    }


@pytest.fixture
def mock_wal_chain():
    """Generate a mock WAL chain for testing."""
    return [
        {
            "root": "abc123",
            "frame": {
                "ts": 1000,
                "plan_id": "plan_001",
                "prev": "GENESIS",
                "apply": []
            }
        },
        {
            "root": "def456",
            "frame": {
                "ts": 2000,
                "plan_id": "plan_002",
                "prev": "abc123",
                "apply": []
            }
        }
    ]


@pytest.fixture
def populated_rtt_dir(temp_rtt_dir, sample_manifest):
    """Create a temporary RTT directory with sample data."""
    # Write sample manifest
    manifest_path = temp_rtt_dir / ".rtt" / "manifests" / "test.manifest.json"
    manifest_path.write_text(json.dumps(sample_manifest, indent=2))

    # Write sample policy
    policy_path = temp_rtt_dir / ".rtt" / "policy.json"
    policy = {
        "version": "1.0.0",
        "allow": [{"from": "*", "to": "*"}]
    }
    policy_path.write_text(json.dumps(policy, indent=2))

    # Write sample routes
    routes_path = temp_rtt_dir / ".rtt" / "routes.json"
    routes = {"routes": []}
    routes_path.write_text(json.dumps(routes, indent=2))

    # Initialize WAL
    wal_latest = temp_rtt_dir / ".rtt" / "wal" / "LATEST"
    wal_latest.write_text("GENESIS")

    return temp_rtt_dir


@pytest.fixture
def clean_env_vars():
    """Preserve and restore environment variables."""
    original = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original)


@pytest.fixture(autouse=True)
def reset_sys_path():
    """Reset sys.path after each test to avoid pollution."""
    original_path = sys.path.copy()
    yield
    sys.path.clear()
    sys.path.extend(original_path)


# Test data generators

def generate_symbol_address(namespace="test", category="api", name="example", version="1.0.0"):
    """Generate a valid RTT symbol address."""
    return f"rtt://{namespace}/{category}/{name}@{version}"


def generate_manifest(saddr=None, symbol_type="api"):
    """Generate a valid RTT manifest dictionary."""
    if saddr is None:
        saddr = generate_symbol_address()

    return {
        "symbol": {
            "saddr": saddr,
            "type": symbol_type,
            "name": saddr.split("/")[-1].split("@")[0]
        },
        "provides": ["service"],
        "requires": [],
        "qos": {
            "latency_ms": 10,
            "throughput_qps": 100
        }
    }


# Assertion helpers

def assert_valid_manifest(manifest):
    """Assert that a manifest has required fields."""
    assert "symbol" in manifest
    assert "saddr" in manifest["symbol"]
    assert "type" in manifest["symbol"]
    assert manifest["symbol"]["saddr"].startswith("rtt://")


def assert_valid_wal_entry(entry):
    """Assert that a WAL entry is properly formatted."""
    assert "root" in entry
    assert "frame" in entry
    assert "ts" in entry["frame"]
    assert "prev" in entry["frame"]
    assert "plan_id" in entry["frame"]


def assert_path_within_directory(path, base_dir):
    """Assert that a path stays within a base directory (no traversal)."""
    resolved_path = Path(path).resolve()
    resolved_base = Path(base_dir).resolve()

    try:
        resolved_path.relative_to(resolved_base)
    except ValueError:
        pytest.fail(f"Path {resolved_path} escapes base directory {resolved_base}")


# Mark decorators for test categorization

def unit_test(func):
    """Mark a test as a unit test."""
    return pytest.mark.unit(func)


def integration_test(func):
    """Mark a test as an integration test."""
    return pytest.mark.integration(func)


def security_test(func):
    """Mark a test as a security test."""
    return pytest.mark.security(func)


def performance_test(func):
    """Mark a test as a performance test."""
    return pytest.mark.performance(func)
