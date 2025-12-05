// Minimal OpenTelemetry Node SDK bootstrap for the MCP server
import { OTLPTraceExporter as GrpcExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { NodeSDK } from "@opentelemetry/sdk-node";

const exporter = new GrpcExporter();
const sdk = new NodeSDK({ traceExporter: exporter });

try {
  const maybe = (sdk as any).start();
  if (maybe && typeof maybe.then === "function") {
    // Handle async start for older SDK typings
    (maybe as Promise<void>)
      .then(() => {
        // eslint-disable-next-line no-console
        console.log("[OTel] Tracing initialized (gRPC). Endpoint from OTEL_EXPORTER_OTLP_ENDPOINT if set.");
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("[OTel] failed to start", err);
      });
  } else {
    // eslint-disable-next-line no-console
    console.log("[OTel] Tracing initialized (gRPC). Endpoint from OTEL_EXPORTER_OTLP_ENDPOINT if set.");
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[OTel] failed to start", err);
}

process.on("SIGTERM", async () => {
  try {
    await sdk.shutdown();
  } finally {
    process.exit(0);
  }
});
