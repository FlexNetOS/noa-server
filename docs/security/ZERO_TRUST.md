# Zero-Trust Network Security

Comprehensive guide to Noa Server's zero-trust network architecture.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Network Policies](#network-policies)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Overview

### Zero-Trust Principles

1. **Never Trust, Always Verify**: Every request is authenticated and authorized
2. **Least Privilege Access**: Minimum required permissions
3. **Assume Breach**: Design for compromise scenarios
4. **Verify Explicitly**: Use all available data points
5. **Microsegmentation**: Isolate workloads

### Implementation

- **Default Deny**: All traffic denied unless explicitly allowed
- **Network Policies**: Kubernetes NetworkPolicy for pod-to-pod communication
- **Service Mesh**: Optional mTLS with Istio/Linkerd
- **Security Groups**: AWS/GCP/Azure firewall rules
- **Container Isolation**: Docker network segmentation

## Architecture

### Network Layers

```
┌─────────────────────────────────────────────┐
│           Internet / Load Balancer           │
└──────────────────┬──────────────────────────┘
                   │ HTTPS only
         ┌─────────▼─────────┐
         │   Frontend Layer   │
         │   (Public Subnet)  │
         └─────────┬──────────┘
                   │
         ┌─────────▼─────────┐
         │  Application Layer │
         │  (Private Subnet)  │
         │   - Noa Server     │
         │   - MCP Servers    │
         └─────────┬──────────┘
                   │
         ┌─────────▼─────────┐
         │    Data Layer      │
         │  (Private Subnet)  │
         │   - PostgreSQL     │
         │   - Redis          │
         │   - MongoDB        │
         └────────────────────┘
```

### Traffic Flow

1. **External → Noa Server**: HTTPS through load balancer
2. **Noa Server → Databases**: Direct connection (isolated network)
3. **Noa Server → MCP Servers**: HTTP (internal only)
4. **MCP Servers → Databases**: Limited access (only if needed)
5. **MCP Server → MCP Server**: Denied (isolation)

## Network Policies

### Kubernetes Network Policies

#### 1. Default Deny All

```yaml
# Applied to all namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

This policy denies all traffic by default. All communication must be explicitly
allowed.

#### 2. Allow DNS

```yaml
# Required for service discovery
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

#### 3. Noa Server Ingress

```yaml
# Allow traffic from load balancer and monitoring
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: noa-server-ingress
  namespace: noa-server
spec:
  podSelector:
    matchLabels:
      app: noa-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
```

#### 4. Database Isolation

```yaml
# PostgreSQL only accessible from authorized pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgresql-policy
  namespace: databases
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: noa-server
        - podSelector:
            matchLabels:
              app: noa-server
      ports:
        - protocol: TCP
          port: 5432
```

### Docker Network Segmentation

```yaml
# docker-compose.security.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # No external access
  database:
    driver: bridge
    internal: true # No external access
```

## Deployment

### Kubernetes Deployment

```bash
# Deploy network policies
kubectl apply -f k8s/network-policies/base/
kubectl apply -f k8s/network-policies/noa-server/
kubectl apply -f k8s/network-policies/databases/
kubectl apply -f k8s/network-policies/mcp-servers/
kubectl apply -f k8s/network-policies/monitoring/

# Verify policies
kubectl get networkpolicies --all-namespaces

# Test connectivity
kubectl run test-pod --image=nicolaka/netshoot --rm -it -- bash
```

### Docker Compose

```bash
# Start with security configuration
docker-compose -f docker-compose.security.yml up -d

# Verify network isolation
docker network inspect noa-server_database | grep internal
# Should show "Internal": true
```

### Cloud Deployment (Terraform)

```bash
# AWS VPC with security groups
cd terraform/network
terraform init
terraform plan -var="environment=production"
terraform apply

# Verify security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=noa-*"
```

## Service Mesh (Optional)

### Istio Configuration

```yaml
# Enable mTLS between services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: noa-server
spec:
  mtls:
    mode: STRICT
```

### Authorization Policies

```yaml
# Only allow noa-server to access databases
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: postgres-policy
  namespace: databases
spec:
  selector:
    matchLabels:
      app: postgresql
  rules:
    - from:
        - source:
            namespaces: ['noa-server']
            principals: ['cluster.local/ns/noa-server/sa/noa-server']
      to:
        - operation:
            ports: ['5432']
```

