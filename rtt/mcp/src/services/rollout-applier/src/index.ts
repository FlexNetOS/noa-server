import { connect, StringCodec, consumerOpts } from "nats";
import axios from "axios";
import simpleGit from "simple-git";
import { init, extractFromHeaders } from "@mcp/tracecontext";
import { context, trace } from "@opentelemetry/api";

const tracer = init("rollout-applier");
const MODE = process.env.APPLY_MODE || "webhook"; // webhook | gitops
const nc = await connect({ servers: process.env.NATS_URL || "nats://127.0.0.1:4222" });
const js = nc.jetstream();
const sc = StringCodec();

// Ensure stream/consumer
try {
  const jsm = await nc.jetstreamManager();
  await jsm.streams.info("MCP");
} catch {
  console.error("JetStream MCP not found. Run jetstream/bootstrap.js first.");
}

const opts = consumerOpts();
opts.durable("rollouts");
opts.manualAck();
opts.ackExplicit();
opts.deliverTo("deliver.rollouts");
const sub = await js.subscribe("mcp.rollouts", opts);

for await (const m of sub) {
  const headers = m.headers || new Headers();
  const ctx = extractFromHeaders(headers);
  await tracer.startActiveSpan("rollout.apply", async span => {
    try {
      const evt = JSON.parse(sc.decode(m.data));
      if (!evt?.type || !evt?.plan_id) { m.term(); span.end(); return; }
      span.setAttribute("plan.id", evt.plan_id);
      span.setAttribute("decision", evt.type);
      if (evt.type === "rollout.allow") {
        if (MODE === "webhook") {
          await applyViaArgoWebhook(evt);
        } else {
          await applyViaGitOps(evt);
        }
      }
      await m.ack();
    } catch (e:any) {
      console.error("apply error:", e.message);
      await m.nak(); // retry
    } finally { span.end(); }
  }, ctx);
}

async function applyViaArgoWebhook(evt:any){
  const url = process.env.ARGOCD_WEBHOOK_URL || "http://localhost:8080/apply";
  // Payload would carry the desired setWeight or flag change
  await axios.post(url, { plan_id: evt.plan_id, action: "promote", weight: 100 }, { timeout: 5000 });
  console.log("webhook applied", evt.plan_id);
}
async function applyViaGitOps(evt:any){
  const repo = process.env.GITOPS_REPO || "/tmp/gitops";
  const branch = `rollout/${evt.plan_id}`;
  const git = simpleGit(repo);
  await git.checkoutLocalBranch(branch);
  const patchFile = `${repo}/flags/plan.canaryWeight.json`;
  await (await import("node:fs/promises")).mkdir(`${repo}/flags`, { recursive: true });
  await (await import("node:fs/promises")).writeFile(patchFile, JSON.stringify({ defaultVariant:"off", variants:{off:0,low:10,high:50}}, null, 2));
  await git.add(patchFile); await git.commit(`Promote plan ${evt.plan_id}`);
  // pushing requires credentials configured in ENV
  try { await git.push("origin", branch); } catch {}
  console.log("gitops branch ready", branch);
}
