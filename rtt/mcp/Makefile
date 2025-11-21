# Makefile for MCP Platform
.PHONY: help install build test lint clean docker-build deploy-local deploy-dev deploy-staging deploy-prod

# Default target
.DEFAULT_GOAL := help

# Variables
REGISTRY := ghcr.io
IMAGE_PREFIX := yourorg/mcp
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
KUBECTL := kubectl
HELM := helm

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)MCP Platform - Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ==========================================
# Development
# ==========================================

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm ci
	@echo "$(BLUE)Installing workspace dependencies...$(NC)"
	npm run install:workspaces
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

build: ## Build all components
	@echo "$(BLUE)Building all components...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-server: ## Build MCP server only
	@echo "$(BLUE)Building MCP server...$(NC)"
	npm run build:server
	@echo "$(GREEN)✓ Server built$(NC)"

build-gateway: ## Build gateway only
	@echo "$(BLUE)Building gateway...$(NC)"
	npm run build:gateway
	@echo "$(GREEN)✓ Gateway built$(NC)"

build-ui: ## Build UI only
	@echo "$(BLUE)Building UI...$(NC)"
	npm run build:ui
	@echo "$(GREEN)✓ UI built$(NC)"

dev: ## Run all services in development mode (requires tmux)
	@echo "$(BLUE)Starting all services in development mode...$(NC)"
	@tmux new-session -d -s mcp 'cd src/server && npm run dev' \; \
		split-window -h 'cd src/gateway && npm run dev' \; \
		split-window -v 'cd src/ui && npm run dev' \; \
		attach
	@echo "$(GREEN)✓ Development servers started$(NC)"

dev-server: ## Run MCP server in development mode
	@echo "$(BLUE)Starting MCP server...$(NC)"
	cd src/server && npm run dev

dev-gateway: ## Run gateway in development mode
	@echo "$(BLUE)Starting gateway...$(NC)"
	cd src/gateway && npm run dev

dev-ui: ## Run UI in development mode
	@echo "$(BLUE)Starting UI...$(NC)"
	cd src/ui && npm run dev

# ==========================================
# Testing
# ==========================================

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	npm run test
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	npm run test:unit
	@echo "$(GREEN)✓ Unit tests complete$(NC)"

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	npm run test:integration
	@echo "$(GREEN)✓ Integration tests complete$(NC)"

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	npm run test:e2e
	@echo "$(GREEN)✓ E2E tests complete$(NC)"

test-load: ## Run load tests
	@echo "$(BLUE)Running load tests...$(NC)"
	npm run test:load
	@echo "$(GREEN)✓ Load tests complete$(NC)"

test-coverage: ## Generate test coverage report
	@echo "$(BLUE)Generating coverage report...$(NC)"
	npm run test:coverage
	@echo "$(GREEN)✓ Coverage report generated$(NC)"

# ==========================================
# Code Quality
# ==========================================

lint: ## Lint code
	@echo "$(BLUE)Linting code...$(NC)"
	npm run lint
	@echo "$(GREEN)✓ Linting complete$(NC)"

lint-fix: ## Lint and fix code
	@echo "$(BLUE)Linting and fixing code...$(NC)"
	npm run lint:fix
	@echo "$(GREEN)✓ Code fixed$(NC)"

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	npm run format:check
	@echo "$(GREEN)✓ Format check complete$(NC)"

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	npm run type-check
	@echo "$(GREEN)✓ Type check complete$(NC)"

# ==========================================
# Docker
# ==========================================

docker-build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker build -f infrastructure/docker/server.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-server:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-server:latest .
	docker build -f infrastructure/docker/gateway.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-gateway:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-gateway:latest .
	docker build -f infrastructure/docker/ui.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-ui:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-ui:latest .
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-build-server: ## Build server Docker image
	@echo "$(BLUE)Building server image...$(NC)"
	docker build -f infrastructure/docker/server.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-server:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-server:latest .
	@echo "$(GREEN)✓ Server image built$(NC)"

docker-build-gateway: ## Build gateway Docker image
	@echo "$(BLUE)Building gateway image...$(NC)"
	docker build -f infrastructure/docker/gateway.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-gateway:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-gateway:latest .
	@echo "$(GREEN)✓ Gateway image built$(NC)"

docker-build-ui: ## Build UI Docker image
	@echo "$(BLUE)Building UI image...$(NC)"
	docker build -f infrastructure/docker/ui.Dockerfile -t $(REGISTRY)/$(IMAGE_PREFIX)-ui:$(VERSION) -t $(REGISTRY)/$(IMAGE_PREFIX)-ui:latest .
	@echo "$(GREEN)✓ UI image built$(NC)"

docker-push: ## Push all Docker images
	@echo "$(BLUE)Pushing Docker images...$(NC)"
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-server:$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-server:latest
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-gateway:$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-gateway:latest
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-ui:$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-ui:latest
	@echo "$(GREEN)✓ Images pushed$(NC)"

# ==========================================
# Local Deployment
# ==========================================

deploy-local: ## Deploy to local Docker Compose environment
	@echo "$(BLUE)Deploying to local environment...$(NC)"
	cd deployments/local && docker-compose up -d
	@echo "$(GREEN)✓ Local deployment complete$(NC)"
	@echo "$(YELLOW)Server: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Gateway: http://localhost:8080$(NC)"
	@echo "$(YELLOW)UI: http://localhost:5173$(NC)"

deploy-local-down: ## Stop local Docker Compose environment
	@echo "$(BLUE)Stopping local environment...$(NC)"
	cd deployments/local && docker-compose down
	@echo "$(GREEN)✓ Local environment stopped$(NC)"

