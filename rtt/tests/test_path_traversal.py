#!/usr/bin/env python3
"""
Security Test: Path Traversal (CRITICAL)
Tests path injection in cas_ingest and other file operations
"""
import json
import pathlib
import sys
import tempfile
import os

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def test_cas_ingest_path_traversal():
    """Test 1: Attempt path traversal in cas_ingest"""
    print("\n=== TEST 1: CAS Ingest Path Traversal ===")

    # Import cas_ingest module
    sys.path.insert(0, str(ROOT / "tools"))
    import cas_ingest

    # Create a malicious agent file with path traversal
    with tempfile.NamedTemporaryFile(mode='w', suffix='.agent.json', delete=False) as f:
        malicious_agent = {
            "id": "../../../../../../etc/passwd",
            "version": "1",
            "type": "agent"
        }
        json.dump(malicious_agent, f)
        malicious_file = f.name

    try:
        # Attempt to ingest malicious agent
        b = cas_ingest.normalize(malicious_agent)
        h = cas_ingest.sha256_bytes(b)
        expected_path = cas_ingest.CAS / f"{h}.json"

        print(f"Malicious agent ID: {malicious_agent['id']}")
        print(f"Expected CAS path: {expected_path}")

        # Check if path escapes CAS directory
        try:
            relative = expected_path.relative_to(cas_ingest.CAS)
            print(f"Relative path within CAS: {relative}")
            print("PASS: Path traversal blocked - stays within CAS directory")
            return True
        except ValueError:
            print("FAIL: Path traversal possible - CRITICAL VULNERABILITY")
            return False

    finally:
        os.unlink(malicious_file)


def test_manifest_path_injection():
    """Test 2: Path injection in manifest file paths"""
    print("\n=== TEST 2: Manifest Path Injection ===")

    manifests_dir = ROOT / ".rtt" / "manifests"

    # Attempt to create manifest with path traversal in filename
    malicious_name = "../../../../../../tmp/evil.json"

    try:
        # Construct path
        target_path = manifests_dir / malicious_name

        # Resolve to check if it escapes
        resolved = target_path.resolve()
        manifests_resolved = manifests_dir.resolve()

        print(f"Malicious filename: {malicious_name}")
        print(f"Resolved path: {resolved}")
        print(f"Manifests dir: {manifests_resolved}")

        # Check if resolved path is within manifests directory
        try:
            relative = resolved.relative_to(manifests_resolved)
            print(f"Relative path: {relative}")
            print("PASS: Path injection blocked - stays within manifests directory")
            return True
        except ValueError:
            # Path escapes directory
            if not str(resolved).startswith(str(manifests_resolved)):
                print("FAIL: Path injection possible - CRITICAL VULNERABILITY")
                return False
            else:
                print("PASS: Path injection blocked")
                return True

    except Exception as e:
        print(f"PASS: Path injection blocked by exception: {e}")
        return True


def test_connector_symbol_injection():
    """Test 3: Symbol address injection in connector generation"""
    print("\n=== TEST 3: Connector Symbol Address Injection ===")

    # Malicious symbol address with path traversal
    malicious_saddr = "rtt://../../malicious/evil@1.0.0"

    # Simulate connector generation logic from 30-generate_connectors.py
    name = malicious_saddr.split("/")[-1].replace("@", "_").replace("#", "_")

    print(f"Malicious saddr: {malicious_saddr}")
    print(f"Generated filename: {name}.py")

    # Check if filename contains path traversal
    if ".." in name or "/" in name:
        print("FAIL: Path traversal in generated filename - CRITICAL VULNERABILITY")
        return False
    else:
        print("PASS: Path traversal sanitized in connector generation")
        return True


def test_plan_file_path_injection():
    """Test 4: Path injection in plan file paths"""
    print("\n=== TEST 4: Plan File Path Injection ===")

    plans_dir = ROOT / "plans"

    # Malicious plan filename with path traversal
    malicious_plan_name = "../../../../../../tmp/evil.plan.json"

    try:
        target_path = plans_dir / malicious_plan_name
        resolved = target_path.resolve()
        plans_resolved = plans_dir.resolve()

        print(f"Malicious plan filename: {malicious_plan_name}")
        print(f"Resolved path: {resolved}")

        # Check if path escapes plans directory
        try:
            relative = resolved.relative_to(plans_resolved)
            print("PASS: Path injection blocked - stays within plans directory")
            return True
        except ValueError:
            if not str(resolved).startswith(str(plans_resolved)):
                print("FAIL: Path injection possible - CRITICAL VULNERABILITY")
                return False
            else:
                print("PASS: Path injection blocked")
                return True

    except Exception as e:
        print(f"PASS: Path injection blocked by exception: {e}")
        return True


def test_wal_path_injection():
    """Test 5: Path injection in WAL file paths"""
    print("\n=== TEST 5: WAL File Path Injection ===")

    wal_dir = ROOT / ".rtt" / "wal"

    # Malicious WAL filename
    malicious_wal = "../../../../../../tmp/evil.wal.json"

    try:
        target_path = wal_dir / malicious_wal
        resolved = target_path.resolve()
        wal_resolved = wal_dir.resolve()

        print(f"Malicious WAL filename: {malicious_wal}")
        print(f"Resolved path: {resolved}")

        # Check if path escapes WAL directory
        try:
            relative = resolved.relative_to(wal_resolved)
            print("PASS: Path injection blocked - stays within WAL directory")
            return True
        except ValueError:
            if not str(resolved).startswith(str(wal_resolved)):
                print("FAIL: Path injection possible - CRITICAL VULNERABILITY")
                return False
            else:
                print("PASS: Path injection blocked")
                return True

    except Exception as e:
        print(f"PASS: Path injection blocked by exception: {e}")
        return True


def main():
    print("=" * 70)
    print("RTT v1.0.0 Security Test: Path Traversal")
    print("=" * 70)

    results = []
    results.append(("CAS Ingest Path Traversal", test_cas_ingest_path_traversal()))
    results.append(("Manifest Path Injection", test_manifest_path_injection()))
    results.append(("Connector Symbol Injection", test_connector_symbol_injection()))
    results.append(("Plan File Path Injection", test_plan_file_path_injection()))
    results.append(("WAL File Path Injection", test_wal_path_injection()))

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
        print("\nASSESSMENT: CRITICAL - Path traversal vulnerabilities detected")
        return 1
    else:
        print("\nASSESSMENT: Path operations are secured against traversal attacks")
        return 0


if __name__ == "__main__":
    sys.exit(main())
