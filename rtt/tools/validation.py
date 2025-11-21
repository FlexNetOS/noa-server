#!/usr/bin/env python3
"""
RTT Security Validation Library
Provides cryptographic validation, path security, and input sanitization.
"""

import os
import re
import json
import hashlib
from pathlib import Path
from typing import Any, Union


# Configuration Constants
MAX_JSON_SIZE = 10 * 1024 * 1024  # 10MB limit
MAX_PATH_LENGTH = 4096
ALLOWED_FILENAME_CHARS = re.compile(r'^[a-zA-Z0-9._\-]+$')


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def validate_path(path: Union[str, Path], base_dir: Union[str, Path], purpose: str = "file") -> Path:
    """
    Validate path to prevent traversal attacks.

    Args:
        path: The path to validate (relative or absolute)
        base_dir: The base directory that path must be within
        purpose: Description of the path's purpose (for error messages)

    Returns:
        Absolute, validated Path object

    Raises:
        ValidationError: If path is invalid or attempts traversal
    """
    # Convert to Path objects
    path = Path(path)
    base_dir = Path(base_dir)

    # Check length
    path_str = str(path)
    if len(path_str) > MAX_PATH_LENGTH:
        raise ValidationError(f"Path too long ({len(path_str)} > {MAX_PATH_LENGTH}): {purpose}")

    # Check for suspicious patterns before resolution
    if ".." in path_str:
        raise ValidationError(f"Path traversal detected (..): {path_str}")

    # Check for absolute path attempts when expecting relative
    if path.is_absolute() and not str(path).startswith(str(base_dir.resolve())):
        raise ValidationError(f"Absolute path outside base directory: {path_str}")

    # Resolve to absolute path
    try:
        if path.is_absolute():
            abs_path = path.resolve()
        else:
            abs_path = (base_dir / path).resolve()
        abs_base = base_dir.resolve()
    except (OSError, RuntimeError) as e:
        raise ValidationError(f"Path resolution failed for {purpose}: {e}")

    # Check if path escapes base directory
    try:
        abs_path.relative_to(abs_base)
    except ValueError:
        raise ValidationError(
            f"Path traversal detected: {purpose} path '{path}' "
            f"escapes base directory '{base_dir}'"
        )

    return abs_path


def validate_symbol_address(addr: str) -> str:
    """
    Validate RTT symbol addresses against the canonical format.

    Format: rtt://namespace/category/name@version#fragment
    Example: rtt://myorg/agents/calculator@1.0.0#main

    Args:
        addr: Symbol address to validate

    Returns:
        The validated address

    Raises:
        ValidationError: If address format is invalid
    """
    if not addr:
        raise ValidationError("Symbol address cannot be empty")

    if len(addr) > 512:
        raise ValidationError(f"Symbol address too long: {len(addr)} > 512")

    # Pattern allows: rtt://segment/segment/segment@semver#fragment
    # Segments: lowercase alphanumeric with hyphens
    # Version: semantic versioning
    # Fragment: optional, alphanumeric with hyphens
    pattern = (
        r'^rtt://[a-z0-9][a-z0-9\-]*'  # Protocol and first segment
        r'(/[a-z0-9][a-z0-9\-]*)*'      # Additional path segments
        r'@\d+\.\d+\.\d+'                # Semantic version (required)
        r'(\-[a-z0-9][a-z0-9\-]*)?'      # Optional pre-release
        r'(\#[a-z0-9][a-z0-9\-]*)?$'     # Optional fragment
    )

    if not re.match(pattern, addr, re.IGNORECASE):
        raise ValidationError(
            f"Invalid symbol address format: {addr}\n"
            f"Expected format: rtt://namespace/category/name@X.Y.Z#fragment"
        )

    return addr


def validate_filename(name: str, allow_extension: bool = True) -> str:
    """
    Validate filename for safety (no shell metacharacters, no traversal).

    Args:
        name: Filename to validate
        allow_extension: Whether to allow file extensions

    Returns:
        The validated filename

    Raises:
        ValidationError: If filename is unsafe
    """
    if not name:
        raise ValidationError("Filename cannot be empty")

    if len(name) > 255:
        raise ValidationError(f"Filename too long: {len(name)} > 255")

    # Check for shell metacharacters
    dangerous_chars = [';', '|', '&', '$', '`', '<', '>', '\n', '\r', '\0']
    for char in dangerous_chars:
        if char in name:
            raise ValidationError(f"Unsafe character in filename: {repr(char)}")

    # Check for path traversal
    if ".." in name or "/" in name or "\\" in name:
        raise ValidationError(f"Path traversal attempt in filename: {name}")

    # Check against whitelist pattern
    if not ALLOWED_FILENAME_CHARS.match(name.replace('.', '_') if allow_extension else name):
        raise ValidationError(f"Filename contains invalid characters: {name}")

    return name


