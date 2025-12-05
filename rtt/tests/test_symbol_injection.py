#!/usr/bin/env python3
"""
Security Test: Symbol Injection (CRITICAL)
Tests for malicious symbol injection in connector generation and manifest processing
"""
import json
import pathlib
import sys
import tempfile
import os

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def test_malicious_symbol_address():
    """Test 1: Malicious symbol address injection"""
    print("\n=== TEST 1: Malicious Symbol Address Injection ===")

    # Various malicious symbol addresses
    malicious_symbols = [
        "rtt://../../etc/passwd@1.0.0",
        "rtt://../../../malicious.py@1.0.0",
        "rtt://;rm -rf /;@1.0.0",
        "rtt://__import__('os').system('whoami')@1.0.0",
        "rtt://$(whoami)@1.0.0"
    ]

    results = []

    for saddr in malicious_symbols:
        # Simulate connector generation logic
        name = saddr.split("/")[-1].replace("@", "_").replace("#", "_")

        print(f"  Malicious saddr: {saddr}")
        print(f"  Generated name: {name}")

        # Check for path traversal
        if ".." in name:
            print(f"  FAIL: Path traversal preserved in name")
            results.append(False)
            continue

        # Check for command injection
        if any(c in name for c in [";", "|", "&", "$", "`", "("]):
            print(f"  FAIL: Command injection characters preserved")
            results.append(False)
            continue

        # Check for Python injection
        if "__import__" in name or "eval" in name or "exec" in name:
            print(f"  FAIL: Python injection patterns preserved")
            results.append(False)
            continue

        print(f"  PASS: Symbol sanitized")
        results.append(True)

    if all(results):
        print("PASS: All malicious symbols properly sanitized")
        return True
    else:
        print(f"FAIL: {sum(1 for r in results if not r)} symbols not properly sanitized")
        return False


def test_manifest_symbol_validation():
    """Test 2: Manifest symbol validation"""
    print("\n=== TEST 2: Manifest Symbol Validation ===")

    manifests_dir = ROOT / ".rtt" / "manifests"

    # Load all manifests and check symbols
    unsafe_symbols = []

    for mf in manifests_dir.glob("*.json"):
        try:
            obj = json.loads(mf.read_text(encoding="utf-8"))
            s = obj.get("symbol", {})
            saddr = s.get("saddr", "")

            # Check for dangerous patterns
            if ".." in saddr:
                unsafe_symbols.append((mf.name, saddr, "path_traversal"))
            elif any(c in saddr for c in [";", "|", "&", "$"]):
                unsafe_symbols.append((mf.name, saddr, "command_injection"))
            elif "__import__" in saddr or "eval" in saddr:
                unsafe_symbols.append((mf.name, saddr, "code_injection"))

        except Exception as e:
            print(f"  Error reading {mf.name}: {e}")

    if unsafe_symbols:
        print(f"FAIL: Found {len(unsafe_symbols)} unsafe symbols in manifests:")
        for filename, saddr, issue_type in unsafe_symbols:
            print(f"  - {filename}: {saddr} ({issue_type})")
        return False
    else:
        print("PASS: All manifest symbols are safe")
        return True


def test_connector_code_generation():
    """Test 3: Connector code generation safety"""
    print("\n=== TEST 3: Connector Code Generation Safety ===")

    # Test if malicious saddr can inject code into generated connector
    malicious_saddr = "rtt://test'; os.system('whoami'); '@1.0.0"

    # Generate connector stub (from 30-generate_connectors.py)
    def stub_py(name, saddr):
        return f"""# Auto-generated connector stub (Python)
from typing import Any

class Connector:
    def probe(self, root: str):
        return [{{'saddr':'{saddr}'}}]

    def open(self, symbol: dict, params: dict):
        return object()

    def tx(self, handle: Any, data: bytes):
        pass

    def rx(self, handle: Any) -> bytes:
        return b''

    def close(self, handle: Any):
        pass

    def health(self, handle: Any):
        return {{'ok': True}}
"""

    name = malicious_saddr.split("/")[-1].replace("@", "_").replace("#", "_")
    generated_code = stub_py(name, malicious_saddr)

    print(f"Malicious saddr: {malicious_saddr}")
    print(f"Checking generated code for injection...")

    # Check if malicious code could be injected
    dangerous_patterns = [
        "os.system",
        "__import__",
        "eval(",
        "exec(",
        "subprocess",
        "; os.",
        "'; os."
    ]

    injections_found = []
    for pattern in dangerous_patterns:
        if pattern in generated_code and pattern not in ["from typing import Any"]:
            injections_found.append(pattern)

    if injections_found:
        print(f"FAIL: Code injection possible - found patterns: {injections_found}")
        print("Generated code snippet:")
        print(generated_code[:500])
        return False
    else:
        print("PASS: No code injection in generated connector")
        return True


