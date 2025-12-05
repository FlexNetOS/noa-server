type Rec = { ts:number, trace:string, model:string, prompt_tokens:number, completion_tokens:number, cost_usd:number };
const per: Record<string, { budget_usd:number, spend_usd:number, tokens_in:number, tokens_out:number, ring: Rec[] }> = {};
const LIMIT = 200;
export function ensureTenant(id: string, budgetUsd: number = 5.0){
  if (!per[id]) per[id] = { budget_usd: budgetUsd, spend_usd: 0, tokens_in: 0, tokens_out: 0, ring: [] };
}
export function account(id: string, trace: string, model: string, prompt: number, completion: number, cost: number){
  ensureTenant(id);
  const t = per[id];
  t.tokens_in += prompt|0;
  t.tokens_out += completion|0;
  t.spend_usd += cost||0;
  t.ring.push({ ts: Date.now(), trace, model, prompt_tokens: prompt|0, completion_tokens: completion|0, cost_usd: cost||0 });
  while (t.ring.length > LIMIT) t.ring.shift();
}
export function summary(){
  const out:any[] = [];
  for (const [id, v] of Object.entries(per)){
    out.push({ id, budget_usd: v.budget_usd, spend_usd: Number(v.spend_usd.toFixed(4)), tokens_in: v.tokens_in, tokens_out: v.tokens_out, ring_size: v.ring.length });
  }
  return out;
}
export function records(id: string){ ensureTenant(id); return per[id].ring.slice().reverse(); }
