# Production Configuration Example

Complete production-ready RTT configuration.

## Files
- panel.yaml - Panel configuration
- policy.json - QoS and ACL policies
- routes.json - Desired routing state

## Usage
```bash
cp *.{yaml,json} ../../.rtt/
python ../../auto/40-plan_solver.py
python ../../auto/50-apply_plan.py
```