## Monitoring

### Network Audit

```bash
# Run network security audit
./scripts/security/network-audit.sh
```

The audit checks:

- Kubernetes network policies
- Docker network configuration
- Firewall rules
- Open ports
- TLS/SSL configuration
- Security headers

### Prometheus Metrics

```yaml
# Monitor network policy violations
sum(rate(kube_networkpolicy_status_observed_generation[5m]))

# Track connection attempts
rate(netfilter_dropped_packets_total[5m])
```

### Alerts

```yaml
# Alert on network policy violations
alert: NetworkPolicyViolation
expr: rate(kube_networkpolicy_status_observed_generation[5m]) > 0
annotations:
  summary: Network policy violation detected
```

## Security Controls

### 1. Network Segmentation

- **Public Subnet**: Load balancers only
- **Private App Subnet**: Application servers
- **Private DB Subnet**: Databases (no internet access)

### 2. Firewall Rules

- **Ingress**: Only HTTPS (443) from internet
- **Egress**: Only to specific services
- **Inter-service**: Explicitly whitelisted

### 3. TLS/SSL

- **External**: TLS 1.3 only
- **Internal**: Optional mTLS with Istio
- **Certificates**: Auto-renewal with cert-manager

### 4. DDoS Protection

- Rate limiting at multiple layers
- CloudFlare / AWS Shield
- Connection limits

### 5. Intrusion Detection

- VPC Flow Logs
- Network traffic analysis
- Anomaly detection

## Best Practices

### Network Policy Design

1. **Start with Deny**: Apply default deny to all namespaces
2. **Explicit Allow**: Only allow required communication
3. **Namespace Labels**: Use labels for policy selection
4. **Document Policies**: Comment all policy decisions
5. **Test Thoroughly**: Verify policies before production

### Security Groups

1. **Minimal Ingress**: Only required ports
2. **Egress Control**: Restrict outbound traffic
3. **CIDR Blocks**: Use specific IP ranges
4. **Regular Audits**: Review and update quarterly
5. **Tagging**: Tag all security groups

### Container Security

1. **Network Isolation**: Use internal networks
2. **No Root**: Run as non-root user
3. **Read-Only**: Use read-only file systems
4. **Drop Capabilities**: Remove unnecessary capabilities
5. **Resource Limits**: Set CPU/memory limits

### Monitoring

1. **Flow Logs**: Enable VPC/subnet flow logs
2. **Metrics**: Track connection counts and errors
3. **Alerts**: Set up alerts for anomalies
4. **Regular Audits**: Run security audits weekly
5. **Incident Response**: Have runbooks ready

## Troubleshooting

### Connection Issues

```bash
# Check network policies
kubectl get networkpolicies -A

# Test connectivity
kubectl run test --image=nicolaka/netshoot --rm -it -- bash
# Inside pod:
nc -zv postgresql.databases.svc.cluster.local 5432
```

### Policy Not Working

```bash
# Verify CNI plugin supports NetworkPolicy
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.containerRuntimeVersion}'

# Check policy syntax
kubectl describe networkpolicy <policy-name>

# View policy logs (Calico)
kubectl logs -n kube-system -l k8s-app=calico-node
```

### Docker Network Issues

```bash
# Inspect network
docker network inspect <network-name>

# Check container connectivity
docker exec <container> ping <target>

# View network rules
sudo iptables -L -n -v
```

## Compliance

### SOC 2

- Network segmentation
- Access controls
- Traffic monitoring
- Audit logging
- Incident response

### PCI DSS

- Firewall configuration
- Network isolation
- Encrypted communication
- Access logging
- Penetration testing

### HIPAA

- Network encryption
- Access controls
- Audit trails
- Risk assessments
- Disaster recovery

## Disaster Recovery

### Network Failure

1. Automatic failover to backup
2. Traffic routing to healthy zones
3. Database replication
4. Session persistence

### Security Breach

1. Isolate affected segment
2. Block malicious traffic
3. Audit all access
4. Rotate credentials
5. Incident report

## Additional Resources

- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [AWS VPC Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)
- [Zero Trust Architecture (NIST)](https://www.nist.gov/publications/zero-trust-architecture)
- [Service Mesh Patterns](https://servicemesh.io/)

## Support

For security issues:

- Email: security@noa-server.com
- GitHub: https://github.com/noa-server/security/issues
- Docs: https://docs.noa-server.com/security
