# EC2 Launch Template Configuration

# User data script for application servers
locals {
  app_user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    yum update -y

    # Install Node.js 20
    curl -sL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs

    # Install Docker
    yum install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user

    # Install CloudWatch agent
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
    rpm -U ./amazon-cloudwatch-agent.rpm

    # Create application directory
    mkdir -p /opt/noa-server
    cd /opt/noa-server

    # Pull application from S3 or ECR
    aws s3 cp s3://noa-server-${var.environment}/deploy/latest.tar.gz ./
    tar -xzf latest.tar.gz

    # Install dependencies
    npm ci --production

    # Get secrets from Secrets Manager
    export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id noa-server-${var.environment}-db-url --query SecretString --output text)
    export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id noa-server-${var.environment}-jwt-secret --query SecretString --output text)
    export API_KEY=$(aws secretsmanager get-secret-value --secret-id noa-server-${var.environment}-api-key --query SecretString --output text)

    # Create environment file
    cat > /opt/noa-server/.env <<ENVEOF
    NODE_ENV=production
    PORT=3000
    DATABASE_URL=$DATABASE_URL
    REDIS_URL=redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379
    JWT_SECRET=$JWT_SECRET
    API_KEY=$API_KEY
    ENVEOF

    # Create systemd service
    cat > /etc/systemd/system/noa-server.service <<SERVICEEOF
    [Unit]
    Description=Noa Server Application
    After=network.target

    [Service]
    Type=simple
    User=ec2-user
    WorkingDirectory=/opt/noa-server
    EnvironmentFile=/opt/noa-server/.env
    ExecStart=/usr/bin/node /opt/noa-server/dist/index.js
    Restart=always
    RestartSec=10
    StandardOutput=journal
    StandardError=journal
    SyslogIdentifier=noa-server

    [Install]
    WantedBy=multi-user.target
    SERVICEEOF

    # Start application
    systemctl daemon-reload
    systemctl enable noa-server
    systemctl start noa-server

    # Configure CloudWatch agent
    cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<CWEOF
    {
      "metrics": {
        "namespace": "NoaServer/${var.environment}",
        "metrics_collected": {
          "cpu": {
            "measurement": [{"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"}],
            "metrics_collection_interval": 60,
            "totalcpu": false
          },
          "disk": {
            "measurement": [{"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}],
            "metrics_collection_interval": 60,
            "resources": ["*"]
          },
          "mem": {
            "measurement": [{"name": "mem_used_percent", "rename": "MEM_USED", "unit": "Percent"}],
            "metrics_collection_interval": 60
          }
        }
      },
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [
              {
                "file_path": "/var/log/noa-server/*.log",
                "log_group_name": "/aws/noa-server/${var.environment}",
                "log_stream_name": "{instance_id}/application"
              },
              {
                "file_path": "/var/log/messages",
                "log_group_name": "/aws/noa-server/${var.environment}",
                "log_stream_name": "{instance_id}/system"
              }
            ]
          }
        }
      }
    }
    CWEOF

    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config \
      -m ec2 \
      -s \
      -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

    # Signal CloudFormation/Auto Scaling that instance is ready
    echo "Instance ready"
  EOF

  worker_user_data = <<-EOF
    #!/bin/bash
    set -e

    # Similar to app_user_data but for workers
    yum update -y
    curl -sL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs

    mkdir -p /opt/noa-worker
    cd /opt/noa-worker

    aws s3 cp s3://noa-server-${var.environment}/deploy/worker-latest.tar.gz ./
    tar -xzf worker-latest.tar.gz
    npm ci --production

    # Get secrets
    export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id noa-server-${var.environment}-db-url --query SecretString --output text)

    cat > /opt/noa-worker/.env <<ENVEOF
    NODE_ENV=production
    DATABASE_URL=$DATABASE_URL
    REDIS_URL=redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379
    RABBITMQ_URL=amqp://${aws_mq_broker.rabbitmq.instances[0].endpoints[0]}
    ENVEOF

    cat > /etc/systemd/system/noa-worker.service <<SERVICEEOF
    [Unit]
    Description=Noa Worker
    After=network.target

    [Service]
    Type=simple
    User=ec2-user
    WorkingDirectory=/opt/noa-worker
    EnvironmentFile=/opt/noa-worker/.env
    ExecStart=/usr/bin/node /opt/noa-worker/dist/worker.js
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target
    SERVICEEOF

    systemctl daemon-reload
    systemctl enable noa-worker
    systemctl start noa-worker
  EOF
}

# Launch Template for Application Servers
resource "aws_launch_template" "app_lt" {
  name_prefix   = "noa-server-lt-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type
  key_name      = var.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.app_profile.name
  }

  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.app_sg.id]
  }

  user_data = base64encode(local.app_user_data)

  # EBS configuration
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = true
      encrypted             = true
    }
  }

  # Monitoring
  monitoring {
    enabled = true
  }

  # Instance metadata options
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "noa-server-${var.environment}"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }

  tag_specifications {
    resource_type = "volume"

    tags = {
      Name        = "noa-server-volume-${var.environment}"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "noa-server-lt-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Launch Template for Worker Servers
resource "aws_launch_template" "worker_lt" {
  name_prefix   = "noa-worker-lt-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.medium"
  key_name      = var.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.app_profile.name
  }

  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.app_sg.id]
  }

  user_data = base64encode(local.worker_user_data)

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = true
      encrypted             = true
    }
  }

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "noa-worker-${var.environment}"
      Environment = var.environment
      Type        = "worker"
      ManagedBy   = "terraform"
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "noa-worker-lt-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ElastiCache Redis Cluster (referenced in user data)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "noa-redis-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  tags = {
    Name        = "noa-redis-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "noa-redis-subnet-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "noa-redis-subnet-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security Group for Redis
resource "aws_security_group" "redis_sg" {
  name        = "noa-redis-sg-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "Redis from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "noa-redis-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Amazon MQ (RabbitMQ) - referenced in worker user data
resource "aws_mq_broker" "rabbitmq" {
  broker_name        = "noa-rabbitmq-${var.environment}"
  engine_type        = "RabbitMQ"
  engine_version     = "3.11.20"
  host_instance_type = "mq.t3.micro"
  deployment_mode    = "SINGLE_INSTANCE"

  user {
    username = "admin"
    password = random_password.rabbitmq_password.result
  }

  subnet_ids         = [var.private_subnet_ids[0]]
  security_groups    = [aws_security_group.rabbitmq_sg.id]
  publicly_accessible = false

  tags = {
    Name        = "noa-rabbitmq-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Random password for RabbitMQ
resource "random_password" "rabbitmq_password" {
  length  = 16
  special = true
}

# Security Group for RabbitMQ
resource "aws_security_group" "rabbitmq_sg" {
  name        = "noa-rabbitmq-sg-${var.environment}"
  description = "Security group for RabbitMQ"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "AMQPS from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "noa-rabbitmq-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Outputs
output "app_launch_template_id" {
  description = "ID of the application launch template"
  value       = aws_launch_template.app_lt.id
}

output "worker_launch_template_id" {
  description = "ID of the worker launch template"
  value       = aws_launch_template.worker_lt.id
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "rabbitmq_endpoint" {
  description = "RabbitMQ broker endpoint"
  value       = aws_mq_broker.rabbitmq.instances[0].endpoints[0]
}
