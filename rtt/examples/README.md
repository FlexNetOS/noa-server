# RTT Examples

Production-ready example configurations.

## Available Examples

### [simple-agent/](simple-agent/)
Minimal agent registration and routing example.

### [multi-provider/](multi-provider/)
Multi-provider MCP integration with Claude, OpenAI, Mistral.

### [production-config/](production-config/)
Complete production configuration with QoS, policies, and monitoring.

## Usage

Copy example to your project and customize:
```bash
cp -r examples/simple-agent/* .
python tools/cas_ingest.py my-agent.agent.json
python auto/40-plan_solver.py
```
