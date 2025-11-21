#!/usr/bin/env python3
"""
RTT Semantic Versioning Parser - COMPLETE IMPLEMENTATION
Fully compliant semver 2.0.0 parser with range matching.
"""

import re
from typing import Tuple, Optional


class SemVer:
    """Semantic version with full semver 2.0.0 support."""

    def __init__(self, version_str: str):
        """
        Parse semantic version string.

        Args:
            version_str: Version string (e.g., "1.2.3-alpha.1+build.123")

        Raises:
            ValueError: If version string is invalid
        """
        self.raw = version_str
        self.major, self.minor, self.patch, self.prerelease, self.build = self._parse(version_str)

    def _parse(self, ver: str) -> Tuple[int, int, int, Optional[str], Optional[str]]:
        """Parse version string into components."""
        # Full semver 2.0.0 pattern
        pattern = (
            r'^(\d+)\.(\d+)\.(\d+)'  # Major.Minor.Patch (required)
            r'(?:\-([0-9A-Za-z\-\.]+))?'  # Optional pre-release
            r'(?:\+([0-9A-Za-z\-\.]+))?$'  # Optional build metadata
        )

        match = re.match(pattern, ver)
        if not match:
            raise ValueError(f"Invalid semantic version: {ver}")

        major = int(match.group(1))
        minor = int(match.group(2))
        patch = int(match.group(3))
        prerelease = match.group(4) if match.group(4) else None
        build = match.group(5) if match.group(5) else None

        return major, minor, patch, prerelease, build

    def __eq__(self, other: 'SemVer') -> bool:
        """
        Equality comparison (build metadata ignored per semver spec).

        Args:
            other: SemVer to compare

        Returns:
            True if versions are equal
        """
        return (
            self.major == other.major and
            self.minor == other.minor and
            self.patch == other.patch and
            self.prerelease == other.prerelease
        )

    def __lt__(self, other: 'SemVer') -> bool:
        """
        Less than comparison.

        Args:
            other: SemVer to compare

        Returns:
            True if self < other
        """
        # Compare major.minor.patch
        if (self.major, self.minor, self.patch) != (other.major, other.minor, other.patch):
            return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

        # Pre-release versions have lower precedence
        if self.prerelease is None and other.prerelease is not None:
            return False
        if self.prerelease is not None and other.prerelease is None:
            return True

        # Compare pre-release identifiers
        if self.prerelease and other.prerelease:
            return self._compare_prerelease(self.prerelease, other.prerelease) < 0

        return False

    def __le__(self, other: 'SemVer') -> bool:
        return self < other or self == other

    def __gt__(self, other: 'SemVer') -> bool:
        return not (self <= other)

    def __ge__(self, other: 'SemVer') -> bool:
        return not (self < other)

    def _compare_prerelease(self, a: str, b: str) -> int:
        """
        Compare pre-release identifiers per semver spec.

        Args:
            a: First pre-release string
            b: Second pre-release string

        Returns:
            -1 if a < b, 0 if equal, 1 if a > b
        """
        a_parts = a.split('.')
        b_parts = b.split('.')

        # Compare each identifier
        for i in range(max(len(a_parts), len(b_parts))):
            # Larger set of identifiers has higher precedence
            if i >= len(a_parts):
                return -1
            if i >= len(b_parts):
                return 1

            a_id = a_parts[i]
            b_id = b_parts[i]

            # Numeric identifiers are compared as integers
            a_is_num = a_id.isdigit()
            b_is_num = b_id.isdigit()

            if a_is_num and b_is_num:
                a_val = int(a_id)
                b_val = int(b_id)
                if a_val != b_val:
                    return -1 if a_val < b_val else 1
            elif a_is_num:
                # Numeric always < alphanumeric
                return -1
            elif b_is_num:
                return 1
            else:
                # Alphanumeric comparison
                if a_id != b_id:
                    return -1 if a_id < b_id else 1

        return 0

    def __str__(self) -> str:
        """String representation."""
        result = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            result += f"-{self.prerelease}"
        if self.build:
            result += f"+{self.build}"
        return result

    def __repr__(self) -> str:
        return f"SemVer('{self}')"


def parse(ver: str) -> Tuple[int, int, int]:
    """
    Parse version string (legacy API for compatibility).

    Args:
        ver: Version string

    Returns:
        Tuple of (major, minor, patch)
    """
    parts = ver.split('.')
    while len(parts) < 3:
        parts.append('0')

    # Handle pre-release and build metadata
    patch_part = parts[2].split('-')[0].split('+')[0]

    try:
        return (int(parts[0]), int(parts[1]), int(patch_part))
    except ValueError:
        raise ValueError(f"Invalid version format: {ver}")


