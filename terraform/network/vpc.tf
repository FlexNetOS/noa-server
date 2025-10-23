# VPC Configuration for Zero-Trust Architecture
# AWS VPC with private subnets and security groups

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# VPC
resource "aws_vpc" "noa" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "noa-vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "noa" {
  vpc_id = aws_vpc.noa.id

  tags = {
    Name        = "noa-igw-${var.environment}"
    Environment = var.environment
  }
}

# Public Subnets (for load balancers)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.noa.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "noa-public-${count.index + 1}-${var.environment}"
    Environment = var.environment
    Type        = "public"
  }
}

# Private Subnets (for applications)
resource "aws_subnet" "private_app" {
  count             = 3
  vpc_id            = aws_vpc.noa.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "noa-private-app-${count.index + 1}-${var.environment}"
    Environment = var.environment
    Type        = "private-app"
  }
}

# Private Subnets (for databases)
resource "aws_subnet" "private_db" {
  count             = 3
  vpc_id            = aws_vpc.noa.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "noa-private-db-${count.index + 1}-${var.environment}"
    Environment = var.environment
    Type        = "private-db"
  }
}

# NAT Gateways (one per AZ for HA)
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name        = "noa-nat-eip-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "noa" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "noa-nat-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.noa]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.noa.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.noa.id
  }

  tags = {
    Name        = "noa-public-rt-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route_table" "private_app" {
  count  = 3
  vpc_id = aws_vpc.noa.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.noa[count.index].id
  }

  tags = {
    Name        = "noa-private-app-rt-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.noa.id

  tags = {
    Name        = "noa-private-db-rt-${var.environment}"
    Environment = var.environment
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = 3
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app[count.index].id
}

resource "aws_route_table_association" "private_db" {
  count          = 3
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db.id
}

# VPC Flow Logs
resource "aws_flow_log" "noa" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.noa.id

  tags = {
    Name        = "noa-flow-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/noa-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "noa-flow-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role" "flow_logs" {
  name = "noa-flow-logs-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "noa-flow-logs-policy-${var.environment}"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "vpc_id" {
  value = aws_vpc.noa.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  value = aws_subnet.private_app[*].id
}

output "private_db_subnet_ids" {
  value = aws_subnet.private_db[*].id
}