def validate_hash(hash_str: str, algorithm: str = "sha256") -> str:
    """
    Validate cryptographic hash string.

    Args:
        hash_str: Hash string to validate
        algorithm: Expected hash algorithm

    Returns:
        The validated hash

    Raises:
        ValidationError: If hash format is invalid
    """
    expected_lengths = {
        "sha256": 64,
        "sha512": 128,
        "sha1": 40,
    }

    if algorithm not in expected_lengths:
        raise ValidationError(f"Unsupported hash algorithm: {algorithm}")

    expected_len = expected_lengths[algorithm]

    if len(hash_str) != expected_len:
        raise ValidationError(
            f"Invalid {algorithm} hash length: {len(hash_str)} != {expected_len}"
        )

    if not re.match(r'^[a-f0-9]+$', hash_str, re.IGNORECASE):
        raise ValidationError(f"Invalid {algorithm} hash format: {hash_str}")

    return hash_str.lower()


def safe_json_load(file_path: Union[str, Path]) -> Any:
    """
    Load JSON file with size limits to prevent DoS attacks.

    Args:
        file_path: Path to JSON file

    Returns:
        Parsed JSON object

    Raises:
        ValidationError: If file is too large or invalid JSON
    """
    file_path = Path(file_path)

    try:
        file_size = file_path.stat().st_size
    except OSError as e:
        raise ValidationError(f"Cannot stat file {file_path}: {e}")

    if file_size > MAX_JSON_SIZE:
        raise ValidationError(
            f"JSON file too large: {file_size} bytes > {MAX_JSON_SIZE} bytes"
        )

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON in {file_path}: {e}")
    except Exception as e:
        raise ValidationError(f"Error reading {file_path}: {e}")


def safe_json_loads(json_string: str) -> Any:
    """
    Parse JSON string with size limits to prevent DoS attacks.

    Args:
        json_string: JSON string to parse

    Returns:
        Parsed JSON object

    Raises:
        ValidationError: If string is too large or invalid JSON
    """
    if len(json_string) > MAX_JSON_SIZE:
        raise ValidationError(
            f"JSON string too large: {len(json_string)} bytes > {MAX_JSON_SIZE} bytes"
        )

    try:
        return json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}")


def compute_secure_hash(data: bytes, algorithm: str = "sha256") -> str:
    """
    Compute cryptographically secure hash with double hashing for Merkle chains.

    Args:
        data: Data to hash
        algorithm: Hash algorithm to use

    Returns:
        Hex-encoded hash digest
    """
    if algorithm == "sha256":
        # Double SHA-256 for extra security (Bitcoin-style)
        first_hash = hashlib.sha256(data).digest()
        second_hash = hashlib.sha256(first_hash).hexdigest()
        return second_hash
    elif algorithm == "sha512":
        first_hash = hashlib.sha512(data).digest()
        second_hash = hashlib.sha512(first_hash).hexdigest()
        return second_hash
    else:
        raise ValidationError(f"Unsupported hash algorithm: {algorithm}")


def validate_semver(version: str) -> tuple:
    """
    Validate semantic version string.

    Args:
        version: Semantic version string (e.g., "1.2.3")

    Returns:
        Tuple of (major, minor, patch) as integers

    Raises:
        ValidationError: If version format is invalid
    """
    pattern = r'^(\d+)\.(\d+)\.(\d+)(?:\-([a-z0-9\-\.]+))?(?:\+([a-z0-9\-\.]+))?$'
    match = re.match(pattern, version, re.IGNORECASE)

    if not match:
        raise ValidationError(f"Invalid semantic version: {version}")

    major, minor, patch = match.groups()[:3]

    try:
        return (int(major), int(minor), int(patch))
    except ValueError as e:
        raise ValidationError(f"Invalid version numbers in {version}: {e}")


def sanitize_command_arg(arg: str, allow_paths: bool = False) -> str:
    """
    Sanitize command-line argument to prevent injection.

    Args:
        arg: Argument to sanitize
        allow_paths: Whether to allow path-like arguments

    Returns:
        Sanitized argument

    Raises:
        ValidationError: If argument contains dangerous characters
    """
    # Check for shell metacharacters
    dangerous = [';', '|', '&', '$', '`', '<', '>', '\n', '\r', '(', ')', '{', '}']
    for char in dangerous:
        if char in arg:
            raise ValidationError(f"Dangerous character in command argument: {repr(char)}")

    # Additional checks for non-path arguments
    if not allow_paths:
        if arg.startswith('-') and len(arg) > 2 and arg[1] != '-':
            # Could be option injection
            raise ValidationError(f"Potential option injection: {arg}")

    return arg
