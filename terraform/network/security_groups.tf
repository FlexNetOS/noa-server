# Security Groups for Zero-Trust Network Architecture

# Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name_prefix = "noa-alb-${var.environment}-"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.noa.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To Noa server"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.noa_server.id]
  }

  tags = {
    Name        = "noa-alb-sg-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Noa Server Security Group
resource "aws_security_group" "noa_server" {
  name_prefix = "noa-server-${var.environment}-"
  description = "Security group for Noa Server"
  vpc_id      = aws_vpc.noa.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "Metrics from Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description     = "To PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.postgresql.id]
  }

  egress {
    description     = "To Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.redis.id]
  }

  egress {
    description     = "To MCP Servers"
    from_port       = 3000
    to_port         = 9999
    protocol        = "tcp"
    security_groups = [aws_security_group.mcp_servers.id]
  }

  egress {
    description = "HTTPS to internet (Claude API)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "noa-server-sg-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# PostgreSQL Security Group
resource "aws_security_group" "postgresql" {
  name_prefix = "noa-postgresql-${var.environment}-"
  description = "Security group for PostgreSQL"
  vpc_id      = aws_vpc.noa.id

  ingress {
    description     = "PostgreSQL from Noa Server"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.noa_server.id]
  }

  ingress {
    description     = "PostgreSQL from MCP Servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.mcp_servers.id]
  }

  ingress {
    description = "PostgreSQL replication"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "PostgreSQL replication"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
  }

  tags = {
    Name        = "noa-postgresql-sg-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name_prefix = "noa-redis-${var.environment}-"
  description = "Security group for Redis"
  vpc_id      = aws_vpc.noa.id

  ingress {
    description     = "Redis from Noa Server"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.noa_server.id]
  }

  ingress {
    description = "Redis cluster"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    self        = true
  }

  egress {
    description = "Redis cluster"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    self        = true
  }

  tags = {
    Name        = "noa-redis-sg-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# MCP Servers Security Group
resource "aws_security_group" "mcp_servers" {
  name_prefix = "noa-mcp-${var.environment}-"
  description = "Security group for MCP Servers"
  vpc_id      = aws_vpc.noa.id

  ingress {
    description     = "MCP from Noa Server"
    from_port       = 3000
    to_port         = 9999
    protocol        = "tcp"
    security_groups = [aws_security_group.noa_server.id]
  }

  egress {
    description     = "To PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.postgresql.id]
  }

  egress {
    description = "HTTPS to internet (AI APIs)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "noa-mcp-servers-sg-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Outputs
output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "noa_server_security_group_id" {
  value = aws_security_group.noa_server.id
}

output "postgresql_security_group_id" {
  value = aws_security_group.postgresql.id
}

output "redis_security_group_id" {
  value = aws_security_group.redis.id
}

output "mcp_servers_security_group_id" {
  value = aws_security_group.mcp_servers.id
}
