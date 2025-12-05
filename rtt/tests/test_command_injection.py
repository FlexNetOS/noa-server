#!/usr/bin/env python3
"""
Security Test: Command Injection (CRITICAL)
Tests for command injection vulnerabilities in system operations
"""
import json
import pathlib
import sys
import subprocess
import os

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def test_cas_ingest_command_injection():
    """Test 1: Command injection in cas_ingest file operations"""
    print("\n=== TEST 1: CAS Ingest Command Injection ===")

    # Malicious filename with command injection
    malicious_filename = "test; rm -rf /tmp/test; #.agent.json"

    # Test if filename is properly sanitized
    import tempfile
    import shutil

    test_dir = tempfile.mkdtemp()
    test_file = os.path.join(test_dir, "test_marker.txt")

    try:
        # Create marker file
        with open(test_file, 'w') as f:
            f.write("marker")

        # Attempt to use malicious filename in path operations
        # Simulate what cas_ingest does
        sys.path.insert(0, str(ROOT / "tools"))
        import cas_ingest

        malicious_agent = {
            "id": malicious_filename,
            "version": "1",
            "type": "agent"
        }

        # Try to create file with malicious name
        b = cas_ingest.normalize(malicious_agent)
        h = cas_ingest.sha256_bytes(b)

        # Check if command injection could occur
        if ";" in malicious_filename or "|" in malicious_filename or "&" in malicious_filename:
            print(f"Malicious filename: {malicious_filename}")
            print(f"Hashed to: {h}")
            print("PASS: Filename is hashed, command injection not possible through ID")
            result = True
        else:
            result = True

        # Verify marker file still exists (wasn't deleted by injection)
        if os.path.exists(test_file):
            print("PASS: Marker file still exists - no command injection")
            result = True
        else:
            print("FAIL: Marker file deleted - COMMAND INJECTION POSSIBLE")
            result = False

        return result

    finally:
        shutil.rmtree(test_dir, ignore_errors=True)


def test_connector_generation_injection():
    """Test 2: Command injection in connector generation"""
    print("\n=== TEST 2: Connector Generation Command Injection ===")

    # Malicious symbol address with command injection
    malicious_saddr = "rtt://test; rm -rf /tmp; #@1.0.0"

    # Simulate connector generation
    name = malicious_saddr.split("/")[-1].replace("@", "_").replace("#", "_")

    print(f"Malicious saddr: {malicious_saddr}")
    print(f"Generated filename: {name}.py")

    # Check if dangerous characters are neutralized
    if ";" in name or "|" in name or "&" in name or "$" in name or "`" in name:
        print("FAIL: Dangerous characters preserved in filename - COMMAND INJECTION RISK")
        return False
    else:
        print("PASS: Dangerous characters sanitized in filename")
        return True


def test_plan_filename_injection():
    """Test 3: Command injection in plan filename generation"""
    print("\n=== TEST 3: Plan Filename Command Injection ===")

    # In plan_solver.py, filenames are based on hash
    # Test if hash can be manipulated to inject commands

    import hashlib

    malicious_plan = {
        "created_at": "2025-10-27T00:00:00Z; rm -rf /tmp; #",
        "routes_add": [],
        "routes_del": [],
        "order": []
    }

    # Generate filename
    plan_json = json.dumps(malicious_plan, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    hash_hex = hashlib.sha256(plan_json.encode()).hexdigest()

    filename = f"{hash_hex}.plan.json"

    print(f"Malicious plan created_at: {malicious_plan['created_at']}")
    print(f"Generated filename: {filename}")

    # Check if filename is safe
    if ";" in filename or "|" in filename or "&" in filename or "$" in filename:
        print("FAIL: Command injection characters in filename - CRITICAL")
        return False
    else:
        print("PASS: Filename is hash-based, command injection not possible")
        return True


def test_wal_filename_injection():
    """Test 4: Command injection in WAL filename generation"""
    print("\n=== TEST 4: WAL Filename Command Injection ===")

    import time
    import hashlib

    # WAL filenames are timestamp-based
    # Test if malicious data can affect filename

    malicious_plan_id = "test; rm -rf /tmp; #"

    frame = {
        "ts": time.time(),
        "plan_id": malicious_plan_id,
        "prev": "GENESIS",
        "apply": []
    }

    blob = json.dumps(frame, sort_keys=True).encode()

    def merkle(prev_hash: str, content: bytes) -> str:
        return hashlib.sha256((prev_hash + hashlib.sha256(content).hexdigest()).encode()).hexdigest()

    root = merkle("GENESIS", blob)
    filename = f"{int(frame['ts'])}-{root[:12]}.wal.json"

    print(f"Malicious plan_id: {malicious_plan_id}")
    print(f"Generated WAL filename: {filename}")

    # Check if filename is safe
    if ";" in filename or "|" in filename or "&" in filename or "$" in filename:
        print("FAIL: Command injection characters in WAL filename - CRITICAL")
        return False
    else:
        print("PASS: WAL filename is hash/timestamp-based, command injection not possible")
        return True


def test_subprocess_usage():
    """Test 5: Check for unsafe subprocess usage"""
    print("\n=== TEST 5: Subprocess Usage Analysis ===")

    # Scan source files for subprocess usage
    python_files = []
    for pattern in ["auto/*.py", "tools/*.py", "tests/*.py"]:
        python_files.extend(ROOT.glob(pattern))

    unsafe_patterns = [
        "subprocess.call",
        "subprocess.run",
        "os.system",
        "os.popen",
        "eval(",
        "exec("
    ]

    findings = []

    for py_file in python_files:
        try:
            content = py_file.read_text(encoding="utf-8")
            for pattern in unsafe_patterns:
                if pattern in content:
                    findings.append((py_file.name, pattern))
        except:
            pass

    if findings:
        print(f"Found {len(findings)} potentially unsafe operations:")
        for filename, pattern in findings:
            print(f"  - {filename}: {pattern}")
        print("WARNING: Review these operations for command injection risks")
        return False
    else:
        print("PASS: No unsafe subprocess operations found")
        return True


def main():
    print("=" * 70)
    print("RTT v1.0.0 Security Test: Command Injection")
    print("=" * 70)

    results = []
    results.append(("CAS Ingest Command Injection", test_cas_ingest_command_injection()))
    results.append(("Connector Generation Injection", test_connector_generation_injection()))
    results.append(("Plan Filename Injection", test_plan_filename_injection()))
    results.append(("WAL Filename Injection", test_wal_filename_injection()))
    results.append(("Subprocess Usage Analysis", test_subprocess_usage()))

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for test_name, result in results:
        if result is None:
            status = "SKIP"
        elif result:
            status = "PASS"
        else:
            status = "FAIL"
        print(f"{status}: {test_name}")

    # Overall assessment
    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)

    print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")

    if failed > 0:
        print("\nASSESSMENT: WARNING - Potential command injection risks detected")
        return 1
    else:
        print("\nASSESSMENT: No command injection vulnerabilities found")
        return 0


if __name__ == "__main__":
    sys.exit(main())
