import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const provider = process.env.MCP_PROVIDER || "local";
const version = process.env.MCP_VERSION || "1.0.0";
const outDir = process.env.RTT_OUT || path.resolve(process.cwd(), ".rtt/manifests");
fs.mkdirSync(outDir, { recursive: true });

type RTT = { $schema: string, symbol: any };
function writeRTT(name: string, kind: "tool"|"resource"|"prompt") {
  const saddr = `rtt://mcp/${provider}/${kind}/${name}@${version}`;
  const doc: RTT = {
    $schema: "https://rtt/spec/v1",
    symbol: {
      saddr,
      type: "api",
      direction: "provider",
      capabilities: ["request","response"],
      inputs: [{ name: "input", schema: "json://generic" }],
      outputs:[{ name:"output", schema:"json://generic" }],
      qos: { latency_budget_ms: 1000, throughput_qps: 10 },
      version_set: `>=${version.split(".")[0]}.0 <${Number(version.split(".")[0])+1}.0`,
      tags: { supports_shm: false }
    }
  };
  fs.writeFileSync(path.join(outDir, `mcp.${provider}.${kind}.${name}.json`), JSON.stringify(doc,null,2));
}

["echo"].forEach(n => writeRTT(n, "tool"));
["health"].forEach(n => writeRTT(n, "resource"));
["summarize"].forEach(n => writeRTT(n, "prompt"));
console.log(`[RTT] wrote manifests in ${outDir}`);

// Also wire in RTT manifests for rtt_mcp_ingest_signed_plans tools if present
try {
  const defaultIngestRoot = path.resolve(process.cwd(), "../../rtt_mcp_ingest_signed_plans");
  const ingestRoot = process.env.RTT_INGEST_DIR || defaultIngestRoot;
  if (fs.existsSync(ingestRoot)) {
    const toolsDir = path.join(ingestRoot, "tools");
    if (fs.existsSync(toolsDir)) {
      const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith(".py"));
      for (const f of toolFiles) {
        const base = f.replace(/\.py$/, "");
        // Prefix with ingest. to avoid name collisions with local tools
        writeRTT(`ingest.${base}` as const, "tool");
      }
      console.log(`[RTT] wired ${toolFiles.length} ingest tools from ${toolsDir}`);
    }
    const manifestsDir = path.join(ingestRoot, ".rtt", "manifests");
    if (fs.existsSync(manifestsDir)) {
      for (const f of fs.readdirSync(manifestsDir)) {
        if (!f.endsWith('.json')) continue;
        const src = path.join(manifestsDir, f);
        const dst = path.join(outDir, f);
        fs.copyFileSync(src, dst);
      }
      console.log(`[RTT] copied any existing ingest manifests from ${manifestsDir}`);
    }
  } else {
    console.log(`[RTT] ingest root not found: ${ingestRoot} (set RTT_INGEST_DIR to override)`);
  }
} catch (err) {
  console.warn(`[RTT] warning: failed to wire ingest tools: ${String(err)}`);
}
