import axios from "axios";
import { Route } from "../config.js";
import { trace } from "@opentelemetry/api";
export async function callLlamaCpp(route: Route, body: any, reqId: string) {
  const tracer = trace.getTracer("gateway");
  return await tracer.startActiveSpan("genai.provider.llamacpp", async span => {
    try {
      const resp = await axios.post(`${route.endpoint}/v1/chat/completions`, {
        model: route.models?.[0] || body.model || "llama",
        messages: body.messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature
      }, { timeout: 60_000 });
      return resp.data;
    } finally { span.end(); }
  });
}
export async function callLlamaCppStream(route: Route, body: any, reqId: string, res: any, onUsage: (u:any)=>void) {
  const resp = await axios.post(`${route.endpoint}/v1/chat/completions`, {
    model: route.models?.[0] || body.model || "llama",
    messages: body.messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    stream: true
  }, { timeout: 0, responseType: "stream" });
  resp.data.on("data", (chunk:any)=>{ res.write(chunk.toString()); });
  await new Promise<void>((resolve)=> resp.data.on("end", ()=>resolve()));
}
