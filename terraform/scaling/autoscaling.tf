# AWS Auto Scaling Configuration for Noa Server
# This Terraform configuration sets up Auto Scaling Groups for horizontal scaling

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID for deployment"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "key_name" {
  description = "EC2 key pair name"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "min_size" {
  description = "Minimum number of instances"
  type        = number
  default     = 3
}

variable "max_size" {
  description = "Maximum number of instances"
  type        = number
  default     = 20
}

variable "desired_capacity" {
  description = "Desired number of instances"
  type        = number
  default     = 5
}

# Data sources
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for Application Servers
resource "aws_security_group" "app_sg" {
  name        = "noa-server-app-sg-${var.environment}"
  description = "Security group for Noa Server application instances"
  vpc_id      = var.vpc_id

  # HTTP from load balancer
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "HTTP from load balancer"
  }

  # Health check port
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "Health check from load balancer"
  }

  # SSH from bastion (optional)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "SSH from internal network"
  }

  # Metrics port for Prometheus
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Metrics for Prometheus"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "noa-server-app-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security Group for Load Balancer
resource "aws_security_group" "alb_sg" {
  name        = "noa-server-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "noa-server-alb-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM Role for EC2 instances
resource "aws_iam_role" "app_role" {
  name = "noa-server-app-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "noa-server-app-role-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM Policy for application
resource "aws_iam_role_policy" "app_policy" {
  name = "noa-server-app-policy-${var.environment}"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::noa-server-${var.environment}/*",
          "arn:aws:s3:::noa-server-${var.environment}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:noa-server-${var.environment}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/noa-server-${var.environment}/*"
      }
    ]
  })
}

# Attach AWS managed policies
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_policy" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "app_profile" {
  name = "noa-server-app-profile-${var.environment}"
  role = aws_iam_role.app_role.name

  tags = {
    Name        = "noa-server-app-profile-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app_asg" {
  name                      = "noa-server-asg-${var.environment}"
  vpc_zone_identifier       = var.private_subnet_ids
  launch_template {
    id      = aws_launch_template.app_lt.id
    version = "$Latest"
  }

  min_size                  = var.min_size
  max_size                  = var.max_size
  desired_capacity          = var.desired_capacity
  health_check_type         = "ELB"
  health_check_grace_period = 300
  force_delete              = false
  wait_for_capacity_timeout = "10m"

  # Target group attachment is done in load-balancer.tf
  target_group_arns = [aws_lb_target_group.app_tg.arn]

  enabled_metrics = [
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupMaxSize",
    "GroupMinSize",
    "GroupPendingInstances",
    "GroupStandbyInstances",
    "GroupTerminatingInstances",
    "GroupTotalInstances"
  ]

  # Instance refresh configuration
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 300
    }
    triggers = ["tag"]
  }

  # Lifecycle hooks
  initial_lifecycle_hook {
    name                 = "instance-launching"
    default_result       = "CONTINUE"
    heartbeat_timeout    = 300
    lifecycle_transition = "autoscaling:EC2_INSTANCE_LAUNCHING"
  }

  initial_lifecycle_hook {
    name                 = "instance-terminating"
    default_result       = "CONTINUE"
    heartbeat_timeout    = 300
    lifecycle_transition = "autoscaling:EC2_INSTANCE_TERMINATING"
  }

  tag {
    key                 = "Name"
    value               = "noa-server-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "terraform"
    propagate_at_launch = true
  }

  tag {
    key                 = "Application"
    value               = "noa-server"
    propagate_at_launch = true
  }
}

# Auto Scaling Group for Workers
resource "aws_autoscaling_group" "worker_asg" {
  name                      = "noa-worker-asg-${var.environment}"
  vpc_zone_identifier       = var.private_subnet_ids
  launch_template {
    id      = aws_launch_template.worker_lt.id
    version = "$Latest"
  }

  min_size                  = 1
  max_size                  = 15
  desired_capacity          = 3
  health_check_type         = "EC2"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "noa-worker-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Type"
    value               = "worker"
    propagate_at_launch = true
  }
}

# CloudWatch Alarms will trigger scaling policies
# See scaling-policies.tf for detailed scaling configurations

# Outputs
output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.app_asg.name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group"
  value       = aws_autoscaling_group.app_asg.arn
}

output "worker_asg_name" {
  description = "Name of the Worker Auto Scaling Group"
  value       = aws_autoscaling_group.worker_asg.name
}

output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app_sg.id
}

output "alb_security_group_id" {
  description = "ID of the load balancer security group"
  value       = aws_security_group.alb_sg.id
}
