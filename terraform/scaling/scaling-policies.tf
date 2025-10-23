# Auto Scaling Policies and CloudWatch Alarms

# Target Tracking Scaling Policy - CPU
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "noa-server-cpu-target-tracking-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Target Tracking Scaling Policy - Request Count
resource "aws_autoscaling_policy" "request_count_target_tracking" {
  name                   = "noa-server-request-count-target-tracking-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.app_alb.arn_suffix}/${aws_lb_target_group.app_tg.arn_suffix}"
    }
    target_value = 1000.0  # 1000 requests per target per minute
  }
}

# Step Scaling Policy - Scale Up
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "noa-server-scale-up-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  adjustment_type        = "PercentChangeInCapacity"
  policy_type            = "StepScaling"
  min_adjustment_magnitude = 1

  step_adjustment {
    scaling_adjustment          = 100  # Double the capacity
    metric_interval_lower_bound = 0
    metric_interval_upper_bound = 10
  }

  step_adjustment {
    scaling_adjustment          = 200  # Triple the capacity
    metric_interval_lower_bound = 10
  }
}

# Step Scaling Policy - Scale Down
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "noa-server-scale-down-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  adjustment_type        = "PercentChangeInCapacity"
  policy_type            = "StepScaling"

  step_adjustment {
    scaling_adjustment          = -10  # Reduce by 10%
    metric_interval_lower_bound = -10
    metric_interval_upper_bound = 0
  }

  step_adjustment {
    scaling_adjustment          = -30  # Reduce by 30%
    metric_interval_upper_bound = -10
  }
}

# CloudWatch Alarm - High CPU
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "noa-server-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors EC2 CPU utilization"
  alarm_actions       = [
    aws_autoscaling_policy.scale_up.arn,
    aws_sns_topic.alerts.arn
  ]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  tags = {
    Name        = "noa-server-high-cpu-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# CloudWatch Alarm - Low CPU
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "noa-server-low-cpu-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "20"
  alarm_description   = "This metric monitors EC2 CPU for scale down"
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  tags = {
    Name        = "noa-server-low-cpu-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# CloudWatch Alarm - High Memory
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "noa-server-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MEM_USED"
  namespace           = "NoaServer/${var.environment}"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors memory utilization"
  alarm_actions       = [
    aws_autoscaling_policy.scale_up.arn,
    aws_sns_topic.alerts.arn
  ]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  tags = {
    Name        = "noa-server-high-memory-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Scheduled Scaling - Scale up for peak hours
resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning-${var.environment}"
  min_size               = 5
  max_size               = var.max_size
  desired_capacity       = 8
  recurrence             = "0 8 * * MON-FRI"  # 8 AM weekdays
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
}

# Scheduled Scaling - Scale down for off-peak hours
resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night-${var.environment}"
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = 3
  recurrence             = "0 22 * * *"  # 10 PM daily
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
}

# Worker Auto Scaling Policy - Queue Depth
resource "aws_autoscaling_policy" "worker_queue_depth" {
  name                   = "noa-worker-queue-depth-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.worker_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    customized_metric_specification {
      metric_dimension {
        name  = "QueueName"
        value = "noa-jobs"
      }
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"
    }
    target_value = 100.0  # Target 100 messages per worker
  }
}

# Worker Scaling Policy - CPU
resource "aws_autoscaling_policy" "worker_cpu" {
  name                   = "noa-worker-cpu-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.worker_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "noa-server-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", { stat = "Average", label = "CPU Utilization" }],
            ["NoaServer/${var.environment}", "MEM_USED", { stat = "Average", label = "Memory Used" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Instance Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum", label = "Request Count" }],
            [".", "TargetResponseTime", { stat = "Average", label = "Response Time" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "5XX Errors" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Load Balancer Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/AutoScaling", "GroupDesiredCapacity", { label = "Desired Capacity" }],
            [".", "GroupInServiceInstances", { label = "In Service" }],
            [".", "GroupPendingInstances", { label = "Pending" }],
            [".", "GroupTerminatingInstances", { label = "Terminating" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Auto Scaling Metrics"
        }
      }
    ]
  })
}

# Data source for current region
data "aws_region" "current" {}

# Outputs
output "cpu_target_tracking_policy_arn" {
  description = "ARN of the CPU target tracking policy"
  value       = aws_autoscaling_policy.cpu_target_tracking.arn
}

output "request_count_policy_arn" {
  description = "ARN of the request count target tracking policy"
  value       = aws_autoscaling_policy.request_count_target_tracking.arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}
