# Security Incident Playbook

## Overview

**Severity**: SEV1-SEV2 (Critical to High)
**Estimated Duration**: Variable (1-8 hours)
**Prerequisites**: Security team access, audit logs access

**IMPORTANT**: Do NOT take actions that might destroy evidence. Document everything.

## Incident Types

1. **Unauthorized Access**: Suspected breach or unauthorized data access
2. **Data Leak**: Sensitive data exposed or exfiltrated
3. **DDoS Attack**: Denial of service attack in progress
4. **Malware/Ransomware**: Malicious code detected
5. **Credential Compromise**: API keys, passwords, or tokens leaked

## Response Steps

### Step 1: Contain the Threat (IMMEDIATE)

**Priority**: Prevent further damage while preserving evidence

**For Unauthorized Access**:
```bash
# Revoke suspicious API keys
kubectl exec -n production api-0 -- curl -X DELETE \
  http://localhost:8080/admin/api-keys/<suspicious-key-id>

# Disable compromised user accounts
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/users/<user-id>/disable

# Enable additional authentication
kubectl set env deployment/api -n production \
  REQUIRE_MFA=true REQUIRE_IP_WHITELIST=true

# Block suspicious IPs at firewall
kubectl exec -n networking nginx-0 -- \
  echo "deny <suspicious-ip>;" >> /etc/nginx/conf.d/blocklist.conf
```

**For Data Leak**:
```bash
# Rotate all API keys immediately
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/api-keys/rotate-all

# Revoke all active sessions
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/sessions/revoke-all

# Enable audit logging
kubectl set env deployment/api -n production \
  AUDIT_LOG_LEVEL=debug AUDIT_LOG_ALL_REQUESTS=true
```

**For DDoS Attack**:
```bash
# Enable rate limiting
kubectl set env deployment/api -n production \
  RATE_LIMIT_ENABLED=true RATE_LIMIT_REQUESTS=100

# Enable CDN DDoS protection
# (Configure via cloud provider dashboard)

# Scale up to absorb traffic
kubectl scale deployment api -n production --replicas=50

# Block attacking IPs
# (Use cloud provider DDoS protection tools)
```

### Step 2: Collect Evidence (10-30 minutes)

**DO NOT MODIFY SYSTEMS BEFORE COLLECTING EVIDENCE**

**Collect Logs**:
```bash
# Export all recent logs
kubectl logs -n production --all-containers --since=24h > /secure/incident-logs-$(date +%Y%m%d-%H%M%S).log

# Export audit logs
kubectl exec -n production api-0 -- cat /var/log/audit.log > /secure/audit-$(date +%Y%m%d-%H%M%S).log

# Export database query logs
kubectl exec -n database postgres-0 -- \
  psql -U admin -d noa_db -c "COPY (SELECT * FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours') TO STDOUT;" \
  > /secure/db-audit-$(date +%Y%m%d-%H%M%S).csv

# Export access logs
kubectl exec -n production nginx-0 -- cat /var/log/nginx/access.log > /secure/access-$(date +%Y%m%d-%H%M%S).log
```

**Network Traffic Capture**:
```bash
# Capture network traffic from suspicious pod
kubectl exec -n production api-0 -- tcpdump -w /tmp/capture.pcap -i eth0 &
TCPDUMP_PID=$!
sleep 300  # Capture for 5 minutes
kubectl exec -n production api-0 -- kill $TCPDUMP_PID
kubectl cp production/api-0:/tmp/capture.pcap /secure/network-capture-$(date +%Y%m%d-%H%M%S).pcap
```

**System State**:
```bash
# Snapshot all pod configurations
kubectl get all -n production -o yaml > /secure/pod-state-$(date +%Y%m%d-%H%M%S).yaml

# Export environment variables
kubectl exec -n production api-0 -- env > /secure/environment-$(date +%Y%m%d-%H%M%S).txt

# Check running processes
kubectl exec -n production api-0 -- ps aux > /secure/processes-$(date +%Y%m%d-%H%M%S).txt
```

### Step 3: Assess Impact (15-30 minutes)

**Determine Scope**:
```bash
# Check access patterns
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT user_id, ip_address, COUNT(*) as access_count
   FROM access_log
   WHERE timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY user_id, ip_address
   ORDER BY access_count DESC
   LIMIT 100;"

# Check data accessed
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT table_name, operation, COUNT(*) as operations
   FROM audit_log
   WHERE timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY table_name, operation
   ORDER BY operations DESC;"

# Check for data exfiltration
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT user_id, COUNT(*) as export_count, SUM(row_count) as total_rows
   FROM data_export_log
   WHERE timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY user_id
   ORDER BY total_rows DESC;"
```

**Identify Affected Users**:
```bash
# Query affected user accounts
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT DISTINCT user_id, email
   FROM users
   WHERE user_id IN (
     SELECT DISTINCT user_id FROM access_log WHERE suspicious = true
   );"

# Check for privilege escalation
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT user_id, old_role, new_role, changed_at
   FROM role_change_log
   WHERE changed_at > NOW() - INTERVAL '24 hours';"
```

### Step 4: Notify Stakeholders (IMMEDIATE)

**Internal Notification**:
```
TO: security@noaserver.com, legal@noaserver.com, cto@noaserver.com
SUBJECT: [SECURITY INCIDENT] [SEV1] Security Breach Detected

INCIDENT ID: SEC-[timestamp]
DETECTED AT: [time]
TYPE: [incident type]
STATUS: Contained

SUMMARY:
[Brief description of incident]

IMMEDIATE ACTIONS TAKEN:
- [List containment actions]

IMPACT ASSESSMENT:
- Affected Users: [number/percentage]
- Data Accessed: [description]
- Systems Affected: [list]

NEXT STEPS:
- Continuing investigation
- Evidence collection in progress
- Detailed report to follow in [timeframe]

INCIDENT COMMANDER: [name]
```

