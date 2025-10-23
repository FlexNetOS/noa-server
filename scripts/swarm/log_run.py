#!/usr/bin/env python3
"""Logs swarm runs into the memory database."""

import sqlite3
from pathlib import Path
from datetime import datetime
import sys

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / ".swarm" / "memory.db"

if not DB_PATH.exists():
    raise SystemExit("Memory database not initialized. Run npm run memory:init first.")

run_type = sys.argv[1] if len(sys.argv) > 1 else "generic"
description = sys.argv[2] if len(sys.argv) > 2 else ""
now = datetime.utcnow().isoformat()

conn = sqlite3.connect(DB_PATH)
try:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tasks (external_id, title, status, priority, created_at) VALUES (?, ?, ?, ?, ?)",
        (f"{run_type}-{now}", f"{run_type.title()} execution", "completed", 0, now),
    )
    task_id = cur.lastrowid
    cur.execute(
        "INSERT INTO runs (task_id, status, started_at, finished_at, metadata) VALUES (?, ?, ?, ?, ?)",
        (task_id, "completed", now, now, description),
    )
    conn.commit()
finally:
    conn.close()

print(f"Logged {run_type} run with task_id={task_id}")
