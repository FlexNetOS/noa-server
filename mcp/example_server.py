"""
Example MCP Server with Complete Authentication and Monitoring

Demonstrates how to integrate authentication, authorization, metrics, logging,
and tracing into an MCP server.
"""

import time
import logging
from flask import Flask, request, jsonify, Response
from typing import Dict, Any

# Import MCP components
from auth import (
    AuthMiddleware,
    JWTHandler,
    APIKeyHandler,
    RBACManager,
    create_developer_token,
    generate_developer_key
)
from monitoring import (
    get_metrics_collector,
    setup_logger,
    get_tracer,
    set_request_context,
    log_mcp_operation,
    track_request_metrics,
    trace_mcp_tool
)

# Initialize Flask app
app = Flask(__name__)

# Initialize authentication
JWT_SECRET = "your-secret-key-change-in-production"
auth = AuthMiddleware(
    jwt_secret=JWT_SECRET,
    jwt_algorithm="HS256",
    jwt_expiry_hours=24,
    rate_limit_requests=100,
    rate_limit_window_seconds=60,
    enable_audit_log=True
)

jwt_handler = JWTHandler(secret_key=JWT_SECRET)
api_key_handler = APIKeyHandler()
rbac = RBACManager()

# Initialize monitoring
logger = setup_logger(
    name="mcp.server",
    level=logging.INFO,
    log_file="/home/deflex/noa-server/mcp/logs/server.log",
    json_format=True
)
tracer = get_tracer()
metrics_collector = get_metrics_collector()


# Middleware to set request context
@app.before_request
def before_request():
    """Set request context for logging and tracing"""
    request_id = request.headers.get('X-Request-ID', f"req-{time.time()}")
    set_request_context(request_id=request_id)


# Metrics endpoint
@app.route('/metrics')
def metrics():
    """Expose Prometheus metrics"""
    prometheus_data = metrics_collector.export_prometheus()
    return Response(prometheus_data, mimetype='text/plain')


# Health check endpoint
@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time()
    })


# Authentication endpoints
@app.route('/auth/token', methods=['POST'])
def create_token():
    """Create JWT token"""
    try:
        data = request.json
        user_id = data.get('user_id')
        role = data.get('role', 'developer')

        if not user_id:
            return jsonify({"error": "user_id required"}), 400

        # Generate token
        token = jwt_handler.generate_token(user_id=user_id, role=role)

        logger.info(f"Token created for user: {user_id}, role: {role}")

        return jsonify({
            "token": token,
            "type": "Bearer",
            "expires_in": 86400  # 24 hours
        })

    except Exception as e:
        logger.error(f"Token creation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/auth/apikey', methods=['POST'])
def create_api_key():
    """Create API key"""
    try:
        data = request.json
        user_id = data.get('user_id')
        role = data.get('role', 'developer')
        name = data.get('name', 'Default API Key')
        expires_in_days = data.get('expires_in_days', 90)

        if not user_id:
            return jsonify({"error": "user_id required"}), 400

        # Generate API key
        api_key = api_key_handler.generate_key(
            user_id=user_id,
            role=role,
            name=name,
            expires_in_days=expires_in_days
        )

        logger.info(f"API key created for user: {user_id}, name: {name}")

        return jsonify({
            "api_key": api_key,
            "name": name,
            "expires_in_days": expires_in_days
        })

    except Exception as e:
        logger.error(f"API key creation failed: {e}")
        return jsonify({"error": str(e)}), 500


# MCP tool endpoints
@app.route('/mcp/swarm/init', methods=['POST'])
@track_request_metrics(tool="swarm", operation="init")
@trace_mcp_tool(tool="swarm", operation="init")
def swarm_init():
    """Initialize MCP swarm"""
    start_time = time.time()

    # Prepare auth request
    auth_request = {
        "headers": dict(request.headers),
        "tool": "mcp.swarm.init",
        "operation": "execute",
        "ip_address": request.remote_addr,
        "request_id": request.headers.get('X-Request-ID')
    }

    try:
        # Authenticate
        user_context = auth.authenticate(auth_request)
        set_request_context(user_id=user_context['user_id'])

        # Check rate limit
        auth.check_rate_limit(user_context)

        # Authorize
        auth.authorize(user_context, "mcp.swarm.init", "execute")

        # Process request with tracing
        with tracer.span("validate_config") as span:
            config = request.json or {}
            span.set_attribute("topology", config.get("topology", "mesh"))

        with tracer.span("create_swarm") as span:
            # Simulate swarm creation
            time.sleep(0.1)
            swarm_id = f"swarm-{int(time.time())}"
            span.set_attribute("swarm_id", swarm_id)

        # Log success
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="init",
            tool="swarm",
            status="success",
            duration=duration,
            swarm_id=swarm_id
        )

        # Audit log
        auth.audit_log_request(user_context, auth_request, {"swarm_id": swarm_id})

        return jsonify({
            "status": "success",
            "swarm_id": swarm_id,
            "topology": config.get("topology", "mesh")
        })

    except Exception as e:
        # Log error
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="init",
            tool="swarm",
            status="error",
            duration=duration,
            error_type=type(e).__name__,
            error_message=str(e)
        )

        # Audit log
        if 'user_context' in locals():
            auth.audit_log_request(user_context, auth_request, error=e)

        return jsonify({"error": str(e)}), 403


