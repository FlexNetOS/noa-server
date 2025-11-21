# RTT Universal Language Connector Stubs

**73 Language Connectors for Polyglot Agent Orchestration**

This directory contains universal connector stubs that enable RTT to orchestrate agents written in any of 73 supported programming languages. Each stub provides a standardized interface for communication between the RTT routing fabric and language-specific agent implementations.

## Overview

RTT connector stubs act as protocol adapters that translate between:
- **RTT routing protocol** (content-addressed, deterministic routing)
- **Language-specific agent implementations** (native code, libraries, frameworks)

Each stub follows a consistent pattern:
1. **Read JSON request** from stdin
2. **Invoke language-specific handler** (function, module, class)
3. **Write JSON response** to stdout
4. **Report errors** via stderr

This enables zero-dependency polyglot integration - agents can be written in any language without requiring RTT-specific libraries or modifications.

## Directory Structure

```
stubs/
├── python/              # Python connector stub
├── javascript/          # JavaScript (Node.js) connector
├── rust/                # Rust connector stub
├── go/                  # Go connector stub
├── java/                # Java connector stub
├── csharp/              # C# connector stub
├── ...                  # 67+ additional languages
└── universal_stubs/     # Shared templates and utilities
```

Each language directory contains:
- **README.md** - Language-specific usage instructions
- **connector stub** - Executable or script implementing the protocol
- **example agents** (optional) - Sample implementations

## Quick Start

### Python Example

```python
# my_agent.py
def handle(request):
    """RTT agent handler - receives JSON, returns JSON"""
    return {
        "result": f"Processed: {request.get('input')}",
        "status": "ok"
    }

if __name__ == "__main__":
    import json, sys
    req = json.load(sys.stdin)
    response = handle(req)
    json.dump(response, sys.stdout)
```

Run via RTT connector:
```bash
echo '{"input": "test"}' | python stubs/python/connector.py my_agent.py
```

### JavaScript Example

```javascript
// my_agent.js
function handle(request) {
    return {
        result: `Processed: ${request.input}`,
        status: 'ok'
    };
}

// Read from stdin, write to stdout
const readline = require('readline');
const rl = readline.createInterface({input: process.stdin});
rl.on('line', (line) => {
    const request = JSON.parse(line);
    const response = handle(request);
    console.log(JSON.stringify(response));
    process.exit(0);
});
```

Run via RTT connector:
```bash
echo '{"input": "test"}' | node stubs/javascript/connector.js my_agent.js
```

### Rust Example

```rust
// my_agent.rs
use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};

#[derive(Deserialize)]
struct Request {
    input: String,
}

#[derive(Serialize)]
struct Response {
    result: String,
    status: String,
}

fn handle(req: Request) -> Response {
    Response {
        result: format!("Processed: {}", req.input),
        status: "ok".to_string(),
    }
}

fn main() {
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer).unwrap();
    let request: Request = serde_json::from_str(&buffer).unwrap();
    let response = handle(request);
    let output = serde_json::to_string(&response).unwrap();
    io::stdout().write_all(output.as_bytes()).unwrap();
}
```

Compile and run:
```bash
rustc my_agent.rs -o my_agent
echo '{"input": "test"}' | ./my_agent
```

## Supported Languages

### Systems Languages (7)
- **C** - Low-level systems programming
- **C++** - Object-oriented systems programming
- **Rust** - Memory-safe systems programming
- **Go** - Concurrent systems programming
- **D** - Modern systems programming
- **Nim** - Efficient compiled language
- **CUDA C++** - GPU-accelerated computing

### Enterprise Languages (8)
- **Java** - Enterprise applications
- **C#** - .NET applications
- **Scala** - JVM functional programming
- **Kotlin** - Modern JVM language
- **F#** - .NET functional programming
- **VB** - Visual Basic .NET
- **Groovy** - JVM scripting
- **Pascal** - Structured programming

