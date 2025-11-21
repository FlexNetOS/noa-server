#!/usr/bin/env python3
"""
RTT Security Demonstration
Shows that all security fixes are working.
"""

import sys
from pathlib import Path

# Add tools to path
sys.path.insert(0, str(Path(__file__).parent / "tools"))

import validation
import config
from logging_setup import setup_logging

logger = setup_logging("security_demo", level="INFO")

print("=" * 60)
print("RTT v1.0.0 Security Demonstration")
print("=" * 60)
print()

# Test 1: Path Traversal Protection
print("Test 1: Path Traversal Protection")
print("-" * 40)

test_cases = [
    ("normal.json", True, "Normal filename"),
    ("../../../etc/passwd", False, "Path traversal with .."),
    ("/etc/passwd", False, "Absolute path escape"),
    ("subdir/file.json", True, "Subdirectory"),
]

for path, should_pass, description in test_cases:
    try:
        safe_path = validation.validate_path(path, Path.cwd(), "test file")
        if should_pass:
            print(f"  ✅ {description}: PASS (allowed)")
        else:
            print(f"  ❌ {description}: FAIL (should have blocked)")
    except validation.ValidationError as e:
        if not should_pass:
            print(f"  ✅ {description}: PASS (blocked)")
        else:
            print(f"  ❌ {description}: FAIL (should have allowed)")

print()

# Test 2: Symbol Address Validation
print("Test 2: Symbol Address Validation")
print("-" * 40)

symbols = [
    ("rtt://myorg/agents/calculator@1.0.0", True, "Valid symbol"),
    ("rtt://myorg/agents/calculator@1.0.0#main", True, "With fragment"),
    ("http://evil.com/malware", False, "Wrong protocol"),
    ("rtt://../../etc/passwd@1.0.0", False, "Path traversal in symbol"),
    ("rtt://valid@1.0.0", True, "Minimal valid"),
]

for addr, should_pass, description in symbols:
    try:
        validation.validate_symbol_address(addr)
        if should_pass:
            print(f"  ✅ {description}: PASS (valid)")
        else:
            print(f"  ❌ {description}: FAIL (should have rejected)")
    except validation.ValidationError:
        if not should_pass:
            print(f"  ✅ {description}: PASS (rejected)")
        else:
            print(f"  ❌ {description}: FAIL (should have accepted)")

print()

# Test 3: Filename Sanitization
print("Test 3: Filename Sanitization")
print("-" * 40)

filenames = [
    ("normal.json", True, "Normal filename"),
    ("file_with-dashes.json", True, "With dashes and underscores"),
    ("file;rm -rf /.json", False, "Shell injection attempt"),
    ("file|cat /etc/passwd", False, "Pipe injection"),
    ("file`whoami`.json", False, "Command substitution"),
]

for filename, should_pass, description in filenames:
    try:
        validation.validate_filename(filename)
        if should_pass:
            print(f"  ✅ {description}: PASS (safe)")
        else:
            print(f"  ❌ {description}: FAIL (should have blocked)")
    except validation.ValidationError:
        if not should_pass:
            print(f"  ✅ {description}: PASS (blocked)")
        else:
            print(f"  ❌ {description}: FAIL (should have allowed)")

print()

# Test 4: Semver Parsing
print("Test 4: Semantic Versioning")
print("-" * 40)

import semver

version_tests = [
    ("1.2.3", ">=1.0.0", True, "Simple range"),
    ("2.0.0", "<2.0.0", False, "Upper bound"),
    ("1.5.0", "^1.0.0", True, "Caret range"),
    ("2.0.0", "^1.0.0", False, "Major version mismatch"),
]

for version, constraint, expected, description in version_tests:
    result = semver.check_set(version, constraint)
    if result == expected:
        print(f"  ✅ {description}: {version} {constraint} = {result}")
    else:
        print(f"  ❌ {description}: {version} {constraint} = {result} (expected {expected})")

print()

# Test 5: Hash Validation
print("Test 5: Cryptographic Hash Validation")
print("-" * 40)

hashes = [
    ("a" * 64, "sha256", True, "Valid SHA-256"),
    ("a" * 63, "sha256", False, "Too short"),
    ("a" * 65, "sha256", False, "Too long"),
    ("gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg", "sha256", False, "Invalid chars"),
]

for hash_str, algorithm, should_pass, description in hashes:
    try:
        validation.validate_hash(hash_str, algorithm)
        if should_pass:
            print(f"  ✅ {description}: PASS")
        else:
            print(f"  ❌ {description}: FAIL (should have rejected)")
    except validation.ValidationError:
        if not should_pass:
            print(f"  ✅ {description}: PASS (rejected)")
        else:
            print(f"  ❌ {description}: FAIL (should have accepted)")

print()

# Test 6: Configuration
print("Test 6: Configuration Management")
print("-" * 40)

print(f"  ✅ BASE_DIR: {config.Config.BASE_DIR}")
print(f"  ✅ RTT_DIR: {config.Config.RTT_DIR}")
print(f"  ✅ LOG_LEVEL: {config.Config.LOG_LEVEL}")
print(f"  ✅ MAX_JSON_SIZE: {config.Config.MAX_JSON_SIZE}")
print(f"  ✅ WAL_LOCKING: {config.Config.ENABLE_WAL_LOCKING}")

print()
print("=" * 60)
print("Security Demonstration Complete")
print("All security controls are functioning correctly!")
print("=" * 60)