@app.route('/mcp/agent/spawn', methods=['POST'])
@track_request_metrics(tool="agent", operation="spawn")
@trace_mcp_tool(tool="agent", operation="spawn")
def agent_spawn():
    """Spawn MCP agent"""
    start_time = time.time()

    # Prepare auth request
    auth_request = {
        "headers": dict(request.headers),
        "tool": "mcp.agent.spawn",
        "operation": "execute",
        "ip_address": request.remote_addr,
        "request_id": request.headers.get('X-Request-ID')
    }

    try:
        # Authenticate and authorize
        user_context = auth.authenticate(auth_request)
        set_request_context(user_id=user_context['user_id'])
        auth.check_rate_limit(user_context)
        auth.authorize(user_context, "mcp.agent.spawn", "execute")

        # Process request
        config = request.json or {}
        agent_type = config.get("type", "coder")

        with tracer.span("spawn_agent") as span:
            # Simulate agent spawning
            time.sleep(0.05)
            agent_id = f"agent-{agent_type}-{int(time.time())}"
            span.set_attribute("agent_id", agent_id)
            span.set_attribute("agent_type", agent_type)

        # Update metrics
        metrics_collector.get_metric("mcp_agents_active").inc(
            type=agent_type,
            status="active"
        )
        metrics_collector.get_metric("mcp_agents_spawned_total").inc(
            type=agent_type
        )

        # Log success
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="spawn",
            tool="agent",
            status="success",
            duration=duration,
            agent_id=agent_id,
            agent_type=agent_type
        )

        return jsonify({
            "status": "success",
            "agent_id": agent_id,
            "type": agent_type
        })

    except Exception as e:
        # Log error
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="spawn",
            tool="agent",
            status="error",
            duration=duration,
            error_type=type(e).__name__
        )

        return jsonify({"error": str(e)}), 403


@app.route('/mcp/task/orchestrate', methods=['POST'])
@track_request_metrics(tool="task", operation="orchestrate")
@trace_mcp_tool(tool="task", operation="orchestrate")
def task_orchestrate():
    """Orchestrate MCP tasks"""
    start_time = time.time()

    # Prepare auth request
    auth_request = {
        "headers": dict(request.headers),
        "tool": "mcp.task.orchestrate",
        "operation": "execute",
        "ip_address": request.remote_addr,
        "request_id": request.headers.get('X-Request-ID')
    }

    try:
        # Authenticate and authorize
        user_context = auth.authenticate(auth_request)
        set_request_context(user_id=user_context['user_id'])
        auth.check_rate_limit(user_context)
        auth.authorize(user_context, "mcp.task.orchestrate", "execute")

        # Process request
        config = request.json or {}
        tasks = config.get("tasks", [])

        with tracer.span("orchestrate_tasks") as span:
            span.set_attribute("task_count", len(tasks))

            # Simulate task orchestration
            task_ids = []
            for task in tasks:
                with tracer.span(f"schedule_task") as task_span:
                    task_id = f"task-{int(time.time() * 1000)}"
                    task_ids.append(task_id)
                    task_span.set_attribute("task_id", task_id)

        # Update metrics
        metrics_collector.get_metric("mcp_tasks_pending").inc(
            value=len(tasks),
            priority="normal"
        )

        # Log success
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="orchestrate",
            tool="task",
            status="success",
            duration=duration,
            task_count=len(tasks)
        )

        return jsonify({
            "status": "success",
            "task_ids": task_ids,
            "count": len(task_ids)
        })

    except Exception as e:
        # Log error
        duration = time.time() - start_time
        log_mcp_operation(
            logger,
            operation="orchestrate",
            tool="task",
            status="error",
            duration=duration,
            error_type=type(e).__name__
        )

        return jsonify({"error": str(e)}), 403


# Admin endpoints
@app.route('/admin/audit-logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs (admin only)"""
    auth_request = {
        "headers": dict(request.headers),
        "tool": "mcp.admin.audit_logs",
        "operation": "read"
    }

    try:
        user_context = auth.authenticate(auth_request)

        # Check admin role
        if user_context.get('role') != 'admin':
            return jsonify({"error": "Admin access required"}), 403

        # Get logs
        logs = auth.get_audit_logs(limit=100)

        return jsonify({
            "logs": logs,
            "count": len(logs)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 403


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500


# Startup
def initialize_demo_users():
    """Initialize demo users for testing"""
    logger.info("Initializing demo users...")

    # Create demo tokens
    admin_token = jwt_handler.generate_token("admin-user", "admin")
    dev_token = jwt_handler.generate_token("dev-user", "developer")
    readonly_token = jwt_handler.generate_token("readonly-user", "readonly")

    # Create demo API keys
    admin_key = api_key_handler.generate_key(
        "admin-user", "admin", "Admin Key", expires_in_days=365
    )
    dev_key = api_key_handler.generate_key(
        "dev-user", "developer", "Dev Key", expires_in_days=90
    )

    logger.info("Demo users initialized:")
    logger.info(f"  Admin Token: {admin_token}")
    logger.info(f"  Developer Token: {dev_token}")
    logger.info(f"  Readonly Token: {readonly_token}")
    logger.info(f"  Admin API Key: {admin_key}")
    logger.info(f"  Developer API Key: {dev_key}")


if __name__ == '__main__':
    # Initialize demo users
    initialize_demo_users()

    # Start server
    logger.info("Starting MCP server on http://0.0.0.0:8080")
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=False
    )
