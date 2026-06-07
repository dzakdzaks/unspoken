import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Exported so the messages route can call forceFlush() before the
// serverless function exits — ensures traces are delivered to Langfuse.
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

export async function register() {
  // OTel Node SDK only runs in the Node.js runtime, not the edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  }).register();
}
