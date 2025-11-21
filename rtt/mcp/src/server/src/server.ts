import { SpanStatusCode, trace } from "@opentelemetry/api";
import Ajv from "ajv";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const SERVER_NAME = process.env.MCP_SERVER_NAME || "mcp-server-skeleton";

const ajv = new Ajv({ allErrors: true, strict: true });

// Zod input/output schemas
const EchoInput = z.object({ text: z.string() });
const EchoOutput = z.object({ text: z.string(), ts: z.string() });
// Optional runtime validation using Ajv against a JSON Schema equivalent
const EchoOutputValidate = ajv.compile({
  type: "object",
  additionalProperties: false,
  properties: { text: { type: "string" }, ts: { type: "string" } },
  required: ["text", "ts"]
});

const tracer = trace.getTracer("mcp-server");

// Create high-level MCP server (dynamic import to avoid TS subpath resolution issues)
const { McpServer } = (await import("@modelcontextprotocol/sdk/server/mcp.js")) as any;
const server = new McpServer({ name: SERVER_NAME, version: "0.1.0" });

// Register echo tool with Zod input and output schemas
server.registerTool("echo", {
  description: "Echo text with ISO timestamp",
  inputSchema: { text: z.string() },
  outputSchema: EchoOutput
}, async (args: any) => {
  return await tracer.startActiveSpan("tool.echo", async (span: import("@opentelemetry/api").Span) => {
    try {
      const text: string = typeof args?.text === "string" ? args.text : String(args?.text ?? "");
      span.setAttribute("mcp.tool.name", "echo");
      span.setAttribute("mcp.tool.input.length", text?.length ?? 0);
      const out = { text, ts: new Date().toISOString() };
      if (!EchoOutputValidate(out)) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Echo output failed schema validation" });
        throw new Error("Echo output failed schema validation");
      }
      span.setAttribute("mcp.tool.success", true);
      return { structuredContent: out };
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message || String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
});

// Register health resource
server.resource("health", "res://health", async () => {
  const payload = { status: "ok", time: new Date().toISOString() };
  return {
    contents: [{ uri: "res://health", mimeType: "application/json", text: JSON.stringify(payload) }]
  };
});

// Register summarize prompt
server.prompt("summarize", z.object({ text: z.string() }), async ({ text }: { text: string }) => {
  return {
    description: "Summarize input text",
    messages: [
      { role: "user", content: { type: "text", text: `Summarize:\n${text}` } }
    ]
  };
});

// Start transport
const transportKind = process.env.MCP_TRANSPORT === "http" ? "http" : "stdio" as const;
if (transportKind === "stdio") {
  const { StdioServerTransport } = (await import("@modelcontextprotocol/sdk/server/stdio.js")) as any;
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Keep process alive via stdio
  // eslint-disable-next-line no-console
  console.log(`[MCP] ${SERVER_NAME} started with transport stdio`);
} else {
  const port = Number(process.env.PORT || 3000);
  const { StreamableHTTPServerTransport } = (await import("@modelcontextprotocol/sdk/server/streamableHttp.js")) as any;
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: false
  });
  await server.connect(transport);
  const httpServer = http.createServer(async (req, res) => {
    try {
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          let parsed: unknown = undefined;
          try { parsed = body ? JSON.parse(body) : undefined; } catch {}
          await transport.handleRequest(req, res, parsed);
        });
      } else {
        await transport.handleRequest(req, res);
      }
    } catch (err) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
  await new Promise<void>((resolve) => httpServer.listen(port, "0.0.0.0", () => resolve()));
  // eslint-disable-next-line no-console
  console.log(`[MCP] ${SERVER_NAME} started with transport http on :${port}`);
}