### Scripting Languages (9)
- **Python** - General-purpose scripting
- **JavaScript** - Web and Node.js scripting
- **TypeScript** - Type-safe JavaScript
- **Ruby** - Dynamic scripting
- **Perl** - Text processing
- **Perl6** - Raku modern Perl
- **PHP** - Web scripting
- **Lua** - Embedded scripting
- **PowerShell** - Windows automation

### Functional Languages (5)
- **Haskell** - Pure functional programming
- **OCaml** - ML-family functional language
- **Clojure** - Lisp for JVM
- **Erlang** - Concurrent functional language
- **Elixir** - Modern Erlang alternative (via Erlang stub)

### Web & Frontend (11)
- **JavaScript** - Browser and Node.js
- **TypeScript** - Type-safe web development
- **JavaScriptReact** - React JSX support
- **TypeScriptReact** - TypeScript + React
- **Vue** - Vue.js framework
- **Vue HTML** - Vue templates
- **Svelte** - Svelte framework
- **HTML** - Markup language
- **CSS** - Stylesheets
- **SCSS/Sass** - CSS preprocessors
- **Less** - CSS preprocessor

### Data & Science (4)
- **SQL** - Database queries
- **R** - Statistical computing
- **Julia** - Scientific computing
- **MATLAB** - Numerical computing (via universal stub)

### Mobile (3)
- **Swift** - iOS/macOS development
- **Kotlin** - Android development
- **Dart** - Flutter cross-platform

### Configuration & Markup (12)
- **JSON** - Data interchange
- **JSONC** - JSON with comments
- **YAML** - Configuration files
- **XML** - Structured data
- **TOML** - Configuration format (via universal stub)
- **INI** - Configuration files
- **Markdown** - Documentation
- **LaTeX** - Document typesetting
- **BibTeX** - Bibliography management
- **TeX** - Typesetting
- **Dockerfile** - Container definitions
- **Docker Compose** - Multi-container orchestration

### Template Languages (5)
- **Handlebars** - Logic-less templates
- **Pug** - HTML template engine
- **Jade** - Pug predecessor
- **Haml** - HTML abstraction
- **Slim** - Minimalist templates
- **Razor** - ASP.NET templates

### Shell & Build (4)
- **Bash** - Unix shell scripting
- **Shellscript** - Generic shell scripts
- **Bat** - Windows batch files
- **Makefile** - Build automation

### Version Control (3)
- **Git Commit** - Git commit messages
- **Git Rebase** - Git rebase editing
- **Diff** - Unified diff format

### Specialized (5)
- **CoffeeScript** - JavaScript transpiler
- **Stylus** - CSS preprocessor
- **ShaderLab** - Unity shader language
- **ABAP** - SAP programming
- **Plaintext** - Generic text processing

## Integration with RTT Pipeline

Connector stubs are automatically generated and wired during the RTT automation pipeline:

```bash
# 1. Bootstrap environment
python auto/00-bootstrap.py

# 2. Scan for symbols
python auto/10-scan_symbols.py

# 3. Check dependencies
python auto/20-depdoctor.py

# 4. Generate connectors (creates stubs in .rtt/drivers/generated/)
python auto/30-generate_connectors.py

# 5. Solve routing plan
python auto/40-plan_solver.py

# 6. Apply plan atomically
python auto/50-apply_plan.py
```

During step 4, RTT:
1. Detects agent language from manifest metadata
2. Selects appropriate stub from `stubs/<language>/`
3. Generates connector driver in `.rtt/drivers/generated/`
4. Wires connector to agent implementation

## MCP Integration

Connector stubs integrate seamlessly with the Model Context Protocol (MCP):

```bash
# Ingest MCP tools from provider
python tools/mcp_ingest.py claude mcp/claude/tools.json

# MCP tools are registered in CAS with language-specific stubs
# RTT automatically selects the correct stub based on tool metadata
```

See `connector-mcp/` for MCP-to-RTT protocol bridge implementation.

## Advanced Usage

### Custom Stub Implementation

To create a custom connector for a new language:

