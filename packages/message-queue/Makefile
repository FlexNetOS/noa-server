.PHONY: help build deploy test
.DEFAULT_GOAL := help

help:
	@echo "Message Queue API - Docker Commands"
	@echo "  make build        Build production image"
	@echo "  make deploy       Deploy to Kubernetes"
	@echo "  make test         Run tests"
	@echo "  make dev          Start development environment"

build:
	docker build -t noa/message-queue-api:latest .

deploy:
	./scripts/deploy.sh

test:
	pnpm test

dev:
	docker-compose up
