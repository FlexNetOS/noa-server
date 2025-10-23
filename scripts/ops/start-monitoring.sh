#!/bin/bash
# Start Monitoring Stack for Noa Server
# Usage: ./scripts/ops/start-monitoring.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Noa Server Monitoring Stack${NC}"
echo "======================================"

# Change to project root
cd "$(dirname "$0")/../.."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Create required directories
echo -e "${YELLOW}Creating monitoring directories...${NC}"
mkdir -p config/monitoring
mkdir -p logs/monitoring

# Check if monitoring configuration exists
if [ ! -f "Docker/docker-compose.monitoring.yml" ]; then
    echo -e "${RED}Error: Monitoring configuration not found${NC}"
    echo "Expected: Docker/docker-compose.monitoring.yml"
    exit 1
fi

# Check for environment variables
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Using defaults.${NC}"
    cat > .env << EOF
# Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# Alertmanager Configuration (optional)
SMTP_PASSWORD=
SLACK_WEBHOOK_URL=
PAGERDUTY_SERVICE_KEY=
WEBHOOK_URL=

# Monitoring URLs (optional)
PRODUCTION_URL=https://noa-server.example.com
STAGING_URL=https://staging.noa-server.example.com
EOF
    echo -e "${GREEN}Created default .env file. Please update with your values.${NC}"
fi

# Pull latest images
echo -e "${YELLOW}Pulling Docker images...${NC}"
docker-compose -f Docker/docker-compose.monitoring.yml pull

# Start monitoring stack
echo -e "${YELLOW}Starting monitoring services...${NC}"
docker-compose -f Docker/docker-compose.monitoring.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "\n${YELLOW}Checking service status...${NC}"
docker-compose -f Docker/docker-compose.monitoring.yml ps

# Test service endpoints
echo -e "\n${YELLOW}Testing service endpoints...${NC}"

check_endpoint() {
    local name=$1
    local url=$2
    local expected=$3

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name is accessible${NC}"
    else
        echo -e "${RED}✗ $name is not accessible yet (may need more time)${NC}"
    fi
}

check_endpoint "Prometheus" "http://localhost:9090/-/healthy" "200"
check_endpoint "Grafana" "http://localhost:3001/api/health" "200"
check_endpoint "Alertmanager" "http://localhost:9093/-/healthy" "200"
check_endpoint "Node Exporter" "http://localhost:9100/metrics" "200"

# Display access information
echo -e "\n${GREEN}Monitoring Stack Started Successfully!${NC}"
echo "======================================"
echo ""
echo "Access dashboards at:"
echo -e "  ${YELLOW}Prometheus:${NC}    http://localhost:9090"
echo -e "  ${YELLOW}Grafana:${NC}       http://localhost:3001 (admin/admin)"
echo -e "  ${YELLOW}Alertmanager:${NC}  http://localhost:9093"
echo ""
echo "To view logs:"
echo "  docker-compose -f Docker/docker-compose.monitoring.yml logs -f"
echo ""
echo "To stop monitoring:"
echo "  docker-compose -f Docker/docker-compose.monitoring.yml down"
echo ""
echo -e "${YELLOW}Note:${NC} Change default Grafana password after first login!"

# Create Grafana dashboard URL
echo ""
echo "Grafana Dashboard Configuration:"
echo "  1. Login to Grafana: http://localhost:3001"
echo "  2. Username: admin, Password: admin"
echo "  3. Dashboard is pre-configured at:"
echo "     http://localhost:3001/d/noa-server-production"
echo ""

# Check if production services are running to scrape
echo -e "${YELLOW}Checking for application services to monitor...${NC}"
if docker ps | grep -q "noa-api"; then
    echo -e "${GREEN}✓ Noa API service detected${NC}"
else
    echo -e "${YELLOW}ℹ No Noa API service running yet. Metrics will be available when services start.${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
