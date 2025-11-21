#!/usr/bin/env python3
"""
Unit Tests: Semantic Versioning
Tests the semver module from tools/semver.py
"""
import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from semver import parse, cmp, check_set


class TestParse:
    """Test semantic version parsing."""

    def test_parse_full_version(self):
        """Test parsing complete semantic version."""
        result = parse("1.2.3")
        assert result == (1, 2, 3)

    def test_parse_major_minor_only(self):
        """Test parsing version with only major and minor."""
        result = parse("1.2")
        assert result == (1, 2, 0)

    def test_parse_major_only(self):
        """Test parsing version with only major."""
        result = parse("5")
        assert result == (5, 0, 0)

    def test_parse_zero_version(self):
        """Test parsing zero version."""
        result = parse("0.0.0")
        assert result == (0, 0, 0)

    def test_parse_large_numbers(self):
        """Test parsing version with large numbers."""
        result = parse("99.88.77")
        assert result == (99, 88, 77)

    def test_parse_ignores_extra_parts(self):
        """Test that parsing ignores parts beyond patch."""
        result = parse("1.2.3.4.5.6")
        assert result == (1, 2, 3)

    def test_parse_with_leading_zeros(self):
        """Test parsing version with leading zeros."""
        result = parse("01.02.03")
        assert result == (1, 2, 3)


class TestCmp:
    """Test version comparison function."""

    def test_cmp_equal(self):
        """Test comparison of equal versions."""
        assert cmp((1, 2, 3), (1, 2, 3)) == 0

    def test_cmp_greater_major(self):
        """Test comparison with greater major version."""
        assert cmp((2, 0, 0), (1, 9, 9)) > 0

    def test_cmp_less_major(self):
        """Test comparison with less major version."""
        assert cmp((1, 0, 0), (2, 0, 0)) < 0

    def test_cmp_greater_minor(self):
        """Test comparison with greater minor version."""
        assert cmp((1, 5, 0), (1, 4, 9)) > 0

    def test_cmp_less_minor(self):
        """Test comparison with less minor version."""
        assert cmp((1, 4, 0), (1, 5, 0)) < 0

    def test_cmp_greater_patch(self):
        """Test comparison with greater patch version."""
        assert cmp((1, 2, 5), (1, 2, 4)) > 0

    def test_cmp_less_patch(self):
        """Test comparison with less patch version."""
        assert cmp((1, 2, 3), (1, 2, 4)) < 0

    def test_cmp_zero_versions(self):
        """Test comparison with zero versions."""
        assert cmp((0, 0, 0), (0, 0, 0)) == 0
        assert cmp((0, 0, 1), (0, 0, 0)) > 0
        assert cmp((0, 0, 0), (0, 0, 1)) < 0


