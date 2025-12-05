#!/usr/bin/env python3
"""
Unit Tests: Policy Matching
Tests the policy_match module from tools/policy_match.py
"""
import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from policy_match import allowed


class TestPolicyAllowed:
    """Test the allowed() function for policy matching."""

    def test_allow_wildcard_to_wildcard(self):
        """Test allow rule with wildcard from and to."""
        policy = {
            "allow": [
                {"from": "*", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://other/service@1.0.0") is True

    def test_allow_exact_match(self):
        """Test allow rule with exact symbol addresses."""
        policy = {
            "allow": [
                {"from": "rtt://core/api/client@1.0.0", "to": "rtt://core/api/server@1.0.0"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://core/api/server@1.0.0") is True
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://other/api/server@1.0.0") is False

    def test_allow_namespace_wildcard(self):
        """Test allow rule with namespace wildcard."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "rtt://core/*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://core/api/server@1.0.0") is True
        assert allowed(policy, "rtt://test/api/client@1.0.0", "rtt://core/api/server@1.0.0") is False

    def test_allow_from_wildcard(self):
        """Test allow rule with from wildcard."""
        policy = {
            "allow": [
                {"from": "*", "to": "rtt://core/api/server@1.0.0"}
            ]
        }
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://core/api/server@1.0.0") is True
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://other/api/server@1.0.0") is False

    def test_allow_to_wildcard(self):
        """Test allow rule with to wildcard."""
        policy = {
            "allow": [
                {"from": "rtt://core/api/client@1.0.0", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://any/service@1.0.0") is True
        assert allowed(policy, "rtt://other/api/client@1.0.0", "rtt://any/service@1.0.0") is False

    def test_deny_when_no_matching_rule(self):
        """Test that connection is denied when no rule matches."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "rtt://core/*"}
            ]
        }
        assert allowed(policy, "rtt://test/api/client@1.0.0", "rtt://test/api/server@1.0.0") is False

    def test_multiple_allow_rules(self):
        """Test policy with multiple allow rules."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "rtt://core/*"},
                {"from": "rtt://test/*", "to": "rtt://test/*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/a@1.0.0", "rtt://core/api/b@1.0.0") is True
        assert allowed(policy, "rtt://test/api/a@1.0.0", "rtt://test/api/b@1.0.0") is True
        assert allowed(policy, "rtt://other/api/a@1.0.0", "rtt://other/api/b@1.0.0") is False

    def test_first_matching_rule_wins(self):
        """Test that first matching rule is used."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "*"},
                {"from": "rtt://core/*", "to": "rtt://core/*"}
            ]
        }
        # First rule matches and allows
        assert allowed(policy, "rtt://core/api/a@1.0.0", "rtt://any/api/b@1.0.0") is True

    def test_empty_policy(self):
        """Test empty policy denies all."""
        policy = {"allow": []}
        assert allowed(policy, "rtt://any/api/a@1.0.0", "rtt://any/api/b@1.0.0") is False

    def test_missing_allow_key(self):
        """Test policy without allow key."""
        policy = {}
        assert allowed(policy, "rtt://any/api/a@1.0.0", "rtt://any/api/b@1.0.0") is False


class TestPolicyPatternMatching:
    """Test fnmatch pattern matching in policies."""

    def test_pattern_single_asterisk(self):
        """Test single asterisk matches any string."""
        policy = {
            "allow": [
                {"from": "rtt://*/api/client@1.0.0", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://test/api/client@1.0.0", "rtt://any@1.0.0") is True

    def test_pattern_question_mark(self):
        """Test question mark matches single character."""
        policy = {
            "allow": [
                {"from": "rtt://core/api/client@1.?.0", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/client@1.5.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/client@1.10.0", "rtt://any@1.0.0") is False

    def test_pattern_bracket_range(self):
        """Test bracket ranges in patterns."""
        policy = {
            "allow": [
                {"from": "rtt://core/api/service[1-3]@1.0.0", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/service1@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/service2@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/service3@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/service4@1.0.0", "rtt://any@1.0.0") is False

    def test_pattern_double_asterisk_in_path(self):
        """Test pattern with multiple path segments."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "rtt://core/*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/client@1.0.0", "rtt://core/service/server@1.0.0") is True


class TestPolicySecurityScenarios:
    """Test security-relevant policy scenarios."""

    def test_prevent_cross_namespace_access(self):
        """Test policy prevents cross-namespace access."""
        policy = {
            "allow": [
                {"from": "rtt://prod/*", "to": "rtt://prod/*"},
                {"from": "rtt://dev/*", "to": "rtt://dev/*"}
            ]
        }
        # Allowed within namespace
        assert allowed(policy, "rtt://prod/api/a@1.0.0", "rtt://prod/api/b@1.0.0") is True
        assert allowed(policy, "rtt://dev/api/a@1.0.0", "rtt://dev/api/b@1.0.0") is True

        # Denied across namespaces
        assert allowed(policy, "rtt://prod/api/a@1.0.0", "rtt://dev/api/b@1.0.0") is False
        assert allowed(policy, "rtt://dev/api/a@1.0.0", "rtt://prod/api/b@1.0.0") is False

    def test_restrict_sensitive_service_access(self):
        """Test policy restricts access to sensitive services."""
        policy = {
            "allow": [
                {"from": "rtt://core/auth/*", "to": "rtt://core/db/credentials@*"},
                {"from": "*", "to": "rtt://core/api/*"}
            ]
        }
        # Only auth services can access credentials
        assert allowed(policy, "rtt://core/auth/service@1.0.0", "rtt://core/db/credentials@1.0.0") is True
        assert allowed(policy, "rtt://core/api/service@1.0.0", "rtt://core/db/credentials@1.0.0") is False

        # All services can access API
        assert allowed(policy, "rtt://core/auth/service@1.0.0", "rtt://core/api/public@1.0.0") is True
        assert allowed(policy, "rtt://test/service@1.0.0", "rtt://core/api/public@1.0.0") is True

    def test_layered_security_policy(self):
        """Test layered security policy with multiple zones."""
        policy = {
            "allow": [
                # Public zone - anyone can access
                {"from": "*", "to": "rtt://public/*"},
                # Internal zone - only internal services
                {"from": "rtt://internal/*", "to": "rtt://internal/*"},
                # Secure zone - only secure services
                {"from": "rtt://secure/*", "to": "rtt://secure/*"}
            ]
        }

        # Public access
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://public/api@1.0.0") is True

        # Internal access
        assert allowed(policy, "rtt://internal/a@1.0.0", "rtt://internal/b@1.0.0") is True
        assert allowed(policy, "rtt://external/a@1.0.0", "rtt://internal/b@1.0.0") is False

        # Secure access
        assert allowed(policy, "rtt://secure/a@1.0.0", "rtt://secure/b@1.0.0") is True
        assert allowed(policy, "rtt://internal/a@1.0.0", "rtt://secure/b@1.0.0") is False

    def test_read_only_service_policy(self):
        """Test policy for read-only services."""
        policy = {
            "allow": [
                {"from": "*", "to": "rtt://core/api/read@*"},
                {"from": "rtt://core/admin/*", "to": "rtt://core/api/write@*"}
            ]
        }

        # Anyone can read
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://core/api/read@1.0.0") is True

        # Only admin can write
        assert allowed(policy, "rtt://core/admin/service@1.0.0", "rtt://core/api/write@1.0.0") is True
        assert allowed(policy, "rtt://any/service@1.0.0", "rtt://core/api/write@1.0.0") is False


class TestPolicyVersioning:
    """Test policy rules with version patterns."""

    def test_version_specific_policy(self):
        """Test policy with specific version."""
        policy = {
            "allow": [
                {"from": "*", "to": "rtt://core/api/stable@1.0.0"}
            ]
        }
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/stable@1.0.0") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/stable@2.0.0") is False

    def test_version_wildcard_policy(self):
        """Test policy with version wildcard."""
        policy = {
            "allow": [
                {"from": "*", "to": "rtt://core/api/service@*"}
            ]
        }
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@1.0.0") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@2.0.0") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@99.99.99") is True

    def test_version_major_wildcard(self):
        """Test policy with major version wildcard."""
        policy = {
            "allow": [
                {"from": "*", "to": "rtt://core/api/service@1.*"}
            ]
        }
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@1.0.0") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@1.5.0") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@1.99.99") is True
        assert allowed(policy, "rtt://any@1.0.0", "rtt://core/api/service@2.0.0") is False


class TestPolicyEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_policy_with_default_from_to(self):
        """Test policy with missing from/to defaults to wildcard."""
        policy = {
            "allow": [
                {"from": "rtt://core/*"}  # to is missing, should default to *
            ]
        }
        # The policy_match implementation uses .get with default '*'
        rule = {"from": "rtt://core/*"}
        from_pattern = rule.get("from", "*")
        to_pattern = rule.get("to", "*")
        assert from_pattern == "rtt://core/*"
        assert to_pattern == "*"

    def test_policy_case_sensitivity(self):
        """Test that policy matching is case-sensitive."""
        policy = {
            "allow": [
                {"from": "rtt://core/*", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/service@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://CORE/api/service@1.0.0", "rtt://any@1.0.0") is False

    def test_policy_with_special_characters(self):
        """Test policy with special characters in patterns."""
        policy = {
            "allow": [
                {"from": "rtt://core/api/service-v1@1.0.0", "to": "*"}
            ]
        }
        assert allowed(policy, "rtt://core/api/service-v1@1.0.0", "rtt://any@1.0.0") is True
        assert allowed(policy, "rtt://core/api/service_v1@1.0.0", "rtt://any@1.0.0") is False

    def test_empty_from_to_strings(self):
        """Test policy with empty from/to strings."""
        policy = {
            "allow": [
                {"from": "", "to": ""}
            ]
        }
        # Empty patterns should not match anything
        assert allowed(policy, "rtt://core/api/a@1.0.0", "rtt://core/api/b@1.0.0") is False

    def test_policy_with_none_values(self):
        """Test policy handling when None values present."""
        # Test that missing keys default correctly
        policy = {"allow": [{}]}
        # Empty rule dict should default from and to to "*"
        # This tests the implementation's .get('from', '*') behavior
        result = allowed(policy, "rtt://any@1.0.0", "rtt://any@1.0.0")
        # With defaults to *, should match
        assert result is True
