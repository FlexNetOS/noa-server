#!/usr/bin/env python3
"""
Generates the Claude agent registry YAML from contains-studio agent directories.
"""

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT_DIR / "packages" / "contains-studio-agents"
OUTPUT_DIR = ROOT_DIR / "config" / "agents"
OUTPUT_FILE = OUTPUT_DIR / "registry.yaml"


def extract_description(markdown_path: Path) -> str:
    try:
        with markdown_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip().startswith("##"):
                    return line.strip("# \n")
                if line.strip():
                    return line.strip()
    except FileNotFoundError:
        return ""
    return ""


def build_registry():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    registry = []
    for claude_file in SOURCE_DIR.glob("**/CLAUDE.md"):
        category = claude_file.parent.relative_to(SOURCE_DIR).as_posix()
        agent_id = category.replace("/", "_").replace("-", "_")
        description = extract_description(claude_file)
        registry.append(
            {
                "id": agent_id,
                "path": str(claude_file.parent.relative_to(ROOT_DIR)),
                "description": description,
            }
        )

    registry.sort(key=lambda entry: entry["id"])
    lines = ["agents:"]
    for entry in registry:
        lines.append(f"  - id: {entry['id']}")
        lines.append(f"    path: {entry['path']}")
        description = entry["description"].replace('"', "'")
        lines.append(f"    description: \"{description}\"")
    with OUTPUT_FILE.open("w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    return OUTPUT_FILE


if __name__ == "__main__":
    output_path = build_registry()
    print(f"Wrote agent registry to {output_path}")
