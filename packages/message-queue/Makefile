# ================================
# Message Queue API - Makefile
# Simplified commands for Docker and Kubernetes operations
# ================================

.PHONY: help build push deploy test clean

# Default target
.DEFAULT_GOAL := help

# Configuration
IMAGE_NAME ?= noa/message-queue-api
REGISTRY ?= docker.io
NAMESPACE ?= noa-server
VERSION := $(shell node -p "require('./package.json').version")

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: Display this help message
help:
	@echo "$(BLUE)Message Queue API - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start development environment"
	@echo "  make dev-logs         View development logs"
	@echo "  make dev-stop         Stop development environment"
	@echo ""
	@echo "$(GREEN)Building:$(NC)"
	@echo "  make build            Build production Docker image"
	@echo "  make build-dev        Build development Docker image"
	@echo "  make build-all        Build all Docker images"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run tests locally"
	@echo "  make test-docker      Run tests in Docker"
	@echo "  make test-deploy      Test deployment health"
	@echo ""
	@echo "$(GREEN)Registry:$(NC)"
	@echo "  make push             Push production image to registry"
	@echo "  make push-all         Push all images to registry"
	@echo ""
	@echo "$(GREEN)Kubernetes:$(NC)"
	@echo "  make deploy           Deploy to Kubernetes"
	@echo "  make deploy-staging   Deploy to staging environment"
	@echo "  make rollback         Rollback to previous version"
	@echo "  make scale-up         Scale deployment to 5 replicas"
	@echo "  make scale-down       Scale deployment to 1 replica"
	@echo "  make status           Show deployment status"
	@echo "  make logs             View application logs"
	@echo "  make shell            Open shell in running pod"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make clean            Clean up Docker resources"
	@echo "  make clean-k8s        Clean up Kubernetes resources"
	@echo "  make port-forward     Port forward to local machine"
	@echo "  make describe         Describe Kubernetes resources"
	@echo ""
	@echo "$(GREEN)Variables:$(NC)"
	@echo "  IMAGE_NAME=$(IMAGE_NAME)"
	@echo "  REGISTRY=$(REGISTRY)"
	@echo "  NAMESPACE=$(NAMESPACE)"
	@echo "  VERSION=$(VERSION)"

# ================================
# Development
# ================================

## dev: Start development environment with Docker Compose
dev:
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up

## dev-logs: View development logs
dev-logs:
	@echo "$(BLUE)Viewing development logs...$(NC)"
	docker-compose -f docker-compose.dev.yml logs -f

## dev-stop: Stop development environment
dev-stop:
	@echo "$(BLUE)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml down

## dev-rebuild: Rebuild and restart development environment
dev-rebuild:
	@echo "$(BLUE)Rebuilding development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up --build

# ================================
# Building
# ================================

## build: Build production Docker image
build:
	@echo "$(BLUE)Building production image...$(NC)"
	./scripts/build.sh --production

## build-dev: Build development Docker image
build-dev:
	@echo "$(BLUE)Building development image...$(NC)"
	./scripts/build.sh --development

## build-all: Build all Docker images
build-all:
	@echo "$(BLUE)Building all images...$(NC)"
	./scripts/build.sh --all

## build-no-cache: Build production image without cache
build-no-cache:
	@echo "$(BLUE)Building production image (no cache)...$(NC)"
	./scripts/build.sh --production --no-cache

# ================================
# Testing
# ================================

## test: Run tests locally
test:
	@echo "$(BLUE)Running tests...$(NC)"
	pnpm test

## test-docker: Run tests in Docker
test-docker:
	@echo "$(BLUE)Running tests in Docker...$(NC)"
	docker build --target test -t $(IMAGE_NAME):test .
	docker run --rm $(IMAGE_NAME):test

## test-deploy: Test deployment health
test-deploy:
	@echo "$(BLUE)Testing deployment...$(NC)"
	./scripts/test-deployment.sh kubernetes

## lint: Run linter
lint:
	@echo "$(BLUE)Running linter...$(NC)"
	pnpm run lint

## lint-fix: Fix linting issues
lint-fix:
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	pnpm run lint:fix

# ================================
# Registry Operations
# ================================

## push: Push production image to registry
push: build
	@echo "$(BLUE)Pushing production image...$(NC)"
	./scripts/push.sh

## push-all: Push all images to registry
push-all: build-all
	@echo "$(BLUE)Pushing all images...$(NC)"
	./scripts/push.sh --all

## tag: Tag image with custom version
tag:
	@echo "$(BLUE)Tagging image as $(VERSION)...$(NC)"
	docker tag $(IMAGE_NAME):latest $(IMAGE_NAME):$(VERSION)

# ================================
# Kubernetes Operations
# ================================

## deploy: Deploy to Kubernetes
deploy:
	@echo "$(BLUE)Deploying to Kubernetes...$(NC)"
	./scripts/deploy.sh --namespace $(NAMESPACE)

## deploy-staging: Deploy to staging environment
deploy-staging:
	@echo "$(BLUE)Deploying to staging...$(NC)"
	./scripts/deploy.sh --namespace noa-server-staging --environment staging

