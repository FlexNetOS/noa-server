#!/bin/bash
# RTT v1.0.0 Production Health Check
# Comprehensive system health validation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$RTT_ROOT"

echo "=========================================="
echo "RTT v1.0.0 Health Check"
echo "=========================================="
echo "Root: $RTT_ROOT"
echo "Time: $(date)"
echo ""

FAILED_CHECKS=0

# Helper functions
check_pass() {
    echo "✅ $1"
}

check_fail() {
    echo "❌ $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

check_warn() {
    echo "⚠️  $1"
}

# Check 1: Directory structure
check_dirs() {
    echo "📁 Checking directory structure..."
    local required_dirs=(".rtt" ".rtt/manifests" ".rtt/wal" ".rtt/cache" ".rtt/drivers" ".rtt/logs" ".rtt/metrics")
    local missing=0

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            check_fail "Missing directory: $dir"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -eq 0 ]; then
        check_pass "Directory structure complete (${#required_dirs[@]} directories)"
    fi
}

# Check 2: WAL chain integrity
check_wal() {
    echo ""
    echo "🔗 Checking WAL chain integrity..."

    if [ ! -d ".rtt/wal" ]; then
        check_fail "WAL directory missing"
        return 1
    fi

    python3 - <<'EOF'
import sys
from pathlib import Path
import json

wal_dir = Path(".rtt/wal")

# Check for LATEST pointer
if not (wal_dir / "LATEST").exists():
    print("⚠️  No WAL entries yet (fresh installation)")
    sys.exit(0)

# Count WAL entries
wal_entries = sorted(wal_dir.glob("*.wal.json"))
if not wal_entries:
    print("⚠️  LATEST exists but no WAL entries found")
    sys.exit(0)

print(f"✅ WAL chain contains {len(wal_entries)} entries")

# Verify chain integrity
try:
    prev_hash = "0" * 64
    for entry_file in wal_entries:
        with open(entry_file) as f:
            entry = json.load(f)

        if entry.get("prev") != prev_hash:
            print(f"❌ WAL chain broken at {entry_file.name}")
            print(f"   Expected prev: {prev_hash[:16]}...")
            print(f"   Got prev:      {entry.get('prev', 'None')[:16]}...")
            sys.exit(1)

        prev_hash = entry.get("root", prev_hash)

    print("✅ WAL chain integrity verified")
except Exception as e:
    print(f"❌ WAL verification failed: {e}")
    sys.exit(1)
EOF

    if [ $? -ne 0 ]; then
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Check 3: Manifest validation
check_manifests() {
    echo ""
    echo "📋 Checking manifests..."

    if [ ! -d ".rtt/manifests" ]; then
        check_warn "Manifests directory missing"
        return 0
    fi

    manifest_count=$(find .rtt/manifests -name "*.json" 2>/dev/null | wc -l)

    if [ $manifest_count -eq 0 ]; then
        check_warn "No manifests found (fresh installation)"
        return 0
    fi

    if [ -f "tests/validate.py" ]; then
        python3 tests/validate.py 2>/dev/null
        if [ $? -eq 0 ]; then
            check_pass "All manifests valid ($manifest_count files)"
        else
            check_fail "Manifest validation failed"
        fi
    else
        check_pass "Found $manifest_count manifest files"
    fi
}

# Check 4: CAS registry
check_cas() {
    echo ""
    echo "💾 Checking CAS registry..."

    if [ ! -d ".rtt/cache" ]; then
        check_warn "CAS cache directory missing"
        return 0
    fi

    cache_count=$(find .rtt/cache -type f 2>/dev/null | wc -l)

    if [ $cache_count -gt 0 ]; then
        cache_size=$(du -sh .rtt/cache 2>/dev/null | cut -f1)
        check_pass "CAS registry: $cache_count objects ($cache_size)"
    else
        check_warn "CAS registry empty (no cached objects)"
    fi
}

# Check 5: Generated connectors
check_connectors() {
    echo ""
    echo "🔌 Checking generated connectors..."

    if [ ! -d ".rtt/drivers/generated" ]; then
        check_warn "No generated connectors directory"
        return 0
    fi

    connector_count=$(find .rtt/drivers/generated -name "*.py" 2>/dev/null | wc -l)

    if [ $connector_count -gt 0 ]; then
        check_pass "Generated connectors: $connector_count files"
    else
        check_warn "No generated connectors (run 30-generate_connectors.py)"
    fi
}

# Check 6: Disk space
check_disk() {
    echo ""
    echo "💿 Checking disk space..."

    available=$(df -h . | awk 'NR==2 {print $4}')
    used=$(df -h . | awk 'NR==2 {print $3}')
    percent=$(df -h . | awk 'NR==2 {print $5}')

    check_pass "Disk space: $available available, $used used ($percent)"

    # Warn if less than 1GB available
    available_kb=$(df -k . | awk 'NR==2 {print $4}')
    if [ $available_kb -lt 1048576 ]; then
        check_warn "Low disk space (less than 1GB available)"
    fi
}

# Check 7: Python dependencies
check_python() {
    echo ""
    echo "🐍 Checking Python environment..."

    python_version=$(python3 --version 2>&1 | awk '{print $2}')
    check_pass "Python version: $python_version"

    # Check for required modules
    python3 -c "import json, pathlib, hashlib" 2>/dev/null
    if [ $? -eq 0 ]; then
        check_pass "Core Python modules available"
    else
        check_fail "Missing core Python modules"
    fi
}

# Check 8: Logging system
check_logs() {
    echo ""
    echo "📝 Checking logging system..."

    if [ -d ".rtt/logs" ]; then
        log_count=$(find .rtt/logs -name "*.log" 2>/dev/null | wc -l)
        if [ $log_count -gt 0 ]; then
            log_size=$(du -sh .rtt/logs 2>/dev/null | cut -f1)
            check_pass "Logs: $log_count files ($log_size)"
        else
            check_warn "No log files yet"
        fi
    else
        check_warn "Logs directory missing"
    fi
}

# Check 9: Metrics collection
check_metrics() {
    echo ""
    echo "📊 Checking metrics..."

    if [ -d ".rtt/metrics" ]; then
        metric_count=$(find .rtt/metrics -name "*.json" 2>/dev/null | wc -l)
        if [ $metric_count -gt 0 ]; then
            check_pass "Metrics: $metric_count snapshots"
        else
            check_warn "No metrics snapshots yet"
        fi
    else
        check_warn "Metrics directory missing"
    fi
}

# Check 10: Core automation scripts
check_automation() {
    echo ""
    echo "⚙️  Checking automation scripts..."

    local scripts=("auto/00-bootstrap.py" "auto/10-scan_symbols.py" "auto/20-depdoctor.py" "auto/30-generate_connectors.py")
    local missing=0

    for script in "${scripts[@]}"; do
        if [ ! -f "$script" ]; then
            check_fail "Missing script: $script"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -eq 0 ]; then
        check_pass "All core automation scripts present"
    fi
}

# Run all checks
check_dirs
check_wal
check_manifests
check_cas
check_connectors
check_disk
check_python
check_logs
check_metrics
check_automation

# Summary
echo ""
echo "=========================================="
if [ $FAILED_CHECKS -eq 0 ]; then
    echo "✅ All health checks passed!"
    echo "📊 System Status: HEALTHY"
    exit 0
else
    echo "❌ $FAILED_CHECKS health check(s) failed"
    echo "📊 System Status: DEGRADED"
    exit 1
fi