**Customer Notification** (if data breach):
```
SUBJECT: Important Security Notice

Dear [Customer],

We are writing to inform you of a security incident that may have
affected your account.

WHAT HAPPENED:
[Clear explanation without technical jargon]

WHAT WE'RE DOING:
- Immediately secured all systems
- Conducting thorough investigation
- Working with security experts
- Implementing additional protections

WHAT YOU SHOULD DO:
- Change your password immediately
- Enable two-factor authentication
- Monitor your account for suspicious activity
- Review our security best practices

We take the security of your data extremely seriously and apologize
for any concern this may cause.

For questions, contact: security@noaserver.com
```

### Step 5: Remediate and Recover (1-4 hours)

**Patch Vulnerabilities**:
```bash
# Update all containers to latest security patches
kubectl set image deployment/api -n production \
  api=noaserver/api:latest-security-patch

# Apply security configuration
kubectl apply -f security-hardening.yaml

# Update network policies
kubectl apply -f network-policies-strict.yaml

# Rotate all secrets
kubectl create secret generic api-secrets-new --from-env-file=secrets.env
kubectl set env deployment/api -n production --from=secret/api-secrets-new
kubectl delete secret api-secrets
```

**Reset Access**:
```bash
# Force password reset for all users
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/users/force-password-reset-all

# Regenerate all API keys
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/api-keys/regenerate-all

# Rotate database credentials
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "ALTER USER app_user WITH PASSWORD 'new-secure-password';"

# Update application with new credentials
kubectl create secret generic db-credentials --from-literal=password=new-secure-password
```

**Harden Security**:
```bash
# Enable WAF rules
kubectl apply -f waf-rules-strict.yaml

# Implement IP whitelisting
kubectl apply -f ip-whitelist.yaml

# Enable enhanced monitoring
kubectl apply -f security-monitoring.yaml

# Deploy intrusion detection
kubectl apply -f ids-deployment.yaml
```

### Step 6: Verify Security (30-60 minutes)

**Security Audit**:
```bash
# Run security scan
kubectl exec -n security trivy-scanner -- \
  trivy image noaserver/api:latest

# Check for vulnerabilities
kubectl exec -n security clair-scanner -- \
  clair-scan noaserver/api:latest

# Verify network policies
kubectl exec -n security network-policy-checker -- \
  check-policies --namespace production

# Test access controls
kubectl exec -n security access-tester -- \
  test-all-endpoints --verify-auth
```

**Penetration Testing**:
```bash
# Run automated penetration test
kubectl exec -n security zap-scanner -- \
  zap-cli quick-scan https://api.noaserver.com

# Test for common vulnerabilities
kubectl exec -n security nikto -- \
  nikto -h https://api.noaserver.com
```

## Communication Templates

### Initial Alert
```
[SEV1 SECURITY INCIDENT] Unauthorized Access Detected
Status: Contained
Impact: Potential data access by unauthorized party
Actions: Systems secured, evidence collection in progress
Security team engaged, investigation ongoing
Next Update: 30 minutes
```

### Update
```
[SEV1 UPDATE] Security Incident
Status: Under Investigation
Impact: [X] accounts accessed, no evidence of data exfiltration
Actions: All credentials rotated, enhanced monitoring enabled
Vulnerability patched, systems hardened
Next Update: 1 hour
```

### Resolution
```
[SEV1 RESOLVED] Security Incident
Status: Resolved
Impact: Security breach contained and remediated
Summary: Unauthorized access via [vector]. All systems secured.
         No evidence of data loss. All credentials rotated.
Duration: [X] hours
Customer Notification: Sent to [Y] affected customers
Next Steps: Full security audit, post-mortem, enhanced security measures
```

## Legal and Compliance

**Notification Requirements**:
- GDPR: 72 hours to notify supervisory authority
- CCPA: "Without unreasonable delay"
- HIPAA: 60 days to notify affected individuals
- PCI DSS: Immediate notification to card brands

**Required Documentation**:
- [ ] Incident timeline
- [ ] Evidence collection log
- [ ] Impact assessment
- [ ] Remediation actions
- [ ] Customer notification records
- [ ] Regulatory notifications

## Post-Incident Actions

- [ ] Complete post-mortem within 48 hours
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update security policies
- [ ] Security training for team
- [ ] Implement additional monitoring
- [ ] Review and update incident response plan
- [ ] Regulatory reporting if required

## Preventive Measures

1. **Regular Security Audits**: Monthly vulnerability scans
2. **Penetration Testing**: Quarterly external pen tests
3. **Security Training**: Mandatory security awareness training
4. **Code Reviews**: Security-focused code reviews
5. **Dependency Scanning**: Automated vulnerability scanning in CI/CD
6. **Access Controls**: Principle of least privilege
7. **MFA**: Require multi-factor authentication
8. **Encryption**: Encrypt data at rest and in transit

## Escalation

- **Immediate**: Security team, Legal, CTO
- **Within 1 hour**: CEO, Board (for major breaches)
- **External**: Law enforcement (if criminal activity), regulators (if required)

## Related Resources

- [Security Policies](../../security/policies.md)
- [Incident Response Team Contacts](../contacts.md)
- [Legal Notification Requirements](../../legal/notification-requirements.md)
- [Data Breach Response Checklist](./data-breach-checklist.md)

## Emergency Contacts

- Security Team: security@noaserver.com, +1-555-SEC-TEAM
- Legal: legal@noaserver.com, +1-555-LEGAL
- External Security Consultant: [contact info]
- Law Enforcement Liaison: [contact info]
