#!/usr/bin/env python3
"""Builds the gamified Claude Suite dashboard with live automation telemetry."""

import json
from datetime import datetime, UTC
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DIST_DIR = ROOT_DIR / "packages" / "ui-dashboard" / "dist"
DIST_DIR.mkdir(parents=True, exist_ok=True)

runtime_path = ROOT_DIR / "EvidenceLedger" / "runtime.json"
mcp_catalog = ROOT_DIR / "logs" / "mcp" / "tool_catalog.json"
neural_log = ROOT_DIR / "logs" / "neural" / "test.log"
truth_gate_path = ROOT_DIR / "EvidenceLedger" / "truth_gate.json"
verification_path = ROOT_DIR / "EvidenceLedger" / "verification.json"
bench_log = ROOT_DIR / "logs" / "bench" / "llama-bench.txt"
hooks_log = ROOT_DIR / ".swarm" / "hooks.log"

runtime = json.loads(runtime_path.read_text()) if runtime_path.exists() else {}
mcp = json.loads(mcp_catalog.read_text()) if mcp_catalog.exists() else {}
truth_gate = json.loads(truth_gate_path.read_text()) if truth_gate_path.exists() else {}
verification = json.loads(verification_path.read_text()) if verification_path.exists() else {}
neural_summary = neural_log.read_text() if neural_log.exists() else "Neural tests not run."
bench_summary = bench_log.read_text() if bench_log.exists() else "Benchmarks not executed."
recent_hooks = hooks_log.read_text().splitlines()[-6:] if hooks_log.exists() else []

queen_status = truth_gate.get("passed", False)
queen_badge = "PASS" if queen_status else "ATTENTION"
truth_accuracy = truth_gate.get("accuracy", 0.0)
credits = 100 if queen_status else 42
tool_count = mcp.get("tool_count", 0)

generated_at = datetime.now(UTC).isoformat()
newline = '\n'

html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Claude Suite Dashboard</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0f172a;
      --card: #1e293b;
      --accent: #fbbf24;
      --muted: #94a3b8;
      --border: #334155;
      --success: #22c55e;
      --warning: #facc15;
      --danger: #ef4444;
    }}
    body {{
      font-family: "Inter", Arial, sans-serif;
      margin: 0;
      padding: 2rem;
      background: var(--bg);
      color: #e2e8f0;
    }}
    h1 {{
      color: var(--accent);
      margin-top: 0;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }}
    .card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
    }}
    .badge {{
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .badge.success {{ background: rgba(34, 197, 94, 0.15); color: var(--success); }}
    .badge.warning {{ background: rgba(250, 204, 21, 0.15); color: var(--warning); }}
    .badge.danger {{ background: rgba(239, 68, 68, 0.15); color: var(--danger); }}
    pre {{
      background: rgba(15, 23, 42, 0.65);
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto;
      color: var(--muted);
      font-size: 0.85rem;
      line-height: 1.4;
    }}
    .metric {{
      font-size: 2rem;
      font-weight: 700;
      margin: 0.25rem 0;
    }}
    .subtext {{
      color: var(--muted);
      font-size: 0.95rem;
    }}
  </style>
</head>
<body>
  <h1>Claude Suite Automation Dashboard</h1>
  <p class="subtext">Generated at {generated_at}</p>

  <section class="grid">
    <div class="card">
      <h2>Queen Seraphina</h2>
      <p class="badge {'success' if queen_status else 'danger'}">{queen_badge}</p>
      <p class="metric">{truth_accuracy:.0%}</p>
      <p class="subtext">Truth Gate Accuracy</p>
      <p>Credits Awarded: <strong>{credits}</strong></p>
    </div>
    <div class="card">
      <h2>MCP Arsenal</h2>
      <p class="metric">{tool_count}</p>
      <p class="subtext">Tools Provisioned / 87 Required</p>
      <p>Gap Report: <span class="badge {'success' if tool_count == 87 else 'warning'}">{'Complete' if tool_count == 87 else 'Incomplete'}</span></p>
    </div>
    <div class="card">
      <h2>Swarm Hooks</h2>
      <!-- Use the `newline` variable to join lines for HTML output to avoid f-string escape issues with backslashes -->
      <pre>{newline.join(recent_hooks) if recent_hooks else "No hook events recorded."}</pre>
    </div>
  </section>

  <section class="card">
    <h2>Runtime Versions</h2>
    <pre>{json.dumps(runtime, indent=2)}</pre>
  </section>

  <section class="card">
    <h2>Verification Summary</h2>
    <pre>{json.dumps(verification, indent=2)}</pre>
  </section>

  <section class="card">
    <h2>MCP Tool Catalog</h2>
    <p class="subtext">Excerpt from {tool_count} tools</p>
    <pre>{json.dumps(mcp.get('tools', [])[:10], indent=2)}</pre>
  </section>

  <section class="grid">
    <div class="card">
      <h2>Neural Test Summary</h2>
      <pre>{neural_summary}</pre>
    </div>
    <div class="card">
      <h2>Benchmark Output</h2>
      <pre>{bench_summary}</pre>
    </div>
  </section>
</body>
</html>
"""

(DIST_DIR / "index.html").write_text(html, encoding="utf-8")
print("UI dashboard generated at packages/ui-dashboard/dist/index.html")
