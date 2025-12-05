import axios from "axios";
import { Route } from "../config.js";
import { trace, Span } from "@opentelemetry/api";
export async function callOpenAICompat(route: Route, body: any, reqId: string, parent?: Span) {
  const tracer = trace.getTracer("gateway");
  return await tracer.startActiveSpan("genai.provider.openai_compat", async span => {
    try {
      const key = route.apiKeyEnv ? process.env[route.apiKeyEnv] : undefined;
      const headers: Record<string,string> = { "Content-Type":"application/json" };
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const resp = await axios.post(`${route.endpoint}/chat/completions`, {
        model: route.models?.[0] || body.model || "gpt-4o-mini",
        messages: body.messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature
      }, { headers, timeout: 60_000 });
      return resp.data;
    } finally { span.end(); }
  });
}
export async function callOpenAICompatStream(route: Route, body: any, reqId: string, res: any, onUsage: (u:any)=>void) {
  const key = route.apiKeyEnv ? process.env[route.apiKeyEnv] : undefined;
  const headers: Record<string,string> = { "Content-Type":"application/json", "Accept":"text/event-stream" };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const resp = await axios.post(`${route.endpoint}/chat/completions`, {
    model: route.models?.[0] || body.model || "gpt-4o-mini",
    messages: body.messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    stream: true
  }, { headers, timeout: 0, responseType: "stream" });
  resp.data.on("data", (chunk:any)=>{
    const s = chunk.toString();
    for (const line of s.split(/\r?\n/)) {
      if (line.startsWith("data: ")) { try { const obj = JSON.parse(line.slice(6)); if (obj.usage) onUsage(obj.usage); } catch {} }
    }
    res.write(s);
  });
  await new Promise<void>((resolve)=> resp.data.on("end", ()=>resolve()));
}
