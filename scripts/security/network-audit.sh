#!/bin/bash
# Network Security Audit Script
# Audits network policies, firewall rules, and security posture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./docs/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/network-audit-${TIMESTAMP}.md"

# Create report directory
mkdir -p "${REPORT_DIR}"

echo "Starting Network Security Audit..."
echo "# Network Security Audit Report" > "${REPORT_FILE}"
echo "Generated: $(date)" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

# Function to print colored output
print_status() {
  local status=$1
  local message=$2

  case ${status} in
    "PASS")
      echo -e "${GREEN}[✓]${NC} ${message}"
      echo "- [✓] ${message}" >> "${REPORT_FILE}"
      ;;
    "FAIL")
      echo -e "${RED}[✗]${NC} ${message}"
      echo "- [✗] ${message}" >> "${REPORT_FILE}"
      ;;
    "WARN")
      echo -e "${YELLOW}[!]${NC} ${message}"
      echo "- [!] ${message}" >> "${REPORT_FILE}"
      ;;
    "INFO")
      echo -e "${NC}[ℹ]${NC} ${message}"
      echo "- [ℹ] ${message}" >> "${REPORT_FILE}"
      ;;
  esac
}

# Check Kubernetes network policies
check_k8s_network_policies() {
  echo "" >> "${REPORT_FILE}"
  echo "## Kubernetes Network Policies" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  if ! command -v kubectl &> /dev/null; then
    print_status "WARN" "kubectl not found, skipping Kubernetes checks"
    return
  fi

  # Check if cluster is accessible
  if ! kubectl cluster-info &> /dev/null; then
    print_status "WARN" "Cannot connect to Kubernetes cluster"
    return
  fi

  # Check default deny policies
  for ns in default noa-server mcp-servers databases monitoring; do
    if kubectl get networkpolicy default-deny-all -n ${ns} &> /dev/null; then
      print_status "PASS" "Default deny policy exists in ${ns} namespace"
    else
      print_status "FAIL" "Default deny policy missing in ${ns} namespace"
    fi
  done

  # Check DNS policies
  if kubectl get networkpolicy allow-dns -n noa-server &> /dev/null; then
    print_status "PASS" "DNS policy configured"
  else
    print_status "FAIL" "DNS policy missing"
  fi

  # List all network policies
  echo "" >> "${REPORT_FILE}"
  echo "### All Network Policies" >> "${REPORT_FILE}"
  echo '```' >> "${REPORT_FILE}"
  kubectl get networkpolicies --all-namespaces >> "${REPORT_FILE}" 2>&1 || echo "Error listing policies" >> "${REPORT_FILE}"
  echo '```' >> "${REPORT_FILE}"
}

# Check Docker network security
check_docker_networks() {
  echo "" >> "${REPORT_FILE}"
  echo "## Docker Network Configuration" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  if ! command -v docker &> /dev/null; then
    print_status "WARN" "Docker not found, skipping Docker checks"
    return
  fi

  # Check for isolated networks
  if docker network ls | grep -q "internal"; then
    print_status "PASS" "Internal Docker networks configured"
  else
    print_status "WARN" "No internal Docker networks found"
  fi

  # List all networks
  echo "" >> "${REPORT_FILE}"
  echo "### Docker Networks" >> "${REPORT_FILE}"
  echo '```' >> "${REPORT_FILE}"
  docker network ls >> "${REPORT_FILE}" 2>&1 || echo "Error listing networks" >> "${REPORT_FILE}"
  echo '```' >> "${REPORT_FILE}"
}

