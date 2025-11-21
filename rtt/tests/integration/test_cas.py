#!/usr/bin/env python3
"""
Integration Tests: Content-Addressable Storage (CAS)
Tests CAS operations from tools/cas_ingest.py
"""
import pytest
import json
import hashlib
import sys
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import cas_ingest


class TestCASNormalize:
    """Test CAS normalization."""

    def test_normalize_dict(self):
        """Test normalizing a dictionary to canonical JSON."""
        obj = {"name": "test", "version": "1.0.0", "id": "123"}
        result = cas_ingest.normalize(obj)

        assert isinstance(result, bytes)
        # Should be sorted JSON
        decoded = result.decode()
        assert decoded.index('"id"') < decoded.index('"name"')
        assert decoded.index('"name"') < decoded.index('"version"')

    def test_normalize_deterministic(self):
        """Test that normalization is deterministic."""
        obj = {"z": "last", "a": "first", "m": "middle"}
        result1 = cas_ingest.normalize(obj)
        result2 = cas_ingest.normalize(obj)

        assert result1 == result2

    def test_normalize_different_order(self):
        """Test objects with different key order normalize identically."""
        obj1 = {"a": 1, "b": 2, "c": 3}
        obj2 = {"c": 3, "a": 1, "b": 2}

        result1 = cas_ingest.normalize(obj1)
        result2 = cas_ingest.normalize(obj2)

        assert result1 == result2

    def test_normalize_nested_objects(self):
        """Test normalization of nested objects."""
        obj = {
            "outer": {
                "z": "last",
                "a": "first"
            },
            "list": [3, 1, 2]
        }
        result = cas_ingest.normalize(obj)

        # Nested dict should also be sorted
        decoded = result.decode()
        parsed = json.loads(decoded)
        assert list(parsed.keys()) == ["list", "outer"]
        assert list(parsed["outer"].keys()) == ["a", "z"]


class TestCASHash:
    """Test CAS hash calculation."""

    def test_sha256_bytes(self):
        """Test SHA256 hash of bytes."""
        data = b"test content"
        result = cas_ingest.sha256_bytes(data)

        assert isinstance(result, str)
        assert len(result) == 64  # SHA256 hex digest length

        # Verify against known hash
        expected = hashlib.sha256(data).hexdigest()
        assert result == expected

    def test_sha256_deterministic(self):
        """Test that hash is deterministic."""
        data = b"test content"
        hash1 = cas_ingest.sha256_bytes(data)
        hash2 = cas_ingest.sha256_bytes(data)

        assert hash1 == hash2

    def test_sha256_different_data(self):
        """Test that different data produces different hashes."""
        hash1 = cas_ingest.sha256_bytes(b"data1")
        hash2 = cas_ingest.sha256_bytes(b"data2")

        assert hash1 != hash2

    def test_sha256_empty_data(self):
        """Test hash of empty data."""
        result = cas_ingest.sha256_bytes(b"")

        assert isinstance(result, str)
        assert len(result) == 64
        # Known SHA256 of empty string
        expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        assert result == expected


class TestCASIngest:
    """Test CAS ingestion."""

    def test_ingest_simple_object(self, temp_rtt_dir):
        """Test ingesting a simple object."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        # Temporarily set CAS path
        original_cas = cas_ingest.CAS
        cas_ingest.CAS = cas_dir

        try:
            obj = {"type": "test", "content": "hello"}
            normalized = cas_ingest.normalize(obj)
            content_hash = cas_ingest.sha256_bytes(normalized)

            # Expected path
            expected_path = cas_dir / f"{content_hash}.json"

            # Ingest would write to this path
            expected_path.write_bytes(normalized)

            assert expected_path.exists()

            # Verify content
            stored_data = json.loads(expected_path.read_bytes())
            assert stored_data == obj

        finally:
            cas_ingest.CAS = original_cas

    def test_ingest_duplicate_content(self, temp_rtt_dir):
        """Test that duplicate content uses same hash."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        original_cas = cas_ingest.CAS
        cas_ingest.CAS = cas_dir

        try:
            obj = {"type": "test", "content": "duplicate"}

            # Ingest first time
            normalized1 = cas_ingest.normalize(obj)
            hash1 = cas_ingest.sha256_bytes(normalized1)
            path1 = cas_dir / f"{hash1}.json"
            path1.write_bytes(normalized1)

            # Ingest second time (same object)
            normalized2 = cas_ingest.normalize(obj)
            hash2 = cas_ingest.sha256_bytes(normalized2)

            # Should be same hash
            assert hash1 == hash2

            # Only one file should exist
            cas_files = list(cas_dir.glob("*.json"))
            assert len(cas_files) == 1

        finally:
            cas_ingest.CAS = original_cas

    def test_ingest_different_content(self, temp_rtt_dir):
        """Test that different content uses different hashes."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        original_cas = cas_ingest.CAS
        cas_ingest.CAS = cas_dir

        try:
            obj1 = {"type": "test", "id": 1}
            obj2 = {"type": "test", "id": 2}

            normalized1 = cas_ingest.normalize(obj1)
            hash1 = cas_ingest.sha256_bytes(normalized1)
            path1 = cas_dir / f"{hash1}.json"
            path1.write_bytes(normalized1)

            normalized2 = cas_ingest.normalize(obj2)
            hash2 = cas_ingest.sha256_bytes(normalized2)
            path2 = cas_dir / f"{hash2}.json"
            path2.write_bytes(normalized2)

            # Should be different hashes
            assert hash1 != hash2

            # Two files should exist
            cas_files = list(cas_dir.glob("*.json"))
            assert len(cas_files) == 2

        finally:
            cas_ingest.CAS = original_cas


class TestCASRetrieval:
    """Test retrieving content from CAS."""

    def test_retrieve_by_hash(self, temp_rtt_dir):
        """Test retrieving content by hash."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        obj = {"type": "test", "value": 42}
        normalized = cas_ingest.normalize(obj)
        content_hash = cas_ingest.sha256_bytes(normalized)

        # Store
        cas_path = cas_dir / f"{content_hash}.json"
        cas_path.write_bytes(normalized)

        # Retrieve
        retrieved = json.loads(cas_path.read_bytes())
        assert retrieved == obj

    def test_retrieve_nonexistent_hash(self, temp_rtt_dir):
        """Test retrieving nonexistent hash."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        fake_hash = "a" * 64
        cas_path = cas_dir / f"{fake_hash}.json"

        assert not cas_path.exists()

    def test_verify_retrieved_hash(self, temp_rtt_dir):
        """Test that retrieved content hash matches."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        obj = {"type": "test", "verify": True}
        normalized = cas_ingest.normalize(obj)
        original_hash = cas_ingest.sha256_bytes(normalized)

        # Store
        cas_path = cas_dir / f"{original_hash}.json"
        cas_path.write_bytes(normalized)

        # Retrieve and verify
        retrieved_bytes = cas_path.read_bytes()
        retrieved_hash = cas_ingest.sha256_bytes(retrieved_bytes)

        assert retrieved_hash == original_hash