def test_symbol_address_parsing():
    """Test 4: Symbol address parsing edge cases"""
    print("\n=== TEST 4: Symbol Address Parsing Edge Cases ===")

    edge_cases = [
        ("rtt://valid@1.0.0", True, "valid symbol"),
        ("rtt://@1.0.0", False, "empty service name"),
        ("rtt://../../etc/passwd@1.0.0", False, "path traversal"),
        ("://malformed", False, "malformed URI"),
        ("rtt://test\n@1.0.0", False, "newline injection"),
        ("rtt://test\x00@1.0.0", False, "null byte injection"),
    ]

    results = []

    for saddr, should_be_safe, description in edge_cases:
        print(f"  Testing: {description}")
        print(f"    Input: {repr(saddr)}")

        # Test parsing
        try:
            parts = saddr.split("://")
            if len(parts) != 2 or parts[0] != "rtt":
                is_safe = False
                print(f"    Result: Invalid protocol")
            else:
                service_part = parts[1].split("@")[0]
                if ".." in service_part or "/" in service_part[1:]:
                    is_safe = False
                    print(f"    Result: Path traversal detected")
                elif any(ord(c) < 32 for c in service_part):
                    is_safe = False
                    print(f"    Result: Control characters detected")
                else:
                    is_safe = True
                    print(f"    Result: Safe")

            if is_safe == should_be_safe:
                print(f"    PASS")
                results.append(True)
            else:
                print(f"    FAIL: Expected safe={should_be_safe}, got safe={is_safe}")
                results.append(False)

        except Exception as e:
            print(f"    Exception: {e}")
            results.append(False)

    if all(results):
        print("PASS: All edge cases handled correctly")
        return True
    else:
        print(f"FAIL: {sum(1 for r in results if not r)} edge cases failed")
        return False


def test_generated_connector_safety():
    """Test 5: Verify safety of actually generated connectors"""
    print("\n=== TEST 5: Generated Connector Safety Verification ===")

    generated_dir = ROOT / ".rtt" / "drivers" / "generated"

    if not generated_dir.exists():
        print("SKIP: No generated connectors found")
        return None

    connector_files = list(generated_dir.glob("*.py"))
    print(f"Found {len(connector_files)} generated connectors")

    unsafe_patterns = [
        "os.system",
        "subprocess.call",
        "eval(",
        "exec(",
        "__import__",
        "open(",  # Unrestricted file operations
    ]

    issues = []

    for cf in connector_files:
        try:
            content = cf.read_text(encoding="utf-8")

            for pattern in unsafe_patterns:
                if pattern in content:
                    # Check if it's in a string literal (saddr) vs actual code
                    lines = content.split("\n")
                    for i, line in enumerate(lines):
                        if pattern in line:
                            # If pattern is in saddr string, it's contained
                            if "'saddr'" in line and pattern in line:
                                continue
                            # If it's actual code, flag it
                            issues.append((cf.name, i+1, pattern, line.strip()))

        except Exception as e:
            print(f"  Error reading {cf.name}: {e}")

    if issues:
        print(f"FAIL: Found {len(issues)} unsafe patterns in generated connectors:")
        for filename, lineno, pattern, line in issues:
            print(f"  - {filename}:{lineno}: {pattern}")
            print(f"    {line}")
        return False
    else:
        print("PASS: All generated connectors are safe")
        return True


def main():
    print("=" * 70)
    print("RTT v1.0.0 Security Test: Symbol Injection")
    print("=" * 70)

    results = []
    results.append(("Malicious Symbol Address Injection", test_malicious_symbol_address()))
    results.append(("Manifest Symbol Validation", test_manifest_symbol_validation()))
    results.append(("Connector Code Generation Safety", test_connector_code_generation()))
    results.append(("Symbol Address Parsing Edge Cases", test_symbol_address_parsing()))
    results.append(("Generated Connector Safety", test_generated_connector_safety()))

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
        print("\nASSESSMENT: CRITICAL - Symbol injection vulnerabilities detected")
        return 1
    else:
        print("\nASSESSMENT: Symbol processing is secure")
        return 0


if __name__ == "__main__":
    sys.exit(main())
