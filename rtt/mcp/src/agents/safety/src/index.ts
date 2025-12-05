import { connect, StringCodec } from "nats";
const nc = await connect({ servers: process.env.NATS_URL||"nats://127.0.0.1:4222" });
const sc = StringCodec();
const sub = nc.subscribe("mcp.completions");
const banned = [/ssn\b/i,/credit\s*card/i,/password/i];
for await (const m of sub){
  try{
    const evt = JSON.parse(sc.decode(m.data));
    const text = evt?.data?.text || "";
    const hit = banned.find(r=>r.test(text));
    if(hit){ nc.publish("mcp.violations", sc.encode(JSON.stringify({ type:"safety.hit", rule:String(hit), id:evt.id })) ); }
  }catch{}
}
