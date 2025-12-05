import { context, trace, propagation } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { W3CTraceContextPropagator } from "@opentelemetry/propagator-w3c";

export function init(serviceName:string){
  const provider = new NodeTracerProvider({ resource: new Resource({ "service.name": serviceName }) });
  const exporter = new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317" });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register({ propagator: new W3CTraceContextPropagator() });
  return trace.getTracer(serviceName);
}
export function injectToHeaders(h: Headers){
  propagation.inject(context.active(), h, { set: (c,k,v)=>h.set(k,v as string) });
}
export function extractFromHeaders(h: Headers){
  return propagation.extract(context.active(), h, { get: (c,k)=>h.getAll(k), keys: (c)=>Array.from(h.keys()) });
}
