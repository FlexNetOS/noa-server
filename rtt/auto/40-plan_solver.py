#!/usr/bin/env python3
import json, pathlib, hashlib, time
from typing import Any, Dict

ROOT = pathlib.Path(__file__).resolve().parents[1]


def canon(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


routes = json.loads((ROOT / ".rtt" / "routes.json").read_text(encoding="utf-8"))
symbols: Dict[str, Dict[str, Any]] = {}
for mf in (ROOT / ".rtt" / "manifests").glob("*.json"):
    obj = json.loads(mf.read_text(encoding="utf-8"))
    s = obj.get("symbol", {})
    symbols[s.get("saddr")] = s

plan: Dict[str, Any] = {
    "plan_id": "",
    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "routes_add": [],
    "routes_del": [],
    "order": [],
}
for r in routes.get("routes", []):
    frm = r["from"]
    to = r["to"]
    lane = "shm" if any(k for k in symbols if k.startswith(to.split("@")[0])) else "uds"
    plan["routes_add"].append({"from": frm, "to": to, "lane": lane})
    plan["order"].append(f"{frm}->{to}")

payload: Dict[str, Any] = dict(plan)
payload.pop("plan_id", None)
payload.pop("sign", None)
hash_hex = hashlib.sha256(canon(payload)).hexdigest()
plan["plan_id"] = f"sha256-{hash_hex}"

out = ROOT / "plans" / f"{hash_hex}.plan.json"
out.write_text(json.dumps(plan, indent=2), encoding="utf-8")
(ROOT / "plans" / "latest.plan.json").write_text(out.name, encoding="utf-8")
print("[OK] wrote", out)
