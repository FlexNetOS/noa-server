# MCP Final Assembly Plan

This plan composes the final deliverable from drop-in bundles and scaffolds, in a safe order where base layers land first and upgrades/overlays apply last. Later steps may overwrite earlier files by design (unzip -o).

Order and rationale:

1. mcp_stack_helm_skeleton.zip

   - Base: minimal TypeScript MCP server and Helm chart (mcp-stack). Also includes OTel Collector stub and TURN pool chart. Provides the foundation for all subsequent overlays.

2. mcp_control_plane_bundle.zip

   - Control-plane: SPIRE, Vault baseline, Nexus, CAS+FUSE, and Argo CD app-of-apps. Establishes identity, secrets, registry, and CAS mounts.

3. mcp_policy_identity_addon.zip

   - Policies and identity: Gatekeeper invariants (plan annotations, provider allowlist, residency, image-by-digest) and SPIRE registration CRs. Apply after Gatekeeper and SPIRE.

4. mcp_next_wiring_bundle.zip

   - Wiring upgrades: signed CloudEvents envelopes, SPIRE/mTLS for NATS, OPA gate on rollout, OpenFeature-driven traffic weights, WASM filters in the gateway path.

5. mcp_next_steps_bundle.zip

   - End-to-end scaffolds: Auto‑Plug Operator (APO), Agent Mesh (NATS), Graph store (Neo4j), adapters, safety/budget agents, WASM SDK, systemd units.

6. mcp_next_ops_bundle.zip

   - Operations: rollout-applier with webhook/GitOps modes, OTel tracecontext utils, JetStream retries + DLQ, OPA bundle.

7. model_gateway_ui_bundle.zip

   - Model gateway and minimal UI with Helm charts. Routes to OpenRouter/LiteLLM, Anthropic, or llama.cpp. Adds cost caps and basic stats.

8. model_gateway_ui_upgrade.zip

   - Upgrade: OTel GenAI spans, structured output coercion (Ajv), Realtime lane via WebRTC/TURN, UI expansions.

9. model_gateway_ui_upgrade2.zip
   - Upgrade: SSE streaming, per‑tenant token budgets, cost UI, trace links. Apply last to override prior UI/gateway files.

Optional — requires pulling from RTT bundle in the source tarball:

10. mcp_opt_shims_bundle.zip

- /usr/bin tool shims, ~/.mcp layout, and Gatekeeper plan-bins chart. Enables digest‑pinned CLI routing via /opt/mcp/<pkg>@<digest>.

Extraction policy:

- Always extract into mcp-final/ with overwrite enabled (unzip -o).
- If a bundle contains a top-level directory, preserve it. Charts are under mcp-final/charts, server code under mcp-final/mcp-server or as provided by bundles.
- Upgrades (steps 8–9) must run after the base gateway bundle (step 7).
- The optional shims bundle may be applied at any time after Gatekeeper is present; in clusters, enforce via its constraint template.

Post-assembly tasks:

- Populate container image references and secrets (Vault, External Secrets) per environment.
- Configure OTel Collector export endpoints.
- Wire SPIRE entries and Gatekeeper constraints.
- Verify NATS TLS, OPA URL, and OpenFeature providers.
