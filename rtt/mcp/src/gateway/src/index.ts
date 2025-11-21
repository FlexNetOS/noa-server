import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { routeChat, routeChatStream } from "./router_chat.js";
import { offerHandler } from "./webrtc.js";
import { opaDecide } from "./opa_client.js";
import { tracesApi, recordTrace } from "./traces.js";
import { summary, records, ensureTenant } from "./tenants.js";
import { trace } from "@opentelemetry/api";
const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));
app.get("/health", (_req,res)=>res.json({ ok:true, time:new Date().toISOString() }));
app.post("/v1/chat/completions", async (req, res) => {
  const tracer = trace.getTracer("gateway");
  await tracer.startActiveSpan("genai.chat.request", async span => {
    try {
      const id = uuidv4();
      const body = req.body || {};
      const tenant = body.tenant || "public"; ensureTenant(tenant);
      if (body.stream) {
        res.setHeader("x-trace-id", span.spanContext().traceId);
        recordTrace(span.spanContext().traceId, { ts: Date.now(), model: body?.model || "chat-default" });
        await routeChatStream(body, id, res, span);
      } else {
        const out = await routeChat(body, id, span);
        res.setHeader("x-trace-id", span.spanContext().traceId);
        recordTrace(span.spanContext().traceId, { ts: Date.now(), model: body?.model || "chat-default" });
        res.json(out);
      }
    } catch (e:any) {
      span.recordException(e); res.status(400).json({ error: { message: e.message || "bad request" } });
    } finally { span.end(); }
  });
});
app.post("/realtime/offer", offerHandler);
app.post("/api/opa/decide", async (req,res)=>{ try { res.json(await opaDecide(req.body || {})); } catch (e:any){ res.status(400).json({ error: e.message || "OPA error" }); } });
app.get("/api/traces", (_req,res)=>res.json(tracesApi()));
app.get("/api/tenants", (_req,res)=>res.json(summary()));
app.get("/api/tenants/:id", (req,res)=>res.json(records(String(req.params.id))));
let counters = { requests: 0, tokens_in: 0, tokens_out: 0 };
app.use((_req,_res,next)=>{ counters.requests++; next(); });
app.get("/api/stats", (_req,res)=>res.json(counters));
const port = Number(process.env.PORT || 8080);
app.listen(port, ()=>console.log(`[gateway] listening on :${port}`));