deploy-local-logs: ## Show logs from local environment
	cd deployments/local && docker-compose logs -f

# ==========================================
# Kubernetes Deployment
# ==========================================

deploy-dev: ## Deploy to dev Kubernetes cluster
	@echo "$(BLUE)Deploying to dev environment...$(NC)"
	$(HELM) upgrade --install mcp-stack infrastructure/helm/mcp-stack \
		-n mcp-dev --create-namespace \
		-f deployments/dev/values.yaml \
		--set image.tag=$(VERSION)
	@echo "$(GREEN)✓ Dev deployment complete$(NC)"

deploy-staging: ## Deploy to staging Kubernetes cluster
	@echo "$(YELLOW)Deploying to STAGING environment...$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(HELM) upgrade --install mcp-stack infrastructure/helm/mcp-stack \
			-n mcp-staging --create-namespace \
			-f deployments/staging/values.yaml \
			--set image.tag=$(VERSION); \
		echo "$(GREEN)✓ Staging deployment complete$(NC)"; \
	fi

deploy-prod: ## Deploy to production Kubernetes cluster
	@echo "$(RED)⚠️  Deploying to PRODUCTION environment$(NC)"
	@read -p "Are you absolutely sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(HELM) upgrade --install mcp-stack infrastructure/helm/mcp-stack \
			-n mcp --create-namespace \
			-f deployments/production/values.yaml \
			--set image.tag=$(VERSION) \
			--wait --timeout 10m; \
		echo "$(GREEN)✓ Production deployment complete$(NC)"; \
	fi

# ==========================================
# Control Plane
# ==========================================

deploy-control-plane: ## Deploy control plane components
	@echo "$(BLUE)Deploying control plane...$(NC)"
	$(HELM) upgrade --install spire infrastructure/helm/control-plane/spire -n spire --create-namespace
	$(HELM) upgrade --install vault infrastructure/helm/control-plane/vault -n vault --create-namespace
	$(HELM) upgrade --install nexus infrastructure/helm/control-plane/nexus -n registry --create-namespace
	$(HELM) upgrade --install cas-vfs infrastructure/helm/control-plane/cas-vfs -n rtt --create-namespace
	$(HELM) upgrade --install argocd-apps infrastructure/helm/control-plane/argocd-apps -n argocd --create-namespace
	@echo "$(GREEN)✓ Control plane deployed$(NC)"

deploy-gatekeeper: ## Deploy Gatekeeper policies
	@echo "$(BLUE)Deploying Gatekeeper policies...$(NC)"
	$(HELM) upgrade --install gk-invariants infrastructure/helm/gatekeeper/invariants -n gatekeeper-system
	$(HELM) upgrade --install gk-planbins infrastructure/helm/gatekeeper/plan-bins -n gatekeeper-system
	@echo "$(GREEN)✓ Gatekeeper policies deployed$(NC)"

# ==========================================
# Utilities
# ==========================================

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning...$(NC)"
	npm run clean
	rm -rf coverage/
	rm -rf playwright-report/
	rm -rf test-results/
	find . -name "*.log" -delete
	@echo "$(GREEN)✓ Clean complete$(NC)"

logs: ## Show logs from Kubernetes deployment
	@echo "$(BLUE)Showing logs...$(NC)"
	$(KUBECTL) logs -f -l app=mcp-server -n mcp

status: ## Show deployment status
	@echo "$(BLUE)Deployment status:$(NC)"
	$(KUBECTL) get pods -n mcp
	$(KUBECTL) get services -n mcp
	$(KUBECTL) get ingress -n mcp

port-forward: ## Port forward to running services
	@echo "$(BLUE)Port forwarding...$(NC)"
	$(KUBECTL) port-forward -n mcp svc/mcp-server 3000:3000 &
	$(KUBECTL) port-forward -n mcp svc/gateway 8080:8080 &
	$(KUBECTL) port-forward -n mcp svc/ui 5173:80 &
	@echo "$(GREEN)✓ Port forwarding active$(NC)"

backup: ## Backup production data
	@echo "$(BLUE)Creating backup...$(NC)"
	./scripts/utils/backup.sh
	@echo "$(GREEN)✓ Backup complete$(NC)"

security-scan: ## Run security scans
	@echo "$(BLUE)Running security scans...$(NC)"
	trivy fs --security-checks vuln,config .
	@echo "$(GREEN)✓ Security scan complete$(NC)"

# ==========================================
# CI/CD
# ==========================================

ci: lint type-check test security-scan ## Run full CI pipeline locally
	@echo "$(GREEN)✓ CI pipeline complete$(NC)"

ci-build: ci build docker-build ## Run CI pipeline and build
	@echo "$(GREEN)✓ CI build complete$(NC)"

# ==========================================
# Documentation
# ==========================================

docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	@echo "$(YELLOW)Documentation generation not yet implemented$(NC)"

docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(NC)"
	@cd docs && python3 -m http.server 8000

# ==========================================
# Version Management
# ==========================================

version: ## Show current version
	@echo "$(BLUE)Current version:$(NC) $(VERSION)"

bump-patch: ## Bump patch version
	npm version patch
	@echo "$(GREEN)✓ Version bumped$(NC)"

bump-minor: ## Bump minor version
	npm version minor
	@echo "$(GREEN)✓ Version bumped$(NC)"

bump-major: ## Bump major version
	npm version major
	@echo "$(GREEN)✓ Version bumped$(NC)"
