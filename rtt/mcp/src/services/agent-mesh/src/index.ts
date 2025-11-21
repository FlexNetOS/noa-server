import { connect, StringCodec } from "nats";
import { validateEnvelope } from "@mcp/envelope";
const nc = await connect({ servers: process.env.NATS_URL||"nats://127.0.0.1:4222" });
const sc = StringCodec();
const subj = "mcp.events";
(async()=>{
  const sub = nc.subscribe(subj);
  for await (const m of sub){
    try{
      const env = JSON.parse(sc.decode(m.data));
      validateEnvelope(env);
      const spiffe = m.headers?.get("x-spiffe-id")||"";
      if(!spiffe.startsWith("spiffe://")) continue;
      console.log("event", env.type, "from", env.source);
    }catch{}
  }
})();
setInterval(()=>{
  const env = { specversion:"1.0", type:"mcp.mesh.heartbeat", source:"mesh://local", id: String(Math.random()), data:{ts:Date.now()} };
  const h = new Headers({ "x-spiffe-id":"spiffe://example.org/ns/default/sa/mesh" });
  nc.publish(subj, sc.encode(JSON.stringify(env)), { headers: h });
}, 5000);
