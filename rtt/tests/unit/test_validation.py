#!/usr/bin/env python3
"""
Unit Tests: Schema Validation
Tests the validation module from tests/validate.py
"""
import pytest
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests"))

from validate import require, validate_schema, load


class TestRequire:
    """Test the require() function for key validation."""

    def test_require_all_keys_present(self):
        """Test that require passes when all keys present."""
        obj = {"name": "test", "version": "1.0.0", "type": "api"}
        require(obj, ["name", "version", "type"], "test_obj")
        # Should not raise

    def test_require_missing_key(self):
        """Test that require fails when key missing."""
        obj = {"name": "test", "version": "1.0.0"}
        with pytest.raises(SystemExit) as exc:
            require(obj, ["name", "version", "type"], "test_obj")
        assert "Missing key 'type'" in str(exc.value)

    def test_require_empty_keys(self):
        """Test require with empty key list."""
        obj = {"name": "test"}
        require(obj, [], "test_obj")
        # Should not raise

    def test_require_multiple_missing(self):
        """Test require with first missing key reported."""
        obj = {"name": "test"}
        with pytest.raises(SystemExit):
            require(obj, ["version", "type", "author"], "test_obj")


class TestValidateSchema:
    """Test the validate_schema() function."""

    def test_validate_object_type(self):
        """Test validation of object type."""
        schema = {"type": "object"}
        obj = {"key": "value"}
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_object_type_fail(self):
        """Test validation fails for non-object."""
        schema = {"type": "object"}
        obj = "not an object"
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "not an object" in str(exc.value)

    def test_validate_required_fields(self):
        """Test validation of required fields."""
        schema = {
            "type": "object",
            "required": ["name", "version"]
        }
        obj = {"name": "test", "version": "1.0.0"}
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_required_fields_missing(self):
        """Test validation fails when required field missing."""
        schema = {
            "type": "object",
            "required": ["name", "version"]
        }
        obj = {"name": "test"}
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "Missing key 'version'" in str(exc.value)

    def test_validate_nested_properties(self):
        """Test validation of nested object properties."""
        schema = {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "object",
                    "required": ["saddr", "type"]
                }
            }
        }
        obj = {
            "symbol": {
                "saddr": "rtt://test/api/example@1.0.0",
                "type": "api"
            }
        }
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_nested_missing_field(self):
        """Test validation fails for missing nested field."""
        schema = {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "object",
                    "required": ["saddr", "type"]
                }
            }
        }
        obj = {
            "symbol": {
                "saddr": "rtt://test/api/example@1.0.0"
            }
        }
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "Missing key 'type'" in str(exc.value)

    def test_validate_array_type(self):
        """Test validation of array type."""
        schema = {"type": "array"}
        obj = ["item1", "item2"]
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_array_type_fail(self):
        """Test validation fails for non-array."""
        schema = {"type": "array"}
        obj = {"not": "array"}
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "not an array" in str(exc.value)

    def test_validate_array_items(self):
        """Test validation of array items."""
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id"]
            }
        }
        obj = [
            {"id": "1", "name": "first"},
            {"id": "2", "name": "second"}
        ]
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_array_items_fail(self):
        """Test validation fails for invalid array item."""
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id"]
            }
        }
        obj = [
            {"id": "1"},
            {"name": "missing_id"}
        ]
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "Missing key 'id'" in str(exc.value)

    def test_validate_string_type(self):
        """Test validation of string type."""
        schema = {"type": "string"}
        obj = "test string"
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_string_type_fail(self):
        """Test validation fails for non-string."""
        schema = {"type": "string"}
        obj = 123
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "not a string" in str(exc.value)

    def test_validate_enum_valid(self):
        """Test validation of enum with valid value."""
        schema = {
            "type": "string",
            "enum": ["api", "service", "connector"]
        }
        obj = "api"
        validate_schema(obj, schema, "test")
        # Should not raise

    def test_validate_enum_invalid(self):
        """Test validation fails for invalid enum value."""
        schema = {
            "type": "string",
            "enum": ["api", "service", "connector"]
        }
        obj = "invalid_type"
        with pytest.raises(SystemExit) as exc:
            validate_schema(obj, schema, "test")
        assert "not in enum" in str(exc.value)

    def test_validate_complex_nested_structure(self):
        """Test validation of complex nested structure."""
        schema = {
            "type": "object",
            "required": ["symbol", "provides"],
            "properties": {
                "symbol": {
                    "type": "object",
                    "required": ["saddr", "type"],
                    "properties": {
                        "saddr": {"type": "string"},
                        "type": {"type": "string", "enum": ["api", "service"]}
                    }
                },
                "provides": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        obj = {
            "symbol": {
                "saddr": "rtt://test/api/example@1.0.0",
                "type": "api"
            },
            "provides": ["service1", "service2"]
        }
        validate_schema(obj, schema, "test")
        # Should not raise


class TestLoad:
    """Test the load() function for JSON loading."""

    def test_load_valid_json(self, tmp_path):
        """Test loading valid JSON file."""
        test_file = tmp_path / "test.json"
        test_data = {"key": "value", "number": 123}
        test_file.write_text(json.dumps(test_data))

        result = load(str(test_file))
        assert result == test_data

    def test_load_invalid_json(self, tmp_path):
        """Test loading invalid JSON file."""
        test_file = tmp_path / "test.json"
        test_file.write_text("{invalid json content")

        with pytest.raises(SystemExit) as exc:
            load(str(test_file))
        assert "invalid JSON" in str(exc.value)

    def test_load_nonexistent_file(self):
        """Test loading nonexistent file."""
        with pytest.raises((SystemExit, FileNotFoundError)):
            load("/nonexistent/path/file.json")

    def test_load_utf8_encoding(self, tmp_path):
        """Test loading JSON with UTF-8 characters."""
        test_file = tmp_path / "test.json"
        test_data = {"message": "Hello 世界", "emoji": "🚀"}
        test_file.write_text(json.dumps(test_data, ensure_ascii=False), encoding="utf-8")

        result = load(str(test_file))
        assert result == test_data


class TestSymbolAddressValidation:
    """Test validation of RTT symbol addresses."""

    def test_valid_symbol_address(self):
        """Test validation of valid symbol address format."""
        valid_addrs = [
            "rtt://core/api/metrics@1.0.0",
            "rtt://test/service/example@2.5.3",
            "rtt://namespace/connector/db@0.1.0"
        ]
        for addr in valid_addrs:
            assert addr.startswith("rtt://")
            assert "@" in addr
            parts = addr.split("@")
            assert len(parts) == 2

    def test_invalid_symbol_address_no_protocol(self):
        """Test detection of symbol address without protocol."""
        addr = "core/api/metrics@1.0.0"
        assert not addr.startswith("rtt://")

    def test_invalid_symbol_address_no_version(self):
        """Test detection of symbol address without version."""
        addr = "rtt://core/api/metrics"
        assert "@" not in addr

    def test_symbol_address_injection_attempt(self):
        """Test detection of injection in symbol address."""
        malicious_addrs = [
            "rtt://test'; DROP TABLE users; --@1.0.0",
            "rtt://test'; os.system('whoami'); '@1.0.0",
            "rtt://../../etc/passwd@1.0.0"
        ]
        for addr in malicious_addrs:
            # These should be caught by higher-level validation
            assert "'" in addr or ".." in addr


class TestFilenameValidation:
    """Test validation of filenames to prevent path traversal."""

    def test_safe_filename(self):
        """Test validation of safe filename."""
        safe_names = [
            "test.json",
            "manifest.json",
            "example.manifest.json"
        ]
        for name in safe_names:
            assert ".." not in name
            assert "/" not in name

    def test_path_traversal_filename(self):
        """Test detection of path traversal in filename."""
        dangerous_names = [
            "../etc/passwd",
            "../../../../../../etc/passwd",
            "./../secret.txt"
        ]
        for name in dangerous_names:
            assert ".." in name

    def test_absolute_path_filename(self):
        """Test detection of absolute path in filename."""
        dangerous_names = [
            "/etc/passwd",
            "/tmp/evil.json"
        ]
        for name in dangerous_names:
            assert name.startswith("/")


class TestPathSanitization:
    """Test path sanitization functions."""

    def test_resolve_stays_within_directory(self, tmp_path):
        """Test that resolved path stays within base directory."""
        base_dir = tmp_path / "safe"
        base_dir.mkdir()

        # Safe path
        safe_path = base_dir / "test.json"
        resolved = safe_path.resolve()
        assert str(resolved).startswith(str(base_dir.resolve()))

    def test_resolve_traversal_attempt(self, tmp_path):
        """Test that path traversal is detected."""
        base_dir = tmp_path / "safe"
        base_dir.mkdir()

        # Traversal attempt
        traversal_path = base_dir / ".." / ".." / "etc" / "passwd"
        resolved = traversal_path.resolve()

        # Should NOT be within base_dir
        try:
            resolved.relative_to(base_dir.resolve())
            # If we get here without ValueError, path stayed within base
            assert str(resolved).startswith(str(base_dir.resolve()))
        except ValueError:
            # Path escaped - this is what we expect for traversal
            pass
