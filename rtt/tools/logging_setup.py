#!/usr/bin/env python3
"""
RTT Logging Configuration
Provides consistent logging across all RTT tools.
"""

import logging
import sys
from pathlib import Path
from typing import Optional
import config
Config = config.Config


def setup_logging(
    name: str,
    level: Optional[str] = None,
    log_file: Optional[Path] = None,
    console: bool = True
) -> logging.Logger:
    """
    Set up logging for RTT tools.

    Args:
        name: Logger name (usually __name__)
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file to log to
        console: Whether to log to console

    Returns:
        Configured logger instance
    """
    # Get log level from argument, env, or default
    if level is None:
        level = Config.LOG_LEVEL

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level, logging.INFO))

    # Remove existing handlers
    logger.handlers = []

    # Format
    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    # File handler
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    elif Config.LOG_FILE:
        Config.LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(Config.LOG_FILE)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def setup_audit_logger(name: str = "rtt.audit") -> logging.Logger:
    """
    Set up audit logging for security-sensitive operations.

    Args:
        name: Logger name

    Returns:
        Configured audit logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.handlers = []

    # Audit logs always go to file
    if Config.ENABLE_AUDIT_LOG:
        Config.AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(Config.AUDIT_LOG_FILE)
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            fmt='%(asctime)s [AUDIT] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


class AuditLogger:
    """Helper class for audit logging."""

    def __init__(self):
        self.logger = setup_audit_logger()

    def log_file_access(self, path: Path, operation: str, user: str = "system"):
        """Log file access."""
        self.logger.info(f"FILE_ACCESS: user={user} op={operation} path={path}")

    def log_signature_verification(self, result: bool, key_id: str, item: str):
        """Log signature verification."""
        status = "SUCCESS" if result else "FAILURE"
        self.logger.info(f"SIGNATURE_VERIFY: status={status} key_id={key_id} item={item}")

    def log_wal_operation(self, operation: str, plan_id: str, result: str):
        """Log WAL operation."""
        self.logger.info(f"WAL_OP: op={operation} plan_id={plan_id} result={result}")

    def log_plan_execution(self, plan_id: str, status: str, details: str = ""):
        """Log plan execution."""
        self.logger.info(f"PLAN_EXEC: plan_id={plan_id} status={status} details={details}")

    def log_security_event(self, event_type: str, severity: str, details: str):
        """Log security event."""
        self.logger.warning(f"SECURITY: type={event_type} severity={severity} details={details}")


# Global audit logger instance
audit = AuditLogger()


if __name__ == "__main__":
    # Test logging setup
    logger = setup_logging("test", level="DEBUG")
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")

    audit.log_file_access(Path("/test/file.txt"), "read", "test_user")
    audit.log_signature_verification(True, "key123", "plan456")