# Check firewall rules
check_firewall_rules() {
  echo "" >> "${REPORT_FILE}"
  echo "## Firewall Rules" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  # Check iptables
  if command -v iptables &> /dev/null; then
    if sudo -n iptables -L &> /dev/null; then
      print_status "INFO" "iptables rules configured"
      echo "" >> "${REPORT_FILE}"
      echo "### iptables Rules" >> "${REPORT_FILE}"
      echo '```' >> "${REPORT_FILE}"
      sudo iptables -L -n -v >> "${REPORT_FILE}" 2>&1
      echo '```' >> "${REPORT_FILE}"
    else
      print_status "WARN" "Cannot access iptables (requires sudo)"
    fi
  fi

  # Check ufw
  if command -v ufw &> /dev/null; then
    if sudo -n ufw status &> /dev/null; then
      if sudo ufw status | grep -q "Status: active"; then
        print_status "PASS" "UFW firewall is active"
      else
        print_status "WARN" "UFW firewall is not active"
      fi
    fi
  fi
}

# Check open ports
check_open_ports() {
  echo "" >> "${REPORT_FILE}"
  echo "## Open Ports" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  if command -v netstat &> /dev/null; then
    print_status "INFO" "Scanning open ports..."
    echo "" >> "${REPORT_FILE}"
    echo "### Listening Ports" >> "${REPORT_FILE}"
    echo '```' >> "${REPORT_FILE}"
    sudo netstat -tuln | grep LISTEN >> "${REPORT_FILE}" 2>&1 || netstat -tuln | grep LISTEN >> "${REPORT_FILE}" 2>&1
    echo '```' >> "${REPORT_FILE}"
  elif command -v ss &> /dev/null; then
    print_status "INFO" "Scanning open ports..."
    echo "" >> "${REPORT_FILE}"
    echo "### Listening Ports" >> "${REPORT_FILE}"
    echo '```' >> "${REPORT_FILE}"
    sudo ss -tuln | grep LISTEN >> "${REPORT_FILE}" 2>&1 || ss -tuln | grep LISTEN >> "${REPORT_FILE}" 2>&1
    echo '```' >> "${REPORT_FILE}"
  fi
}

# Check TLS/SSL configuration
check_tls_config() {
  echo "" >> "${REPORT_FILE}"
  echo "## TLS/SSL Configuration" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  # Check for certificate files
  if [ -f "./config/nginx/ssl/server.crt" ]; then
    print_status "PASS" "TLS certificate found"

    # Check certificate expiration
    if command -v openssl &> /dev/null; then
      expiry=$(openssl x509 -in ./config/nginx/ssl/server.crt -noout -enddate 2>/dev/null | cut -d= -f2)
      print_status "INFO" "Certificate expires: ${expiry}"
    fi
  else
    print_status "WARN" "TLS certificate not found"
  fi
}

# Check security headers
check_security_headers() {
  echo "" >> "${REPORT_FILE}"
  echo "## Security Headers" >> "${REPORT_FILE}"
  echo "" >> "${REPORT_FILE}"

  # Check nginx config for security headers
  if [ -f "./config/nginx/nginx.conf" ]; then
    if grep -q "X-Frame-Options" ./config/nginx/nginx.conf; then
      print_status "PASS" "X-Frame-Options header configured"
    else
      print_status "WARN" "X-Frame-Options header missing"
    fi

    if grep -q "X-Content-Type-Options" ./config/nginx/nginx.conf; then
      print_status "PASS" "X-Content-Type-Options header configured"
    else
      print_status "WARN" "X-Content-Type-Options header missing"
    fi

    if grep -q "Content-Security-Policy" ./config/nginx/nginx.conf; then
      print_status "PASS" "Content-Security-Policy header configured"
    else
      print_status "WARN" "Content-Security-Policy header missing"
    fi
  fi
}

# Run all checks
echo "Running network security audit..."
check_k8s_network_policies
check_docker_networks
check_firewall_rules
check_open_ports
check_tls_config
check_security_headers

# Summary
echo "" >> "${REPORT_FILE}"
echo "## Summary" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"
echo "Audit completed at: $(date)" >> "${REPORT_FILE}"
echo "" >> "${REPORT_FILE}"

echo ""
echo "Audit complete! Report saved to: ${REPORT_FILE}"
echo ""

# Display report
if command -v bat &> /dev/null; then
  bat "${REPORT_FILE}"
elif command -v cat &> /dev/null; then
  cat "${REPORT_FILE}"
fi