1. Create directory: `stubs/mylang/`
2. Implement JSON stdin/stdout protocol
3. Add README.md with usage instructions
4. Register in connector generation pipeline

Example minimal stub (Python):

```python
#!/usr/bin/env python3
import json, sys, subprocess

def main():
    # Read request from stdin
    request = json.load(sys.stdin)

    # Extract agent path and invocation details
    agent_path = request.get('agent_path')
    params = request.get('params', {})

    # Invoke language-specific agent
    result = subprocess.run(
        ['mylang', agent_path],
        input=json.dumps(params),
        capture_output=True,
        text=True
    )

    # Parse response and write to stdout
    if result.returncode == 0:
        response = json.loads(result.stdout)
        json.dump(response, sys.stdout)
    else:
        json.dump({'error': result.stderr}, sys.stdout)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### Multi-Lane Transport

Connector stubs support multiple transport mechanisms:
- **SHM (Shared Memory)** - Zero-copy IPC for same-NUMA node
- **UDS (Unix Domain Sockets)** - Low-latency local IPC
- **TCP** - Network-based cross-host communication

RTT automatically selects optimal transport based on:
- Agent placement (NUMA topology)
- QoS requirements (latency, throughput)
- Policy constraints (security, isolation)

See `tools/solver_placement.py` for placement optimization logic.

## Testing

Test a connector stub directly:

```bash
# Test Python stub
echo '{"input": "hello"}' | python stubs/python/connector.py test_agent.py

# Test JavaScript stub
echo '{"input": "hello"}' | node stubs/javascript/connector.js test_agent.js

# Test Rust stub (after compilation)
echo '{"input": "hello"}' | ./stubs/rust/connector test_agent
```

Validate all stubs in pipeline:

```bash
# Run full validation suite
python tests/validate.py

# Test connector generation
python auto/30-generate_connectors.py
ls -la .rtt/drivers/generated/
```

## Schema Reference

Connector stubs must conform to RTT manifest schemas:

- **Agent Manifest**: `schemas/rtt.symbol.schema.json`
- **Policy**: `schemas/rtt.policy.schema.json`
- **Routes**: `schemas/rtt.routes.schema.json`

See `docs/API-REFERENCE.md` for complete schema documentation.

## Performance Considerations

### Zero-Copy Optimization

For high-throughput scenarios, use shared memory transport:

```json
{
  "routing": {
    "prefer": ["shm", "uds", "tcp"]
  }
}
```

RTT will automatically use SHM for same-node communication.

### NUMA-Aware Placement

RTT optimizes agent placement to minimize cross-NUMA latency:

```bash
# Enable NUMA-aware placement
python tools/solver_placement.py --numa-topology topology.json
```

See `docs/ARCHITECTURE.md` for details on placement optimization.

## Troubleshooting

### Stub Not Found

```
Error: No stub found for language 'mylang'
```

**Solution**: Ensure language directory exists in `stubs/` or add to `universal_stubs/`.

### JSON Parse Error

```
Error: Invalid JSON in connector response
```

**Solution**: Verify agent outputs valid JSON to stdout. Check stderr for debug info.

### Permission Denied

```
Error: Permission denied executing stub
```

**Solution**: Make stub executable:
```bash
chmod +x stubs/python/connector.py
```

## Related Documentation

- **[README.md](../README.md)** - RTT overview and features
- **[QUICKSTART.md](../QUICKSTART.md)** - Getting started guide
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System architecture
- **[docs/API-REFERENCE.md](../docs/API-REFERENCE.md)** - Complete API documentation
- **[connector-mcp/README.md](../connector-mcp/README.md)** - MCP integration guide
- **[auto/README.md](../auto/README.md)** - Automation pipeline documentation

## Contributing

To add support for a new language:

1. Create stub directory: `stubs/<language>/`
2. Implement JSON stdin/stdout protocol
3. Add language-specific README.md
4. Test with example agent
5. Submit PR with stub + tests

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

---

**RTT Universal Stubs** - Enabling polyglot agent orchestration across 73 languages.
