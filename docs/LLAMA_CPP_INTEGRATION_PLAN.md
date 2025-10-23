# Llama.cpp Integration Plan (Alternative/Replacement for Claude Code)

Last updated: 2025-10-22 Owner: Platform AI Integrations Scope: noa-server
monorepo + developer workstation (Claude Code)

---

## 1) Goal and Success Criteria

Enable local llama.cpp to be used everywhere we currently use Claude (Anthropic)
for code/chat — as a drop‑in alternative that can be toggled per environment,
with clear capability fallbacks and no breakage.

Success criteria:

- Feature flag to switch default provider between Claude and Llama.cpp without
  code changes.
- Chat completions and streaming work end-to-end through existing abstractions.
- Clear capability-aware fallback (e.g., embeddings or tools gracefully
  handled).
- Developer workflow: Claude Code can drive local llama.cpp via MCP with
  documented steps.
- CI smoke test validates provider health and a minimal completion.

---

## 2) Architecture Overview

Two complementary paths are supported:

- Server-side provider alternative (for services):
  - Use `@noa/ai-provider` package with `LlamaCppProvider` (already present at
    `noa-server/packages/ai-provider/src/providers/llama-cpp.ts`).
  - Select provider via config/env and route all chat/stream calls through the
    provider factory.

- Editor-side alternative (for developers using Claude Code):
  - Use the existing MCP bridge in `packages/llama.cpp` to let Claude Code talk
    to llama.cpp locally.
  - This does not impact server code paths; it enhances local dev ergonomics.

Diagram:

```text
[UI/CLI/Service] -> ProviderFactory -> (Claude | OpenAI | Llama.cpp)
                                     \
                                      -> llama.cpp server (/completion, stream)

[Claude Code] -> MCP -> llama.cpp bridge -> llama.cpp
```

---

## 3) Current State Inventory

- Provider layer
  - `@noa/ai-provider` already includes:
    - `BaseProvider` contract
    - `ClaudeProvider`, `OpenAIProvider`, and `LlamaCppProvider`
    - Factory + configuration manager
  - Llama.cpp endpoints used: `/completion` with `stream: false|true`, plus
    `/props`/`/slots` for discovery
  - Embeddings explicitly not supported by Llama provider (throws)

- Dev tooling (Claude Code)
  - `packages/llama.cpp/CLAUDE_CODE_MCP_INTEGRATION.md` with working MCP setup
    via `shims/http_bridge.py`
  - `.mcp.json` embedded in `packages/llama.cpp`

