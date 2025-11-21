import { connect, StringCodec } from "nats";
const BUDGET = Number(process.env.BUDGET_USD || "2.0");
let spend = 0;
const nc = await connect({ servers: process.env.NATS_URL || "nats://127.0.0.1:4222" });
const sc = StringCodec();
const sub = nc.subscribe("mcp.usage");
for await (const m of sub){
  try{
    const u = JSON.parse(sc.decode(m.data));
    spend += u.cost_usd || 0;
    if(spend > BUDGET){
      nc.publish("mcp.controls", sc.encode(JSON.stringify({ type:"budget.cutoff", tenant:u.tenant, spend, budget:BUDGET })));
    }
  }catch{}
}
