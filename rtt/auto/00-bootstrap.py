#!/usr/bin/env python3
"""
RTT v1.0.0 - Bootstrap
Initialize RTT environment and directory structure.
"""
import sys
import pathlib

# Add parent to path for imports
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.logger import get_logger
from tools.metrics import get_metrics, timed

# Initialize logging and metrics
logger = get_logger("rtt.bootstrap")
metrics = get_metrics()

logger.info(f"Starting RTT bootstrap at {ROOT}")

# Create required directories
directories = ["cache", "wal", "sockets", "manifests", "drivers", "tuned", "logs", "metrics"]

with timed(metrics, "bootstrap_duration"):
    try:
        created_count = 0
        for d in directories:
            dir_path = ROOT / ".rtt" / d
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
                created_count += 1
                logger.debug(f"Created directory: {d}")
            else:
                logger.debug(f"Directory exists: {d}")

        metrics.increment("directories_created", created_count)
        metrics.increment("directories_verified", len(directories))
        metrics.set_gauge("total_directories", len(directories))

        logger.info(f"Bootstrap complete: {len(directories)} directories, {created_count} created")
        print(f"[OK] Bootstrap complete: {ROOT}")
        print(f"     Created: {created_count} | Verified: {len(directories)}")

        # Export metrics
        metrics_file = metrics.export("bootstrap-metrics.json")
        logger.info(f"Metrics exported to: {metrics_file}")

    except Exception as e:
        logger.error(f"Bootstrap failed: {e}", exc_info=True)
        metrics.increment("bootstrap_errors", 1)
        print(f"[ERROR] Bootstrap failed: {e}")
        sys.exit(1)
