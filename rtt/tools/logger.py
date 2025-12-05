#!/usr/bin/env python3
"""
RTT v1.0.0 - Production-Grade Structured Logging
Provides JSON and human-readable logging with rotation.
"""
import logging
import logging.handlers
import json
import time
from pathlib import Path
from typing import Optional


class RTTLogger:
    """Production-grade structured logging for RTT."""

    _loggers = {}  # Cache loggers to avoid duplicates

    @staticmethod
    def setup(name: str, log_dir: str = ".rtt/logs", level: int = logging.INFO):
        """
        Set up a logger with both JSON and text handlers.

        Args:
            name: Logger name (usually __name__)
            log_dir: Directory for log files
            level: Logging level

        Returns:
            Configured logger instance
        """
        # Return cached logger if exists
        if name in RTTLogger._loggers:
            return RTTLogger._loggers[name]

        # Create log directory
        Path(log_dir).mkdir(parents=True, exist_ok=True)

        # Create logger
        logger = logging.getLogger(name)
        logger.setLevel(level)
        logger.propagate = False  # Prevent duplicate logs

        # Clear any existing handlers
        logger.handlers.clear()

        # JSON structured logging handler
        json_handler = logging.handlers.RotatingFileHandler(
            f"{log_dir}/{name}.json.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        json_handler.setLevel(level)
        json_handler.setFormatter(JSONFormatter())

        # Human-readable logging handler
        text_handler = logging.handlers.RotatingFileHandler(
            f"{log_dir}/{name}.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        text_handler.setLevel(level)
        text_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )

        # Console handler for warnings and errors
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)
        console_handler.setFormatter(
            logging.Formatter('%(levelname)s - %(name)s - %(message)s')
        )

        # Add handlers
        logger.addHandler(json_handler)
        logger.addHandler(text_handler)
        logger.addHandler(console_handler)

        # Cache and return
        RTTLogger._loggers[name] = logger
        return logger


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """
        Format a log record as a JSON string.

        Args:
            record: Log record to format

        Returns:
            JSON-formatted log string
        """
        log_obj = {
            "timestamp": self.formatTime(record, "%Y-%m-%d %H:%M:%S"),
            "timestamp_unix": time.time(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread
        }

        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_obj.update(record.extra_fields)

        return json.dumps(log_obj)


def get_logger(name: str, log_dir: str = ".rtt/logs") -> logging.Logger:
    """
    Convenience function to get a configured logger.

    Args:
        name: Logger name
        log_dir: Log directory

    Returns:
        Configured logger
    """
    return RTTLogger.setup(name, log_dir)


if __name__ == "__main__":
    # Test logging
    logger = get_logger("rtt.test")
    logger.info("Structured logging initialized")
    logger.warning("This is a warning")
    logger.error("This is an error", exc_info=False)

    try:
        raise ValueError("Test exception")
    except Exception:
        logger.error("Exception occurred", exc_info=True)

    print("Logs written to .rtt/logs/")