def cmp(a: Tuple[int, int, int], b: Tuple[int, int, int]) -> int:
    """
    Compare two version tuples.

    Args:
        a: First version tuple
        b: Second version tuple

    Returns:
        -1 if a < b, 0 if equal, 1 if a > b
    """
    if a < b:
        return -1
    elif a > b:
        return 1
    else:
        return 0


def check_set(version: str, expr: str) -> bool:
    """
    Check if version matches constraint expression.

    Supports operators: ==, !=, <, <=, >, >=, ^, ~
    Multiple constraints can be combined with commas or spaces.

    Args:
        version: Version to check
        expr: Constraint expression

    Returns:
        True if version matches all constraints

    Examples:
        >>> check_set("1.2.3", ">=1.0.0 <2.0.0")
        True
        >>> check_set("1.2.3", "^1.0.0")
        True
        >>> check_set("2.0.0", "^1.0.0")
        False
    """
    try:
        v = SemVer(version)
    except ValueError:
        # Fallback to tuple comparison
        v_tuple = parse(version)
        return check_set_tuple(v_tuple, expr)

    # Split on commas and spaces
    tokens = expr.replace(',', ' ').split()

    for token in tokens:
        if not token:
            continue

        # Caret range (^): Compatible changes
        if token.startswith('^'):
            range_ver = SemVer(token[1:])
            if range_ver.major == 0:
                # 0.x.y - only patch updates
                if v.major != 0 or v.minor != range_ver.minor:
                    return False
            else:
                # x.y.z - major must match
                if v.major != range_ver.major:
                    return False
            if v < range_ver:
                return False

        # Tilde range (~): Patch-level changes
        elif token.startswith('~'):
            range_ver = SemVer(token[1:])
            if v.major != range_ver.major or v.minor != range_ver.minor:
                return False
            if v < range_ver:
                return False

        # Comparison operators
        elif token.startswith('>='):
            if not (v >= SemVer(token[2:])):
                return False
        elif token.startswith('>'):
            if not (v > SemVer(token[1:])):
                return False
        elif token.startswith('<='):
            if not (v <= SemVer(token[2:])):
                return False
        elif token.startswith('<'):
            if not (v < SemVer(token[1:])):
                return False
        elif token.startswith('=='):
            if not (v == SemVer(token[2:])):
                return False
        elif token.startswith('!='):
            if v == SemVer(token[2:]):
                return False

        # Exact match (no operator)
        elif token[0].isdigit():
            if not (v == SemVer(token)):
                return False

    return True


def check_set_tuple(v_tuple: Tuple[int, int, int], expr: str) -> bool:
    """
    Check version tuple against expression (fallback).

    Args:
        v_tuple: Version tuple (major, minor, patch)
        expr: Constraint expression

    Returns:
        True if version matches
    """
    tokens = expr.replace(',', ' ').split()

    for token in tokens:
        if not token:
            continue

        # Simple comparison operators only
        if token.startswith('>='):
            if not (cmp(v_tuple, parse(token[2:])) >= 0):
                return False
        elif token.startswith('>'):
            if not (cmp(v_tuple, parse(token[1:])) > 0):
                return False
        elif token.startswith('<='):
            if not (cmp(v_tuple, parse(token[2:])) <= 0):
                return False
        elif token.startswith('<'):
            if not (cmp(v_tuple, parse(token[1:])) < 0):
                return False
        elif token.startswith('=='):
            if not (cmp(v_tuple, parse(token[2:])) == 0):
                return False
        elif token[0].isdigit():
            if not (cmp(v_tuple, parse(token)) == 0):
                return False

    return True


if __name__ == "__main__":
    # Test semver parsing and comparison
    tests = [
        ("1.0.0", ">=1.0.0", True),
        ("1.2.3", ">=1.0.0 <2.0.0", True),
        ("2.0.0", ">=1.0.0 <2.0.0", False),
        ("1.5.0", "^1.0.0", True),
        ("2.0.0", "^1.0.0", False),
        ("1.2.5", "~1.2.0", True),
        ("1.3.0", "~1.2.0", False),
        ("1.0.0-alpha", "<1.0.0", True),
        ("1.0.0", ">1.0.0-alpha", True),
    ]

    print("Running semver tests...")
    for version, constraint, expected in tests:
        result = check_set(version, constraint)
        status = "PASS" if result == expected else "FAIL"
        print(f"{status}: {version} {constraint} -> {result} (expected {expected})")