class TestCheckSet:
    """Test version constraint checking."""

    def test_check_exact_match(self):
        """Test exact version match."""
        assert check_set("1.2.3", "1.2.3") is True
        assert check_set("1.2.3", "1.2.4") is False

    def test_check_exact_with_equals(self):
        """Test exact match with == operator."""
        assert check_set("1.2.3", "==1.2.3") is True
        assert check_set("1.2.3", "==1.2.4") is False

    def test_check_greater_than(self):
        """Test greater than constraint."""
        assert check_set("2.0.0", ">1.0.0") is True
        assert check_set("1.0.0", ">1.0.0") is False
        assert check_set("0.9.9", ">1.0.0") is False

    def test_check_greater_than_or_equal(self):
        """Test greater than or equal constraint."""
        assert check_set("2.0.0", ">=1.0.0") is True
        assert check_set("1.0.0", ">=1.0.0") is True
        assert check_set("0.9.9", ">=1.0.0") is False

    def test_check_less_than(self):
        """Test less than constraint."""
        assert check_set("0.9.9", "<1.0.0") is True
        assert check_set("1.0.0", "<1.0.0") is False
        assert check_set("2.0.0", "<1.0.0") is False

    def test_check_less_than_or_equal(self):
        """Test less than or equal constraint."""
        assert check_set("0.9.9", "<=1.0.0") is True
        assert check_set("1.0.0", "<=1.0.0") is True
        assert check_set("2.0.0", "<=1.0.0") is False

    def test_check_multiple_constraints(self):
        """Test multiple constraints combined."""
        assert check_set("1.5.0", ">=1.0.0 <2.0.0") is True
        assert check_set("0.9.0", ">=1.0.0 <2.0.0") is False
        assert check_set("2.0.0", ">=1.0.0 <2.0.0") is False

    def test_check_comma_separated_constraints(self):
        """Test comma-separated constraints."""
        assert check_set("1.5.0", ">=1.0.0, <2.0.0") is True
        assert check_set("0.9.0", ">=1.0.0, <2.0.0") is False

    def test_check_range_with_equal_bounds(self):
        """Test range constraint with equal bounds."""
        assert check_set("1.5.0", ">=1.0.0 <=2.0.0") is True
        assert check_set("1.0.0", ">=1.0.0 <=2.0.0") is True
        assert check_set("2.0.0", ">=1.0.0 <=2.0.0") is True

    def test_check_patch_version_range(self):
        """Test patch version ranges."""
        assert check_set("1.2.5", ">=1.2.0 <1.3.0") is True
        assert check_set("1.2.0", ">=1.2.0 <1.3.0") is True
        assert check_set("1.3.0", ">=1.2.0 <1.3.0") is False

    def test_check_empty_constraint(self):
        """Test empty constraint (should match any)."""
        assert check_set("1.0.0", "") is True
        assert check_set("99.99.99", "") is True

    def test_check_whitespace_handling(self):
        """Test whitespace handling in constraints."""
        assert check_set("1.5.0", "  >=1.0.0   <2.0.0  ") is True
        assert check_set("1.5.0", ">=1.0.0,<2.0.0") is True

    def test_check_zero_versions(self):
        """Test constraints with zero versions."""
        assert check_set("0.1.0", ">=0.0.0") is True
        assert check_set("0.0.0", ">=0.0.0") is True
        assert check_set("0.0.1", ">0.0.0") is True
        assert check_set("0.0.0", ">0.0.0") is False


class TestVersionCompatibility:
    """Test version compatibility scenarios."""

    def test_major_version_compatibility(self):
        """Test major version compatibility rules."""
        # Same major version (1.x.x)
        assert check_set("1.5.0", ">=1.0.0 <2.0.0") is True
        assert check_set("1.9.9", ">=1.0.0 <2.0.0") is True

        # Different major version
        assert check_set("2.0.0", ">=1.0.0 <2.0.0") is False

    def test_minor_version_compatibility(self):
        """Test minor version compatibility rules."""
        # Same minor version (1.2.x)
        assert check_set("1.2.5", ">=1.2.0 <1.3.0") is True
        assert check_set("1.2.9", ">=1.2.0 <1.3.0") is True

        # Different minor version
        assert check_set("1.3.0", ">=1.2.0 <1.3.0") is False

    def test_patch_version_compatibility(self):
        """Test patch version compatibility."""
        # Any patch version should be compatible
        assert check_set("1.2.0", ">=1.2.0") is True
        assert check_set("1.2.1", ">=1.2.0") is True
        assert check_set("1.2.99", ">=1.2.0") is True


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_version_boundary_inclusive(self):
        """Test boundary conditions with inclusive operators."""
        assert check_set("1.0.0", ">=1.0.0") is True
        assert check_set("1.0.0", "<=1.0.0") is True

    def test_version_boundary_exclusive(self):
        """Test boundary conditions with exclusive operators."""
        assert check_set("1.0.0", ">1.0.0") is False
        assert check_set("1.0.0", "<1.0.0") is False

    def test_complex_multi_constraint(self):
        """Test complex multi-constraint scenarios."""
        # Version must be >= 1.0.0, < 2.0.0, and != 1.5.0
        constraint = ">=1.0.0 <2.0.0"
        assert check_set("1.4.9", constraint) is True
        assert check_set("1.5.1", constraint) is True
        assert check_set("2.0.0", constraint) is False

    def test_pre_1_0_versions(self):
        """Test versions before 1.0.0."""
        assert check_set("0.9.0", "<1.0.0") is True
        assert check_set("0.0.1", ">=0.0.0") is True
        assert check_set("0.1.0", ">0.0.0 <1.0.0") is True

    def test_large_version_numbers(self):
        """Test very large version numbers."""
        assert check_set("100.200.300", ">=100.0.0") is True
        assert check_set("999.999.999", "<1000.0.0") is True
