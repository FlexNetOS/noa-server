# Simple Agent Example

Minimal RTT agent registration example.

## Files

- `my-agent.agent.json` - Sample agent manifest
- `connector.py` - Python connector stub

## Usage

```bash
# Ingest agent
python ../../tools/cas_ingest.py my-agent.agent.json

# Verify
ls ../../.rtt/registry/cas/sha256/
```
