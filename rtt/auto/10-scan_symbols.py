#!/usr/bin/env python3
"""
RTT v1.0.0 - Symbol Scanner
Scan manifests and build symbol index.
"""
import os
import sys
import json
import pathlib

# Add parent to path for imports
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.logger import get_logger
from tools.metrics import get_metrics, timed

# Initialize logging and metrics
logger = get_logger("rtt.scanner")
metrics = get_metrics()

logger.info("Starting symbol scan")

INDEX = ROOT / "rtt_elite_addon" / "index" / "symbols.index.json"
MANIFESTS = ROOT / ".rtt" / "manifests"

symbols = []
errors = []

with timed(metrics, "symbol_scan_duration"):
    try:
        if not MANIFESTS.exists():
            logger.warning(f"Manifests directory not found: {MANIFESTS}")
            print("[WARN] No manifests directory found")
            sys.exit(0)

        manifest_files = list(MANIFESTS.glob("*.json"))
        logger.info(f"Found {len(manifest_files)} manifest files")

        for mf in manifest_files:
            try:
                obj = json.loads(mf.read_text(encoding="utf-8"))
                saddr = obj.get("symbol", {}).get("saddr")
                stype = obj.get("symbol", {}).get("type")

                if saddr and stype:
                    symbols.append({
                        "source": "manifest",
                        "saddr": saddr,
                        "type": stype,
                        "path": str(mf)
                    })
                    logger.debug(f"Found symbol: {saddr} ({stype})")
                    metrics.increment("symbols_found", 1)
                else:
                    logger.warning(f"Incomplete symbol in {mf.name}")
                    metrics.increment("incomplete_symbols", 1)

            except json.JSONDecodeError as e:
                error_msg = f"Invalid JSON in {mf.name}: {e}"
                logger.error(error_msg)
                errors.append(error_msg)
                metrics.increment("json_errors", 1)

            except Exception as e:
                error_msg = f"Error processing {mf.name}: {e}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
                metrics.increment("processing_errors", 1)

        # Write index
        INDEX.parent.mkdir(parents=True, exist_ok=True)
        index_data = {"symbols": symbols}

        if errors:
            index_data["errors"] = errors

        INDEX.write_text(json.dumps(index_data, indent=2), encoding="utf-8")

        metrics.set_gauge("total_symbols", len(symbols))
        metrics.set_gauge("total_errors", len(errors))

        logger.info(f"Symbol scan complete: {len(symbols)} symbols, {len(errors)} errors")
        print(f"[OK] Wrote {len(symbols)} symbols to {INDEX}")
        if errors:
            print(f"[WARN] {len(errors)} errors during scan")

        # Export metrics
        metrics_file = metrics.export("scanner-metrics.json")
        logger.info(f"Metrics exported to: {metrics_file}")

    except Exception as e:
        logger.error(f"Symbol scan failed: {e}", exc_info=True)
        metrics.increment("scan_failures", 1)
        print(f"[ERROR] Symbol scan failed: {e}")
        sys.exit(1)
