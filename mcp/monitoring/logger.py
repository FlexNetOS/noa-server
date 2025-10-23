"""
MCP Structured Logging

Provides structured logging for MCP operations with JSON formatting,
context propagation, and integration with logging aggregation systems.
"""

import logging
import json
import sys
import traceback
from typing import Dict, Any, Optional
from datetime import datetime
from contextvars import ContextVar
from functools import wraps

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)
session_id_var: ContextVar[Optional[str]] = ContextVar('session_id', default=None)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""

        # Base log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add context variables
        request_id = request_id_var.get()
        if request_id:
            log_entry["request_id"] = request_id

        user_id = user_id_var.get()
        if user_id:
            log_entry["user_id"] = user_id

        session_id = session_id_var.get()
        if session_id:
            log_entry["session_id"] = session_id

        # Add custom fields from extra
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)

        # Add exception info
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }

        return json.dumps(log_entry)


class StructuredLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that adds structured fields"""

    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Process log message and add structured fields"""

        # Extract extra fields
        extra_fields = kwargs.pop('extra_fields', {})

        # Add to extra
        if 'extra' not in kwargs:
            kwargs['extra'] = {}

        kwargs['extra']['extra_fields'] = extra_fields

        return msg, kwargs


def setup_logger(
    name: str,
    level: int = logging.INFO,
    log_file: Optional[str] = None,
    json_format: bool = True
) -> logging.Logger:
    """
    Set up structured logger

    Args:
        name: Logger name
        level: Logging level
        log_file: Optional log file path
        json_format: Use JSON formatting

    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    # Remove existing handlers
    logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    if json_format:
        console_handler.setFormatter(StructuredFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        )

    logger.addHandler(console_handler)

    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)

        if json_format:
            file_handler.setFormatter(StructuredFormatter())
        else:
            file_handler.setFormatter(
                logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
            )

        logger.addHandler(file_handler)

    return logger


def get_logger(name: str, **context) -> StructuredLoggerAdapter:
    """
    Get structured logger with context

    Args:
        name: Logger name
        **context: Additional context fields

    Returns:
        Logger adapter with context
    """
    logger = logging.getLogger(name)
    return StructuredLoggerAdapter(logger, context)


def set_request_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
):
    """
    Set request context for logging

    Args:
        request_id: Request identifier
        user_id: User identifier
        session_id: Session identifier
    """
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)
    if session_id:
        session_id_var.set(session_id)


def clear_request_context():
    """Clear request context"""
    request_id_var.set(None)
    user_id_var.set(None)
    session_id_var.set(None)


def log_mcp_operation(
    logger: logging.Logger,
    operation: str,
    tool: str,
    status: str,
    duration: Optional[float] = None,
    **extra_fields
):
    """
    Log MCP operation with structured fields

    Args:
        logger: Logger instance
        operation: Operation name
        tool: Tool name
        status: Operation status
        duration: Operation duration in seconds
        **extra_fields: Additional fields
    """
    fields = {
        "operation": operation,
        "tool": tool,
        "status": status,
        "mcp_event": True
    }

    if duration is not None:
        fields["duration_seconds"] = duration

    fields.update(extra_fields)

    level = logging.INFO if status == "success" else logging.ERROR

    logger.log(
        level,
        f"MCP operation: {operation} ({tool}) - {status}",
        extra={'extra_fields': fields}
    )


def log_agent_event(
    logger: logging.Logger,
    event: str,
    agent_id: str,
    agent_type: str,
    status: str,
    **extra_fields
):
    """
    Log agent event with structured fields

    Args:
        logger: Logger instance
        event: Event name
        agent_id: Agent identifier
        agent_type: Agent type
        status: Event status
        **extra_fields: Additional fields
    """
    fields = {
        "event": event,
        "agent_id": agent_id,
        "agent_type": agent_type,
        "status": status,
        "agent_event": True
    }

    fields.update(extra_fields)

    logger.info(
        f"Agent event: {event} ({agent_type}) - {status}",
        extra={'extra_fields': fields}
    )


def log_task_event(
    logger: logging.Logger,
    event: str,
    task_id: str,
    task_type: str,
    status: str,
    **extra_fields
):
    """
    Log task event with structured fields

    Args:
        logger: Logger instance
        event: Event name
        task_id: Task identifier
        task_type: Task type
        status: Event status
        **extra_fields: Additional fields
    """
    fields = {
        "event": event,
        "task_id": task_id,
        "task_type": task_type,
        "status": status,
        "task_event": True
    }

    fields.update(extra_fields)

    logger.info(
        f"Task event: {event} ({task_type}) - {status}",
        extra={'extra_fields': fields}
    )


def log_auth_event(
    logger: logging.Logger,
    event: str,
    user_id: str,
    method: str,
    status: str,
    **extra_fields
):
    """
    Log authentication event with structured fields

    Args:
        logger: Logger instance
        event: Event name
        user_id: User identifier
        method: Authentication method
        status: Event status
        **extra_fields: Additional fields
    """
    fields = {
        "event": event,
        "user_id": user_id,
        "auth_method": method,
        "status": status,
        "auth_event": True
    }

    fields.update(extra_fields)

    level = logging.INFO if status == "success" else logging.WARNING

    logger.log(
        level,
        f"Auth event: {event} ({method}) - {status}",
        extra={'extra_fields': fields}
    )


def log_error(
    logger: logging.Logger,
    error: Exception,
    context: str,
    **extra_fields
):
    """
    Log error with structured fields

    Args:
        logger: Logger instance
        error: Exception object
        context: Error context
        **extra_fields: Additional fields
    """
    fields = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "context": context,
        "error_event": True
    }

    fields.update(extra_fields)

    logger.error(
        f"Error in {context}: {error}",
        exc_info=True,
        extra={'extra_fields': fields}
    )


# Decorator for automatic operation logging
def log_operation(operation: str, tool: str):
    """
    Decorator to automatically log operations

    Args:
        operation: Operation name
        tool: Tool name
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            logger = logging.getLogger(func.__module__)

            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time

                log_mcp_operation(
                    logger,
                    operation=operation,
                    tool=tool,
                    status="success",
                    duration=duration
                )

                return result

            except Exception as e:
                duration = time.time() - start_time

                log_mcp_operation(
                    logger,
                    operation=operation,
                    tool=tool,
                    status="error",
                    duration=duration,
                    error_type=type(e).__name__,
                    error_message=str(e)
                )

                raise

        return wrapper
    return decorator


# Initialize default MCP logger
mcp_logger = setup_logger(
    "mcp",
    level=logging.INFO,
    json_format=True
)
