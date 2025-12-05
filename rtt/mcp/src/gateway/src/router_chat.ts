import { z } from "zod";
import { cfg, Route } from "./config.js";
import { callOpenAICompat, callOpenAICompatStream } from "./upstreams/openai_compat.js";
import { callAnthropic, callAnthropicStream } from "./upstreams/anthropic.js";
import { callLlamaCpp, callLlamaCppStream } from "./upstreams/llamacpp.js";
import { extractJson, coerceAndValidate } from "./structured.js";
import { account } from "./tenants.js";
import { trace, Span } from "@opentelemetry/api";
const ChatSchema = z.object({ model: z.string().optional(), messages: z.array(z.object({ role: z.enum(["system","user","assistant"]), content: z.string() })), max_tokens: z.number().optional(), temperature: z.number().optional(), tenant: z.string().optional(), response_schema: z.any().optional(), coerce: z.boolean().optional(), stream: z.boolean().optional() });
function pickRoute(alias: string): Route { const c = cfg.routes.filter(r=>r.model===alias); if(!c.length) throw new Error(`no route for model alias ${alias}`); const total=c.reduce((a,b)=>a+(b.weight||1),0); let rnd=Math.random()*total; for(const r of c){rnd-=(r.weight||1); if(rnd<=0)return r;} return c[0]; }
function enforcePolicy(route: Route, tenant: string, body: any) { const pol = cfg.policy.tenants[tenant] || cfg.policy.tenants[cfg.defaultTenant]; if (!pol.allowModels.includes(route.model)) throw new Error("model not allowed"); const maxOut = Math.min(pol.maxOutputTokens, body.max_tokens || pol.maxOutputTokens); body.max_tokens = maxOut; const estUsd = (route.costPer1kInput||0)*0.002 + (route.costPer1kOutput||0)*(maxOut/1000.0); if (estUsd > pol.maxRequestUsd) throw new Error("estimated cost exceeds policy cap"); }
function bill(route: Route, usage: any){ const pi = usage?.prompt_tokens || usage?.input_tokens || 0; const co = usage?.completion_tokens || usage?.output_tokens || 0; const cost = (pi/1000.0)*(route.costPer1kInput||0) + (co/1000.0)*(route.costPer1kOutput||0); return { prompt: pi, completion: co, cost }; }
export async function routeChat(body: any, reqId: string, parentSpan?: Span) {
  const parsed = ChatSchema.parse(body);
  const alias = parsed.model || "chat-default";
  const tenant = parsed.tenant || cfg.defaultTenant;
  const route = pickRoute(alias);
  enforcePolicy(route, tenant, parsed);
  const tracer = trace.getTracer("gateway");
  return await tracer.startActiveSpan("genai.chat.route", async span => {
    if (parentSpan) span.setAttribute("parent.trace_id", parentSpan.spanContext().traceId);
    span.setAttribute("gen_ai.system", route.provider);
    span.setAttribute("gen_ai.request.model", route.model);
    span.setAttribute("gen_ai.request.max_tokens", parsed.max_tokens ?? 0);
    try {
      let upstream:any;
      if (parsed.stream) { throw new Error("stream requires routeChatStream"); }
      else if (route.provider === "openai_compatible") upstream = await callOpenAICompat(route, parsed, reqId, span);
      else if (route.provider === "anthropic") upstream = await callAnthropic(route, parsed, reqId);
      else upstream = await callLlamaCpp(route, parsed, reqId);
      if (parsed.response_schema) {
        const text = upstream?.choices?.[0]?.message?.content || upstream?.output_text || "";
        const obj = extractJson(String(text));
        const valid = coerceAndValidate(obj, parsed.response_schema);
        if (upstream?.choices?.[0]?.message) upstream.choices[0].message.content = JSON.stringify(valid);
      }
      const { prompt, completion, cost } = bill(route, upstream?.usage);
      account(tenant, span.spanContext().traceId, route.model, prompt, completion, cost);
      span.setAttribute("gen_ai.usage.prompt_tokens", prompt);
      span.setAttribute("gen_ai.usage.completion_tokens", completion);
      span.setAttribute("gen_ai.cost.estimated_usd", cost);
      span.end(); return upstream;
    } catch (e:any){ span.recordException(e); span.end(); throw e; }
  });
}
export async function routeChatStream(body:any, reqId:string, res:any, parentSpan?: Span){
  const parsed = ChatSchema.parse(body);
  const alias = parsed.model || "chat-default";
  const tenant = parsed.tenant || cfg.defaultTenant;
  const route = pickRoute(alias);
  enforcePolicy(route, tenant, parsed);
  const tracer = trace.getTracer("gateway");
  await tracer.startActiveSpan("genai.chat.stream", async span => {
    try {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
      let usage:any = null; const onUsage = (u:any)=>{ usage = u; };
      if (route.provider === "openai_compatible") await callOpenAICompatStream(route, parsed, reqId, res, onUsage);
      else if (route.provider === "anthropic") await callAnthropicStream(route, parsed, reqId, res, onUsage);
      else await callLlamaCppStream(route, parsed, reqId, res, onUsage);
      const { prompt, completion, cost } = bill(route, usage||{});
      account(tenant, span.spanContext().traceId, route.model, prompt, completion, cost);
      span.setAttribute("gen_ai.usage.prompt_tokens", prompt);
      span.setAttribute("gen_ai.usage.completion_tokens", completion);
      span.setAttribute("gen_ai.cost.estimated_usd", cost);
      res.write("data: [DONE]\n\n"); res.end();
    } catch (e:any){ res.write("data: "+JSON.stringify({error:e.message||"bad request"})+"\n\n"); res.end(); }
    finally { span.end(); }
  });
}