## rollback: Rollback to previous version
rollback:
	@echo "$(BLUE)Rolling back deployment...$(NC)"
	./scripts/rollback.sh --namespace $(NAMESPACE)

## scale-up: Scale deployment to 5 replicas
scale-up:
	@echo "$(BLUE)Scaling up to 5 replicas...$(NC)"
	kubectl scale deployment/message-queue-api -n $(NAMESPACE) --replicas=5

## scale-down: Scale deployment to 1 replica
scale-down:
	@echo "$(BLUE)Scaling down to 1 replica...$(NC)"
	kubectl scale deployment/message-queue-api -n $(NAMESPACE) --replicas=1

## status: Show deployment status
status:
	@echo "$(BLUE)Deployment Status:$(NC)"
	@kubectl get deployment/message-queue-api -n $(NAMESPACE)
	@echo ""
	@echo "$(BLUE)Pods:$(NC)"
	@kubectl get pods -n $(NAMESPACE) -l app=message-queue-api
	@echo ""
	@echo "$(BLUE)HPA Status:$(NC)"
	@kubectl get hpa -n $(NAMESPACE)

## logs: View application logs
logs:
	@echo "$(BLUE)Viewing logs...$(NC)"
	kubectl logs -n $(NAMESPACE) -l app=message-queue-api -f --tail=100

## shell: Open shell in running pod
shell:
	@echo "$(BLUE)Opening shell in pod...$(NC)"
	kubectl exec -it -n $(NAMESPACE) $$(kubectl get pods -n $(NAMESPACE) -l app=message-queue-api -o jsonpath='{.items[0].metadata.name}') -- sh

## port-forward: Port forward to local machine
port-forward:
	@echo "$(BLUE)Port forwarding to localhost:8081...$(NC)"
	kubectl port-forward -n $(NAMESPACE) svc/message-queue-api 8081:8081

## describe: Describe Kubernetes resources
describe:
	@echo "$(BLUE)Deployment:$(NC)"
	@kubectl describe deployment/message-queue-api -n $(NAMESPACE)
	@echo ""
	@echo "$(BLUE)HPA:$(NC)"
	@kubectl describe hpa/message-queue-api-hpa -n $(NAMESPACE)
	@echo ""
	@echo "$(BLUE)Service:$(NC)"
	@kubectl describe service/message-queue-api -n $(NAMESPACE)

## events: Show recent Kubernetes events
events:
	@echo "$(BLUE)Recent events:$(NC)"
	kubectl get events -n $(NAMESPACE) --sort-by='.lastTimestamp' | grep message-queue-api

## top: Show resource usage
top:
	@echo "$(BLUE)Pod resource usage:$(NC)"
	kubectl top pods -n $(NAMESPACE) -l app=message-queue-api

# ================================
# Utilities
# ================================

## clean: Clean up Docker resources
clean:
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

## clean-images: Remove built images
clean-images:
	@echo "$(BLUE)Removing built images...$(NC)"
	docker rmi $(IMAGE_NAME):latest $(IMAGE_NAME):dev $(IMAGE_NAME):test 2>/dev/null || true

## clean-k8s: Clean up Kubernetes resources
clean-k8s:
	@echo "$(YELLOW)Warning: This will delete all resources in namespace $(NAMESPACE)$(NC)"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		kubectl delete deployment/message-queue-api -n $(NAMESPACE) --ignore-not-found=true; \
		kubectl delete service/message-queue-api -n $(NAMESPACE) --ignore-not-found=true; \
		kubectl delete hpa/message-queue-api-hpa -n $(NAMESPACE) --ignore-not-found=true; \
		kubectl delete ingress/message-queue-api-ingress -n $(NAMESPACE) --ignore-not-found=true; \
		echo "$(GREEN)Cleanup complete$(NC)"; \
	fi

## health: Check application health
health:
	@echo "$(BLUE)Checking health...$(NC)"
	@curl -f http://localhost:8081/health || echo "$(YELLOW)Service not available locally$(NC)"

## size: Show Docker image size
size:
	@echo "$(BLUE)Image sizes:$(NC)"
	@docker images | grep $(IMAGE_NAME) || echo "No images found"

## ci: Run full CI pipeline locally
ci: lint test build test-docker
	@echo "$(GREEN)CI pipeline completed successfully$(NC)"

# ================================
# Quick Commands
# ================================

## install: Install dependencies
install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pnpm install

## up: Quick start production environment
up:
	@echo "$(BLUE)Starting production environment...$(NC)"
	docker-compose up -d

## down: Stop production environment
down:
	@echo "$(BLUE)Stopping production environment...$(NC)"
	docker-compose down

## restart: Restart production environment
restart: down up

## rebuild: Rebuild and restart production environment
rebuild:
	@echo "$(BLUE)Rebuilding and restarting...$(NC)"
	docker-compose up -d --build

# ================================
# Documentation
# ================================

## docs: Open documentation
docs:
	@echo "$(BLUE)Opening documentation...$(NC)"
	@cat docs/docker-deployment.md | less

## version: Show version information
version:
	@echo "Version: $(VERSION)"
	@echo "Image: $(IMAGE_NAME)"
	@echo "Registry: $(REGISTRY)"
