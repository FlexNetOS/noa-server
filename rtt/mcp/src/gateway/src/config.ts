export type Provider = "openai_compatible" | "anthropic" | "llamacpp";
export interface Route { model: string; provider: Provider; endpoint: string; apiKeyEnv?: string; models?: string[]; weight?: number; costPer1kInput?: number; costPer1kOutput?: number; }
export interface Policy { tenants: Record<string, { allowModels: string[]; maxRequestUsd: number; maxOutputTokens: number; }>; }
export interface GatewayConfig { routes: Route[]; policy: Policy; defaultTenant: string; }
export const cfg: GatewayConfig = {
  routes: [
    { model: "chat-default", provider: "openai_compatible", endpoint: process.env.OPENAI_BASE || "https://openrouter.ai/api/v1", apiKeyEnv: "OPENROUTER_API_KEY", models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"], weight: 1, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
    { model: "chat-local", provider: "llamacpp", endpoint: process.env.LLAMA_CPP_BASE || "http://localhost:8081", models: ["gpt-4o-mini-compat"], weight: 1, costPer1kInput: 0.0, costPer1kOutput: 0.0 }
  ],
  policy: { tenants: { "public": { allowModels: ["chat-default","chat-local"], maxRequestUsd: 0.05, maxOutputTokens: 1000 } } },
  defaultTenant: "public"
};