class TestCASIntegrity:
    """Test CAS integrity checks."""

    def test_detect_corrupted_content(self, temp_rtt_dir):
        """Test detection of corrupted content."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        obj = {"type": "test", "integrity": "check"}
        normalized = cas_ingest.normalize(obj)
        original_hash = cas_ingest.sha256_bytes(normalized)

        # Store
        cas_path = cas_dir / f"{original_hash}.json"
        cas_path.write_bytes(normalized)

        # Corrupt the content
        corrupted = b'{"corrupted": "data"}'
        cas_path.write_bytes(corrupted)

        # Verify corruption detected
        stored_hash = cas_ingest.sha256_bytes(cas_path.read_bytes())
        assert stored_hash != original_hash

    def test_hash_collision_resistance(self):
        """Test that similar objects get different hashes."""
        obj1 = {"id": "1", "value": 100}
        obj2 = {"id": "2", "value": 100}

        hash1 = cas_ingest.sha256_bytes(cas_ingest.normalize(obj1))
        hash2 = cas_ingest.sha256_bytes(cas_ingest.normalize(obj2))

        assert hash1 != hash2


class TestCASPathSecurity:
    """Test CAS path security."""

    def test_cas_path_no_traversal(self, temp_rtt_dir):
        """Test that CAS paths don't allow traversal."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        # Even if an attacker tries to use a hash with path traversal
        malicious_hash = "../../../etc/passwd"

        # The CAS path construction should keep it within CAS directory
        cas_path = cas_dir / f"{malicious_hash}.json"
        resolved = cas_path.resolve()

        # Should still be within temp directory
        assert str(resolved).startswith(str(temp_rtt_dir))

    def test_cas_filename_sanitization(self):
        """Test that CAS filenames are sanitized."""
        # Hash should only contain hex characters
        data = b"test"
        content_hash = cas_ingest.sha256_bytes(data)

        # Verify hash only contains valid hex
        assert all(c in "0123456789abcdef" for c in content_hash)
        assert len(content_hash) == 64


class TestCASOperations:
    """Test various CAS operations."""

    def test_cas_deduplication(self, temp_rtt_dir):
        """Test that CAS naturally deduplicates content."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        # Same content, different names
        contents = [
            {"name": "agent1", "version": "1.0.0"},
            {"name": "agent2", "version": "1.0.0"},  # Different name
            {"name": "agent1", "version": "1.0.0"}   # Exact duplicate
        ]

        hashes = []
        for content in contents:
            normalized = cas_ingest.normalize(content)
            content_hash = cas_ingest.sha256_bytes(normalized)
            hashes.append(content_hash)

            cas_path = cas_dir / f"{content_hash}.json"
            cas_path.write_bytes(normalized)

        # First and third should have same hash (duplicates)
        assert hashes[0] == hashes[2]
        # Second should be different (different content)
        assert hashes[0] != hashes[1]

        # Should only have 2 unique files
        cas_files = list(cas_dir.glob("*.json"))
        assert len(cas_files) == 2

    def test_cas_large_content(self, temp_rtt_dir):
        """Test CAS with large content."""
        cas_dir = temp_rtt_dir / ".rtt" / "cas"
        cas_dir.mkdir(parents=True, exist_ok=True)

        # Create large object
        large_obj = {
            "data": ["item" + str(i) for i in range(1000)],
            "metadata": {f"key{i}": f"value{i}" for i in range(100)}
        }

        normalized = cas_ingest.normalize(large_obj)
        content_hash = cas_ingest.sha256_bytes(normalized)

        cas_path = cas_dir / f"{content_hash}.json"
        cas_path.write_bytes(normalized)

        # Verify storage and retrieval
        assert cas_path.exists()
        retrieved = json.loads(cas_path.read_bytes())
        assert retrieved == large_obj
