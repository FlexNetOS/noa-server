#!/usr/bin/env python3
"""Generates a release report summarizing current automation status."""

import json
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT_DIR / "docs" / "release"
REPORT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_FILE = REPORT_DIR / "truth-report.md"

runtime = (ROOT_DIR / "EvidenceLedger" / "runtime.json")
truth_gate = (ROOT_DIR / "EvidenceLedger" / "truth_gate.json")
verification = (ROOT_DIR / "EvidenceLedger" / "verification.json")
manifest = (ROOT_DIR / ".export_manifest.json")

sections = ["# Claude Suite Truth Report\n"]
sections.append(f"Generated at: {datetime.utcnow().isoformat()} UTC\n")

if runtime.exists():
    sections.append("## Runtime Versions\n")
    sections.append(f"```json\n{runtime.read_text()}\n```\n")
else:
    sections.append("## Runtime Versions\nRuntime data missing.\n")

if verification.exists():
    sections.append("## Verification Summary\n")
    sections.append(f"```json\n{verification.read_text()}\n```\n")
else:
    sections.append("## Verification Summary\nVerification not executed.\n")

if truth_gate.exists():
    data = json.loads(truth_gate.read_text())
    sections.append("## Truth Gate\n")
    sections.append(f"Accuracy: {data['accuracy']:.2f} (threshold {data['threshold']})\n")
    sections.append(f"Status: {'PASS' if data['passed'] else 'FAIL'}\n")
    sections.append(f"Details: ```json\n{json.dumps(data, indent=2)}\n```\n")
else:
    sections.append("## Truth Gate\nTruth gate not evaluated.\n")

if manifest.exists():
    sections.append("## Export Manifest\n")
    sections.append(f"```json\n{manifest.read_text()}\n```\n")
else:
    sections.append("## Export Manifest\nNo export found.\n")

REPORT_FILE.write_text("\n".join(sections), encoding="utf-8")
print(f"Release report written to {REPORT_FILE}")