- Config
  - Defaults for `LLAMA_CPP` in `DEFAULT_PROVIDER_CONFIGS` (baseURL
    <http://localhost:8080>)
  - Environment loader builds keys from provider type string; note:
    `ProviderType.LLAMA_CPP` value is "llama.cpp" (dot in name) which can break
    env var names

---

## 4) Design: How we connect Llama.cpp as an alternative

### 4.1 Provider selection and config

- Single source of truth: `@noa/ai-provider` ConfigurationManager
- Add env + file config entries so we can declare providers and set default:

Example `ai-config.json` (already documented in `@noa/ai-provider/README.md`):

```json
{
  "providers": [
    {
      "type": "claude",
      "apiKey": "${CLAUDE_API_KEY}",
      "defaultModel": "claude-3-sonnet-20240229"
    },
    {
      "type": "llama.cpp",
      "baseURL": "http://localhost:8080",
      "defaultModel": "llama-2-7b"
    }
  ],
  "defaultProvider": "llama.cpp"
}
```

Environment variable support (proposed mapping):

- `AI_DEFAULT_PROVIDER=llama.cpp`
- `AI_LLAMA_CPP_BASE_URL=http://localhost:8080`
- `AI_LLAMA_CPP_DEFAULT_MODEL=llama-2-7b`
- `AI_CLAUDE_API_KEY=...`

Implementation detail: sanitize provider type to env key

- Fix needed: map `llama.cpp` -> `LLAMA_CPP` when building env var names (see
  Task T2 below).

### 4.2 Capability-aware routing

- Keep a single call path via ProviderFactory.
- On each request, prefer the configured default provider.
- If a capability isn’t supported (e.g., embeddings on llama.cpp), either:
  - Return a structured error that the caller can use to retry with a different
    provider, or
  - Introduce an optional fallback chain (e.g., `LLAMA_CPP -> OPENAI`) for
    specific capability classes.

### 4.3 Streaming and formats

- Llama.cpp streaming parser is in place (`llama-cpp.ts`) reading `data:` SSE
  lines.
- Hardening: Also accept plain JSON line mode some server builds emit (see Task
  T4).
- JSON mode/tool calls: not reliably supported by llama.cpp; callers must not
  assume Claude-level tools. If `response_format: { type: 'json_object' }` is
  requested, we can optionally apply GBNF grammar (Task T5).

### 4.4 Developer workflow with Claude Code (MCP)

- Keep the existing MCP integration for editor use:
  - `cd noa-server/packages/llama.cpp && claude` (see SOP &
    `CLAUDE_CODE_MCP_INTEGRATION.md`)
  - This path is independent from server provider selection.

---

## 5) Implementation Tasks

T1. Wire default selection to Llama.cpp (no code change if using file config)

- Add/commit an example `ai-config.json` under `noa-server/config/` (optional)
  and load it in services.
- Or set env vars (see 4.1) in dev and CI.

T2. Fix env var name generation for `llama.cpp`

- In `packages/ai-provider/src/utils/config.ts` sanitize provider names to env
  keys: `toUpperCase().replace(/[^A-Z0-9]+/g, '_')`.
- Example: `llama.cpp` -> `LLAMA_CPP` so keys like `AI_LLAMA_CPP_BASE_URL` work.

T3. Ensure all call sites use ProviderFactory

- Audit services that perform LLM calls and replace direct SDK usage with
  `@noa/ai-provider`.
- If a service uses `claude-flow` incompatible abstractions, adapt it to the new
  provider façade.

T4. Harden llama.cpp streaming

- Update `LlamaCppProvider.createChatCompletionStream` to handle both SSE
  (`data:`) and plain NDJSON lines.
- Add defensive parsing and backpressure control.

T5. Optional: JSON mode via grammar (GBNF)

- If `config.response_format?.type === 'json_object'`, allow passing a JSON
  grammar to llama.cpp server (when supported) via request `grammar`.
- Extend `LlamaCppCompletionRequest` and mapping method to include `grammar`.
- Expose a `GenerationConfig.additionalOptions?.grammar` escape hatch in the
  interim.

T6. Optional: capability fallback

- Introduce an orchestrator helper: try preferred provider first; on
  `UNSUPPORTED_CAPABILITY`, fall back to next configured provider.
- Keep this opt-in per service to avoid surprising cost jumps.

T7. Tests + health checks

- Add provider smoke tests for llama.cpp (see Section 7) and integrate into CI
  `neural:test` and `bench` steps already present.

---

## 6) Config and Feature Flags

- Default provider: `AI_DEFAULT_PROVIDER` or `ai-config.json: defaultProvider`.
- Llama.cpp base URL: `AI_LLAMA_CPP_BASE_URL` (after T2 fix).
- Per-request overrides remain possible by passing `model` and config.
- Feature toggles in callers:
  - `requiresEmbeddings`: skip llama.cpp or fall back to OpenAI.
  - `requiresTools/JSONMode`: prefer Claude/OpenAI if strict tool calling is
    required; else best-effort via grammar.

---

## 7) Testing and Validation

Unit tests (ai-provider):

- Llama config mapping (top_k/top_p/stop/max_tokens)
- Streaming parser: SSE lines, NDJSON fallback, malformed chunk resilience
- Capability guard: `createEmbedding` throws `UNSUPPORTED_CAPABILITY`

Integration tests:

- Health check against running llama.cpp: `/props` or a single-token completion
- Non-stream and stream chat roundtrip with a tiny prompt
- Capability fallback path (if T6 implemented)

Benchmarks (optional, local):

- Reuse `scripts/tasks/bench.sh` and `packages/llama.cpp/test_neural_layer.sh`

CI wiring:

- Add a “neural smoke” job that hits a mocked/local llama.cpp (or guard by env
  to skip if unavailable) and exercises provider health.

Manual validation (Linux):

```bash
# Start llama.cpp server (example; adjust to your binary flags)
./llama-cli --server --port 8080 --model ./models/llama-7b-q4.gguf --ctx-size 4096 --n-gpu-layers 33

# Verify health
curl -s http://localhost:8080/health || curl -s http://localhost:8080/props

# Run a quick provider check via a small script (uses @noa/ai-provider)
node -e "(async () => { const {createProvider,ProviderType}=require('./packages/ai-provider/dist'); const p=createProvider({type:ProviderType.LLAMA_CPP, baseURL:'http://localhost:8080', defaultModel:'llama-2-7b'}); const r=await p.createChatCompletion({model:'llama-2-7b', messages:[{role:'user', content:'Say hi'}]}); console.log(r.choices[0].message.content) })()"
```

---

## 8) Risks, Limitations, and Mitigations

- Embeddings: not supported by current llama.cpp endpoint → return
  `UNSUPPORTED_CAPABILITY`; callers may fall back.
- Tools/function calling: model- and server-flag-dependent; treat as best-effort
  with explicit opt-in; keep Claude as primary for advanced tool flows.
- JSON mode: enforce via grammar is not always perfect; consider using
  Claude/OpenAI for strict JSON protocols.
- Env var name bug: must fix (T2) to avoid confusion when configuring via
  environment.
- Streaming formats: different server builds emit SSE or NDJSON → harden parser
  (T4).
- Performance variance: ensure CUDA/VMM flags are documented; provide reasonable
  defaults.

---

## 9) Developer (Claude Code) Workflow via MCP

- See `noa-server/packages/llama.cpp/CLAUDE_CODE_MCP_INTEGRATION.md` and
  `sop.md`.

- Quick start:

```bash
cd ~/noa-server/packages/llama.cpp
# Activate env if needed (praisonai_env)
claude --dangerously-skip-permissions
claude mcp list  # expect neural-processing connected
```

- Available tools: chat_completion, stream_chat, benchmark_model,
  validate_model, get_system_info, list_available_models

This path is additive; it doesn’t change server code.

---

## 10) Rollout Plan

- Phase 0 (Today):
  - Adopt `@noa/ai-provider` everywhere (if any direct SDK use remains) and
    enable `LLAMA_CPP` configuration locally.
  - Fix env name mapping (T2).

- Phase 1: Smoke and streaming tests
  - Add unit + integration tests; wire a small “neural smoke” CI job.
  - Document developer instructions (this doc) in repo.

- Phase 2: Capability fallbacks (optional)
  - For endpoints that need embeddings/tools/JSON mode, add per-feature
    fallbacks or keep Claude as primary for those paths.

- Phase 3: UI affordances (optional)
  - In `packages/ui-dashboard`, add provider selector (Claude / Llama.cpp)
    visible in dev builds.

---

## 11) Concrete Changes (File-level)

- ai-provider (already present)
  - `src/utils/config.ts` → sanitize env key names (T2)
  - `src/providers/llama-cpp.ts` →
    - Stream parser hardening (T4)
    - Optional JSON mode grammar param support (T5)

- Services using LLMs
  - Replace direct SDKs with `@noa/ai-provider` factory calls (T3)
  - Read provider config from env/file

- Docs
  - This plan at `docs/LLAMA_CPP_INTEGRATION_PLAN.md`
  - Link from `packages/ai-provider/README.md` optional

---

## 12) Acceptance Checklist

- [ ] `AI_DEFAULT_PROVIDER=llama.cpp` yields working chat and streaming locally
- [ ] Unsupported capability error path is predictable and logged
- [ ] Streaming resilient to both SSE `data:` and NDJSON lines
- [ ] Dev MCP path works with Claude Code (doc verified)
- [ ] Minimal CI smoke indicates provider healthy or cleanly skipped

---

## 13) Appendix: Minimal calling contract

Inputs:

- Messages: array of
  `{ role: 'system'|'user'|'assistant'|'function', content: string | content[] }`
- Model id: string matching provider’s `getModels()` entry
- Config: `{ temperature, top_p, top_k, max_tokens, stop, response_format? }`

Outputs:

- `GenerationResponse` with `choices[0].message.content`, `usage`, `provider`
- Streaming: `StreamingChunk` with `choices[0].delta.content`

Error modes:

- Auth/config errors (Claude/OpenAI)
- `UNSUPPORTED_CAPABILITY` (llama.cpp embeddings)
- Timeouts/retries (provider base)

---

## 14) Next Steps (Ticket Seeds)

- T2: Env key sanitation for `llama.cpp` in `config.ts`
- T4: Streaming parser hardening for llama.cpp provider
- T5: Optional JSON grammar support in llama.cpp provider
- SVC: Audit and migrate all LLM call sites to `@noa/ai-provider`
- UI: Add provider selector in `ui-dashboard` (dev only)
