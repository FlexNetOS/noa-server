#!/usr/bin/env python3
"""
RTT Configuration Management
Centralized configuration for all RTT tools.
"""

import os
from pathlib import Path
from typing import Optional


class Config:
    """Central configuration for RTT tools."""

    # Base paths
    BASE_DIR = Path(__file__).resolve().parents[1]
    RTT_DIR = BASE_DIR / ".rtt"

    # Registry paths
    REGISTRY_DIR = RTT_DIR / "registry"
    CAS_DIR = REGISTRY_DIR / "cas" / "sha256"
    INDEX_FILE = REGISTRY_DIR / "index.json"
    PACK_DIR = REGISTRY_DIR / "pack"
    TRUST_DIR = REGISTRY_DIR / "trust"
    KEYS_DIR = TRUST_DIR / "keys"

    # Runtime paths
    CACHE_DIR = RTT_DIR / "cache"
    WAL_DIR = RTT_DIR / "wal"
    SOCKETS_DIR = RTT_DIR / "sockets"
    MANIFESTS_DIR = RTT_DIR / "manifests"

    # Project paths
    AGENTS_DIR = BASE_DIR / "agents"
    SKILLS_DIR = BASE_DIR / "skills"
    PLANS_DIR = BASE_DIR / "plans"
    VIEWS_DIR = BASE_DIR / "views"
    OVERLAYS_DIR = BASE_DIR / "overlays"
    PROVIDERS_DIR = BASE_DIR / "providers"
    TOOLS_DIR = BASE_DIR / "tools"
    DRIVERS_DIR = RTT_DIR / "drivers"

    # Limits and thresholds
    MAX_JSON_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_PLAN_SIZE = 5 * 1024 * 1024   # 5MB
    MAX_MANIFEST_SIZE = 1 * 1024 * 1024  # 1MB
    MAX_WAL_ENTRIES = 10000
    MAX_PATH_LENGTH = 4096

    # Security settings
    REQUIRE_SIGNATURES = os.getenv("RTT_REQUIRE_SIGNATURES", "false").lower() == "true"
    TRUSTED_KEY_IDS = os.getenv("RTT_TRUSTED_KEYS", "dev,prod").split(",")
    ENABLE_WAL_LOCKING = os.getenv("RTT_WAL_LOCKING", "true").lower() == "true"

    # Performance tuning
    WAL_LOCK_TIMEOUT = float(os.getenv("RTT_WAL_LOCK_TIMEOUT", "30.0"))  # seconds
    PLACEMENT_MAX_ITERATIONS = int(os.getenv("RTT_PLACEMENT_ITERATIONS", "50"))
    SOLVER_TIMEOUT = int(os.getenv("RTT_SOLVER_TIMEOUT", "300"))  # seconds

    # Logging
    LOG_LEVEL = os.getenv("RTT_LOG_LEVEL", "INFO").upper()
    LOG_FILE = RTT_DIR / "rtt.log"
    ENABLE_AUDIT_LOG = os.getenv("RTT_AUDIT_LOG", "true").lower() == "true"
    AUDIT_LOG_FILE = RTT_DIR / "audit.log"

    # Feature flags
    ENABLE_TELEMETRY = os.getenv("RTT_TELEMETRY", "true").lower() == "true"
    ENABLE_FLIGHT_RECORDER = os.getenv("RTT_FLIGHT_RECORDER", "true").lower() == "true"
    ENABLE_CHAOS_TESTING = os.getenv("RTT_CHAOS", "false").lower() == "true"

    # Network settings
    AGENT_BUS_SOCKET = SOCKETS_DIR / "agent-bus.sock"
    DEFAULT_TIMEOUT = float(os.getenv("RTT_TIMEOUT", "30.0"))  # seconds

    # Placement and optimization
    CHURN_WEIGHT = float(os.getenv("RTT_CHURN_WEIGHT", "0.5"))
    LANE_CHANGE_THRESHOLD_MS = float(os.getenv("RTT_LANE_THRESHOLD", "0.2"))
    PREFER_LANES = os.getenv("RTT_PREFER_LANES", "shm,uds,tcp,http").split(",")

    # Version constraints
    MIN_SUPPORTED_VERSION = "1.0.0"
    CURRENT_VERSION = "1.0.0"
    API_VERSION = "v1"

    @classmethod
    def ensure_directories(cls) -> None:
        """Create all required directories if they don't exist."""
        directories = [
            cls.RTT_DIR,
            cls.REGISTRY_DIR,
            cls.CAS_DIR,
            cls.PACK_DIR,
            cls.TRUST_DIR,
            cls.KEYS_DIR,
            cls.CACHE_DIR,
            cls.WAL_DIR,
            cls.SOCKETS_DIR,
            cls.MANIFESTS_DIR,
            cls.PLANS_DIR,
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    @classmethod
    def get_env(cls, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get environment variable with RTT_ prefix."""
        return os.getenv(f"RTT_{key}", default)

    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development mode."""
        return os.getenv("RTT_ENV", "production") == "development"

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode."""
        return os.getenv("RTT_ENV", "production") == "production"


# Convenience constants
ROOT = Config.BASE_DIR
RTT_DIR = Config.RTT_DIR
CAS_DIR = Config.CAS_DIR
INDEX_FILE = Config.INDEX_FILE
WAL_DIR = Config.WAL_DIR
CACHE_DIR = Config.CACHE_DIR
PLANS_DIR = Config.PLANS_DIR
MANIFESTS_DIR = Config.MANIFESTS_DIR


# Lane configuration (moved from solver_constraints.py)
LANE_BASE_LAT_MS = {
    "shm": 0.05,      # Shared memory: 50 microseconds
    "uds": 0.1,       # Unix domain socket: 100 microseconds
    "tcp": 0.5,       # TCP localhost: 500 microseconds
    "http": 2.0,      # HTTP: 2 milliseconds
    "grpc": 1.0,      # gRPC: 1 millisecond
}

LANE_CAPABILITIES = {
    "shm": {"bandwidth_gbps": 10.0, "same_host_only": True},
    "uds": {"bandwidth_gbps": 5.0, "same_host_only": True},
    "tcp": {"bandwidth_gbps": 1.0, "same_host_only": False},
    "http": {"bandwidth_gbps": 0.5, "same_host_only": False},
    "grpc": {"bandwidth_gbps": 0.8, "same_host_only": False},
}


if __name__ == "__main__":
    # Print configuration when run directly
    print("RTT Configuration:")
    print(f"  BASE_DIR: {Config.BASE_DIR}")
    print(f"  RTT_DIR: {Config.RTT_DIR}")
    print(f"  LOG_LEVEL: {Config.LOG_LEVEL}")
    print(f"  Environment: {'development' if Config.is_development() else 'production'}")
    print(f"  Require Signatures: {Config.REQUIRE_SIGNATURES}")
    print(f"  WAL Locking: {Config.ENABLE_WAL_LOCKING}")

    # Ensure directories exist
    Config.ensure_directories()
    print("\nAll directories created successfully.")
