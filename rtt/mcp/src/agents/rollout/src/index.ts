import { connect, StringCodec } from "nats";
import axios from "axios";
import { verify } from "@mcp/envelope";

const nc = await connect({ servers: process.env.NATS_URL||"nats://127.0.0.1:4222" });
const sc = StringCodec();
const sub = nc.subscribe("mcp.events");
const opa = process.env.OPA_URL || "";
const pkB64 = process.env.SIGN_PK_B64 || "";

for await (const m of sub){
  try{
    const env = JSON.parse(sc.decode(m.data));
    if(env.type !== "mcp.apo.plan") continue;
    if(pkB64 && !verify(env, pkB64)){ console.warn("signature verification failed"); continue; }
    let allow = true, reason="allow";
    if(opa){
      try{ const r = await axios.post(opa.replace(/\/$/,'')+"/v1/data/rtt/allow", { input: env.data.plan }, { timeout: 3000 }); allow = !!(r.data?.result ?? r.data?.allow); reason = JSON.stringify(r.data); }
      catch(e:any){ allow=false; reason = e.message; }
    }
    const out = { type: allow ? "rollout.allow" : "rollout.block", plan_id: env.data.plan.id, reason };
    nc.publish("mcp.rollouts", sc.encode(JSON.stringify(out)));
    console.log("rollout decision:", out.type, out.plan_id);
  }catch(e:any){ console.error("rollout agent error:", e.message); }
}
