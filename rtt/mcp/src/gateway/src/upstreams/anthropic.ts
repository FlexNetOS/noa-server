import axios from "axios";
import { Route } from "../config.js";
import { trace } from "@opentelemetry/api";
export async function callAnthropic(route: Route, body: any, reqId: string) {
  const tracer = trace.getTracer("gateway");
  return await tracer.startActiveSpan("genai.provider.anthropic", async span => {
    try {
      const key = route.apiKeyEnv ? process.env[route.apiKeyEnv] : process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("missing Anthropic API key");
      const headers: Record<string,string> = { "Content-Type":"application/json", "x-api-key": key, "anthropic-version":"2023-06-01" };
      const messages = body.messages.map((m:any)=> m.role==="user" ? { role:"user", content: m.content } : null).filter(Boolean);
      const resp = await axios.post(`${route.endpoint}/v1/messages`, {
        model: route.models?.[0] || "claude-3-5-sonnet-20241022",
        max_tokens: body.max_tokens ?? 512,
        temperature: body.temperature ?? 0.2,
        messages
      }, { headers, timeout: 60_000 });
      const text = resp.data.content?.[0]?.text || "";
      return { id: `chatcmpl_${reqId}`, object: "chat.completion", choices: [{ index:0, message: { role:"assistant", content: text }, finish_reason: "stop" }], usage: resp.data.usage || {} };
    } finally { span.end(); }
  });
}
export async function callAnthropicStream(route: Route, body: any, reqId: string, res: any, onUsage: (u:any)=>void) {
  const key = route.apiKeyEnv ? process.env[route.apiKeyEnv] : process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("missing Anthropic API key");
  const headers: Record<string,string> = { "Content-Type":"application/json", "x-api-key": key, "anthropic-version":"2023-06-01", "Accept":"text/event-stream" };
  const messages = body.messages.map((m:any)=> m.role==="user" ? { role:"user", content: m.content } : null).filter(Boolean);
  const resp = await axios.post(`${route.endpoint}/v1/messages`, {
    model: route.models?.[0] || "claude-3-5-sonnet-20241022",
    max_tokens: body.max_tokens ?? 512,
    temperature: body.temperature ?? 0.2,
    messages, stream: true
  }, { headers, timeout: 0, responseType: "stream" });
  resp.data.on("data", (chunk:any)=>{
    const s = chunk.toString();
    for (const line of s.split(/\r?\n/)) { if (line.startsWith("data: ")) { try { const obj = JSON.parse(line.slice(6)); if (obj?.usage) onUsage(obj.usage); } catch {} } }
    res.write(s);
  });
  await new Promise<void>((resolve)=> resp.data.on("end", ()=>resolve()));
}
