#!/bin/bash
# ================================
# Kubernetes Rollback Script
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-noa-server}"
DEPLOYMENT="message-queue-api"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Kubernetes Rollback Script${NC}"
echo -e "${GREEN}================================${NC}"

# Function to show rollout history
show_history() {
    echo -e "\n${BLUE}Deployment History:${NC}"
    kubectl rollout history deployment/${DEPLOYMENT} -n "${NAMESPACE}"
}

# Function to show current status
show_status() {
    echo -e "\n${BLUE}Current Status:${NC}"
    kubectl rollout status deployment/${DEPLOYMENT} -n "${NAMESPACE}" --timeout=10s || true
}

# Function to rollback to previous version
rollback_previous() {
    echo -e "\n${YELLOW}Rolling back to previous version...${NC}"
    kubectl rollout undo deployment/${DEPLOYMENT} -n "${NAMESPACE}"

    # Wait for rollback to complete
    echo "Waiting for rollback to complete..."
    kubectl rollout status deployment/${DEPLOYMENT} -n "${NAMESPACE}" --timeout=300s

    echo -e "${GREEN}✓ Rollback complete${NC}"
}

# Function to rollback to specific revision
rollback_revision() {
    local revision=$1
    echo -e "\n${YELLOW}Rolling back to revision ${revision}...${NC}"
    kubectl rollout undo deployment/${DEPLOYMENT} -n "${NAMESPACE}" --to-revision="${revision}"

    # Wait for rollback to complete
    echo "Waiting for rollback to complete..."
    kubectl rollout status deployment/${DEPLOYMENT} -n "${NAMESPACE}" --timeout=300s

    echo -e "${GREEN}✓ Rollback to revision ${revision} complete${NC}"
}

# Function to verify rollback
verify_rollback() {
    echo -e "\n${BLUE}Verifying rollback...${NC}"

    # Get pod status
    kubectl get pods -n "${NAMESPACE}" -l app=message-queue-api

    # Check deployment
    kubectl get deployment/${DEPLOYMENT} -n "${NAMESPACE}"

    # Show recent events
    echo -e "\n${BLUE}Recent Events:${NC}"
    kubectl get events -n "${NAMESPACE}" --sort-by='.lastTimestamp' | grep message-queue-api | tail -10

    echo -e "\n${GREEN}✓ Verification complete${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --revision)
            REVISION="$2"
            shift 2
            ;;
        --history)
            show_history
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --namespace NAME    Kubernetes namespace (default: noa-server)"
            echo "  --revision NUM      Rollback to specific revision"
            echo "  --history           Show deployment history"
            echo "  --status            Show current deployment status"
            echo "  --dry-run           Show what would be done"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                        # Rollback to previous version"
            echo "  $0 --revision 3           # Rollback to revision 3"
            echo "  $0 --history              # Show deployment history"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Main rollback flow
main() {
    # Show current status
    show_status

    # Show history
    show_history

    # Perform rollback
    if [ -n "${REVISION}" ]; then
        if [ "${DRY_RUN}" = true ]; then
            echo -e "\n${YELLOW}DRY RUN: Would rollback to revision ${REVISION}${NC}"
        else
            # Confirmation prompt
            echo -e "\n${YELLOW}About to rollback to revision ${REVISION}${NC}"
            read -p "Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback_revision "${REVISION}"
            else
                echo "Rollback cancelled"
                exit 0
            fi
        fi
    else
        if [ "${DRY_RUN}" = true ]; then
            echo -e "\n${YELLOW}DRY RUN: Would rollback to previous version${NC}"
        else
            # Confirmation prompt
            echo -e "\n${YELLOW}About to rollback to previous version${NC}"
            read -p "Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback_previous
            else
                echo "Rollback cancelled"
                exit 0
            fi
        fi
    fi

    # Verify rollback
    if [ "${DRY_RUN}" != true ]; then
        verify_rollback

        echo -e "\n${GREEN}================================${NC}"
        echo -e "${GREEN}✓ Rollback Complete!${NC}"
        echo -e "${GREEN}================================${NC}"
    fi
}

main
