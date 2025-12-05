#!/bin/bash
# RTT v1.0.0 Production Deployment Script
# Supports multiple deployment modes: systemd, docker, kubernetes, manual

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$RTT_ROOT"

DEPLOYMENT_MODE=${1:-manual}

echo "=========================================="
echo "RTT v1.0.0 Production Deployment"
echo "=========================================="
echo "Mode: $DEPLOYMENT_MODE"
echo "Root: $RTT_ROOT"
echo "Time: $(date)"
echo ""

# Pre-flight checks
echo "🔍 Running pre-flight checks..."

# Check Python availability
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi
echo "✅ Python3 available"

# Check required directories
if [ ! -d "auto" ] || [ ! -d "tools" ]; then
    echo "❌ Required directories missing (auto, tools)"
    exit 1
fi
echo "✅ Core directories present"

# Run health check if available
if [ -f "scripts/health-check.sh" ]; then
    echo ""
    echo "Running system health check..."
    bash scripts/health-check.sh || {
        echo ""
        echo "⚠️  Pre-flight health check failed - continuing anyway"
    }
fi

# Run tests if available
if [ -f "tests/run_all.sh" ]; then
    echo ""
    echo "🧪 Running test suite..."
    bash tests/run_all.sh || {
        echo ""
        echo "⚠️  Tests failed - continuing deployment (manual mode)"
        if [ "$DEPLOYMENT_MODE" != "manual" ]; then
            echo "❌ Cannot deploy to production with failing tests"
            exit 1
        fi
    }
fi

# Deployment methods
deploy_manual() {
    echo ""
    echo "📦 Manual Deployment Mode"
    echo "=========================================="

    # Bootstrap
    echo "Step 1/5: Bootstrap environment..."
    python3 auto/00-bootstrap.py

    # Scan symbols
    echo ""
    echo "Step 2/5: Scan symbols..."
    if [ -f "auto/10-scan_symbols.py" ]; then
        python3 auto/10-scan_symbols.py
    else
        echo "⚠️  Symbol scanner not found, skipping"
    fi

    # Dependency doctor
    echo ""
    echo "Step 3/5: Dependency analysis..."
    if [ -f "auto/20-depdoctor.py" ]; then
        python3 auto/20-depdoctor.py
    else
        echo "⚠️  Dependency doctor not found, skipping"
    fi

    # Generate connectors
    echo ""
    echo "Step 4/5: Generate connectors..."
    if [ -f "auto/30-generate_connectors.py" ]; then
        python3 auto/30-generate_connectors.py
    else
        echo "⚠️  Connector generator not found, skipping"
    fi

    # Plan solver (if applicable)
    echo ""
    echo "Step 5/5: Plan solver..."
    if [ -f "auto/40-plan_solver.py" ]; then
        python3 auto/40-plan_solver.py
    else
        echo "⚠️  Plan solver not found, skipping"
    fi

    echo ""
    echo "✅ Manual deployment complete"
}

deploy_systemd() {
    echo ""
    echo "📦 Deploying via systemd..."

    # Run manual deployment first
    deploy_manual

    if [ ! -f "systemd/rtt.service" ]; then
        echo "❌ systemd/rtt.service not found"
        exit 1
    fi

    echo ""
    echo "Installing systemd service..."
    sudo cp systemd/rtt.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable rtt
    sudo systemctl restart rtt

    echo "✅ Systemd deployment complete"
    echo ""
    echo "Service status:"
    sudo systemctl status rtt --no-pager || true
}

deploy_docker() {
    echo ""
    echo "🐳 Deploying via Docker..."

    if [ ! -f "docker-compose.yml" ]; then
        echo "❌ docker-compose.yml not found"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        echo "❌ Docker not found"
        exit 1
    fi

    echo "Building and starting containers..."
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi

    echo "✅ Docker deployment complete"
    echo ""
    echo "Container status:"
    docker ps | grep rtt || true
}

deploy_kubernetes() {
    echo ""
    echo "☸️  Deploying via Kubernetes..."

    if ! command -v helm &> /dev/null; then
        echo "❌ Helm not found"
        exit 1
    fi

    # Find helm chart
    chart_file=$(find charts -name "*.tgz" | head -1)

    if [ -z "$chart_file" ]; then
        echo "❌ No Helm chart found in charts/"
        exit 1
    fi

    echo "Deploying chart: $chart_file"
    helm upgrade --install rtt "$chart_file" --create-namespace --namespace rtt-system

    echo "✅ Kubernetes deployment complete"
    echo ""
    echo "Pod status:"
    kubectl get pods -n rtt-system || true
}

deploy_vercel() {
    echo ""
    echo "▲ Deploying via Vercel..."

    if ! command -v vercel &> /dev/null; then
        echo "❌ Vercel CLI not found"
        echo "Install with: npm i -g vercel"
        exit 1
    fi

    echo "Deploying to Vercel..."
    vercel --prod

    echo "✅ Vercel deployment complete"
}

# Execute deployment based on mode
case $DEPLOYMENT_MODE in
    manual)
        deploy_manual
        ;;
    systemd)
        deploy_systemd
        ;;
    docker)
        deploy_docker
        ;;
    kubernetes|k8s)
        deploy_kubernetes
        ;;
    vercel)
        deploy_vercel
        ;;
    *)
        echo "❌ Unknown deployment mode: $DEPLOYMENT_MODE"
        echo ""
        echo "Usage: $0 [manual|systemd|docker|kubernetes|vercel]"
        echo ""
        echo "Available modes:"
        echo "  manual      - Local development deployment"
        echo "  systemd     - System service deployment"
        echo "  docker      - Docker container deployment"
        echo "  kubernetes  - Kubernetes cluster deployment"
        echo "  vercel      - Vercel serverless deployment"
        exit 1
        ;;
esac

# Post-deployment verification
echo ""
echo "=========================================="
echo "Post-Deployment Verification"
echo "=========================================="

sleep 2

if [ -f "scripts/health-check.sh" ]; then
    echo "Running health check..."
    bash scripts/health-check.sh || {
        echo "⚠️  Post-deployment health check failed"
        exit 1
    }
else
    echo "⚠️  Health check script not found"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo "  Mode:   $DEPLOYMENT_MODE"
echo "  Time:   $(date)"
echo "  Status: DEPLOYED"
echo "=========================================="
