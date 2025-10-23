# Target Group Configuration for Application Load Balancer

# Main Application Target Group
resource "aws_lb_target_group" "app_tg" {
  name     = "noa-server-tg-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  # Health check configuration
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  # Deregistration delay
  deregistration_delay = 30

  # Stickiness
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  # Connection settings
  connection_termination = true
  slow_start            = 30

  # Target health state
  target_health_state {
    enable_unhealthy_connection_termination = true
  }

  tags = {
    Name        = "noa-server-tg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Application v2 Target Group (for canary deployments)
resource "aws_lb_target_group" "app_v2_tg" {
  name     = "noa-server-v2-tg-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name        = "noa-server-v2-tg-${var.environment}"
    Environment = var.environment
    Version     = "v2"
    ManagedBy   = "terraform"
  }
}

# MCP Server Target Group
resource "aws_lb_target_group" "mcp_tg" {
  name     = "noa-mcp-tg-${var.environment}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 60  # Longer delay for MCP operations

  tags = {
    Name        = "noa-mcp-tg-${var.environment}"
    Environment = var.environment
    Service     = "mcp"
    ManagedBy   = "terraform"
  }
}

# WebSocket Target Group
resource "aws_lb_target_group" "websocket_tg" {
  name     = "noa-ws-tg-${var.environment}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 300  # 5 minutes for WebSocket connections

  # Stickiness is critical for WebSocket
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name        = "noa-ws-tg-${var.environment}"
    Environment = var.environment
    Service     = "websocket"
    ManagedBy   = "terraform"
  }
}

# Target Group Attachment for ASG
# This is handled automatically by the Auto Scaling Group configuration

# CloudWatch Alarms for Target Groups

# Alarm for unhealthy targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "noa-server-unhealthy-targets-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors unhealthy target count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.app_tg.arn_suffix
    LoadBalancer = aws_lb.app_alb.arn_suffix
  }

  tags = {
    Name        = "noa-server-unhealthy-targets-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Alarm for target response time
resource "aws_cloudwatch_metric_alarm" "target_response_time" {
  alarm_name          = "noa-server-high-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1.0"  # 1 second
  alarm_description   = "This metric monitors target response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.app_tg.arn_suffix
    LoadBalancer = aws_lb.app_alb.arn_suffix
  }

  tags = {
    Name        = "noa-server-high-response-time-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Alarm for HTTP 5xx errors
resource "aws_cloudwatch_metric_alarm" "http_5xx" {
  alarm_name          = "noa-server-http-5xx-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors HTTP 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.app_tg.arn_suffix
    LoadBalancer = aws_lb.app_alb.arn_suffix
  }

  tags = {
    Name        = "noa-server-http-5xx-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "noa-server-alerts-${var.environment}"

  tags = {
    Name        = "noa-server-alerts-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# SNS Topic Subscription
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Variable for alert email
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "ops@noa-server.io"
}

# Outputs
output "app_target_group_arn" {
  description = "ARN of the main application target group"
  value       = aws_lb_target_group.app_tg.arn
}

output "app_v2_target_group_arn" {
  description = "ARN of the v2 application target group"
  value       = aws_lb_target_group.app_v2_tg.arn
}

output "mcp_target_group_arn" {
  description = "ARN of the MCP target group"
  value       = aws_lb_target_group.mcp_tg.arn
}

output "websocket_target_group_arn" {
  description = "ARN of the WebSocket target group"
  value       = aws_lb_target_group.websocket_tg.arn
}
