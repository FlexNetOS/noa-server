Models: llama.cpp load recipes and references

Quick setup (Homebrew on macOS)
- brew install llama.cpp
- If needed: brew tap ggml-org/tap && brew install ggml-org/tap/llama.cpp

General usage
- Local file: `llama-server -m /path/to/model.gguf --port 8080`
- From Hugging Face: `llama-server -hf owner/repo [-hff file.gguf]`
- Apple Silicon GPU offload: add `-ngl 99`; context window: `-c 8192`
- For gated/private repos, export `HF_TOKEN=...`

Model load commands (ready to copy)
- Gemma 3 4B IT (vision): `llama-server -hf ggml-org/gemma-3-4b-it-GGUF`
  - Specific quant: `-hff gemma-3-4b-it-Q4_K_M.gguf` (mmproj auto-handled)
- Gemma 3 270M IT: `llama-server -hf ggml-org/gemma-3-270m-it-GGUF -hff gemma-3-270m-it-Q8_0.gguf`
- Qwen2.5 VL 3B Instruct (vision): `llama-server -hf unsloth/Qwen2.5-VL-3B-Instruct-GGUF -hff Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf`
- Qwen3 VL 30B A3B Instruct (vision, large): `llama-server -hf yairpatch/Qwen3-VL-30B-A3B-Instruct-GGUF -hff Qwen3-VL-30B-A3B-Instruct-Q5_K_M.gguf`
- Qwen3 Coder 30B A3B 1M (large context): `llama-server -hf unsloth/Qwen3-Coder-30B-A3B-Instruct-1M-GGUF -hff Qwen3-Coder-30B-A3B-Instruct-1M-Q4_K_M.gguf -c 32768`
- OpenThinker3 7B: `llama-server -hf Mungert/OpenThinker3-7B-GGUF -hff OpenThinker3-7B-q4_k_m.gguf`
- Magistral Small 2.5B: `llama-server -hf unsloth/Magistral-Small-2509-GGUF -hff Magistral-Small-2509-Q4_K_M.gguf`
- ERNIE 4.5 21B (thinking, large): `llama-server -hf unsloth/ERNIE-4.5-21B-A3B-Thinking-GGUF -hff ERNIE-4.5-21B-A3B-Thinking-Q4_K_M.gguf`
- Phi-4 (mini/standard): `llama-server -hf bartowski/phi-4-GGUF -hff phi-4-Q4_K_M.gguf`
- SmolLM3 3B: `llama-server -hf ggml-org/SmolLM3-3B-GGUF -hff SmolLM3-Q4_K_M.gguf`
- Qwen3 0.6B: `llama-server -hf ggml-org/Qwen3-0.6B-GGUF -hff Qwen3-0.6B-Q8_0.gguf`
- Mixtral 8x7B Instruct (MoE, large): `llama-server -hf TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF -hff mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf`
- Llama 4 Scout 17B 16E (vision, large): `llama-server -hf ggml-org/Llama-4-Scout-17B-16E-Instruct-GGUF`
- Llama 3.2 3B Instruct: `llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF -hff Llama-3.2-3B-Instruct-Q4_K_M.gguf`
- Stable Code 3B: `llama-server -hf TheBloke/stable-code-3b-GGUF -hff stable-code-3b.Q4_K_M.gguf`
- Jan v1 4B: `llama-server -hf JanHQ/jan-v1-4b-GGUF -hff Jan-v1-4B-Q4_K_M.gguf`
- Granite 4.0 micro (IBM): `llama-server -hf ibm-granite/granite-4.0-micro-GGUF -hff granite-4.0-micro-Q4_K_M.gguf`
- Falcon H1 0.5B Instruct: `llama-server -hf tiiuae/Falcon-H1-0.5B-Instruct-GGUF -hff Falcon-H1-0.5B-Instruct-Q8_0.gguf`
- LFM2‑350M (Liquid AI): `llama-server -hf LiquidAI/LFM2-350M-GGUF -hff LFM2-350M-Q4_K_M.gguf`

Additional references and notes
- Qwen2 (0.5B–1B variants): try `bartowski/Qwen2-0.5B-Instruct-GGUF` or search for the specific size’s GGUF quant.
- Llama 3.1 8B (Meta): use `bartowski/Meta-Llama-3.1-8B-Instruct-GGUF` and pick a `Q4_K_M`/`Q5_K_M` file.
- Mistral Nemo 12B: GGUF repos exist but may be gated (e.g., TheBloke/bartowski). Use `HF_TOKEN` and pick a `Q4_K_M` file if accessible.
- DeepSeek-Coder-V2 Instruct: available via `bartowski/DeepSeek-Coder-V2-Instruct-GGUF`; many are sharded. Prefer local download then `-m /local/path/*.gguf`.
- Qwen3 4B Instruct: may be gated; look for community quant repos providing GGUF. If unavailable, pick close alternatives above.

Not yet GGUF (or unsupported directly in llama.cpp)
- OpenELM (Apple, 270M–3B): no widely published GGUF at time of writing.
- Granite‑Docling‑258M (IBM): prefer Granite 4.0 micro GGUF above.
- Phi‑4‑Mini‑Flash‑Reasoning: no official GGUF release located; use `bartowski/phi-4-GGUF` instead.
- Nemotron‑Nano‑9B‑v2 (NVIDIA): GGUF not published; requires conversion before use.
- Octopus‑v2 (NexaAI): no GGUF found.
- StableLM base alpha 3B: no GGUF found; see Stable Code 3B alternative.
- Tiny‑Agent‑a‑3B: no GGUF found.
- Llama‑4‑Maverick‑17B‑128E‑Instruct‑FP8: FP8 safetensors (not GGUF) → not loadable in llama.cpp without conversion.
- Mistral‑Small‑3.2‑24B‑Instruct‑2506 (unsloth): GGUF not available in repo.

Tips
- Default quant pick: `Q4_K_M` for a good quality/speed balance; tiny models often run best with `Q8_0`.
- For vision models from `ggml-org/*-GGUF`, the multimodal projector is bundled and auto‑handled when using `-hf`.
- For large models (≥17B), ensure sufficient RAM/VRAM and consider `-c 8192` and `-ngl 99` (Apple Silicon).

Fleet launcher (optional)
- A helper script is provided: `noa-server/models/launch_llama_servers.sh`
  - Start a subset: `SKIP_BIG=1 ONLY=gemma3_4bit,smollm3_3b,stable_code_3b ./launch_llama_servers.sh start`
  - Status/Stop: `./launch_llama_servers.sh status|stop`

Source links (for convenience)
- SmolLM3 3B (base): https://huggingface.co/HuggingFaceTB/SmolLM3-3B
- Llama 3.2 3B (base): https://huggingface.co/meta-llama/Llama-3.2-3B
- Stable Code 3B: https://huggingface.co/stabilityai/stable-code-3b
- Qwen2.5 VL 3B GGUF: https://huggingface.co/unsloth/Qwen2.5-VL-3B-Instruct-GGUF
- IBM Granite 4.0 micro GGUF: https://huggingface.co/ibm-granite/granite-4.0-micro
- Qwen3 VL 30B A3B Instruct GGUF: https://huggingface.co/yairpatch/Qwen3-VL-30B-A3B-Instruct-GGUF
- Qwen3 Coder 30B A3B 1M GGUF: https://huggingface.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-1M-GGUF
- OpenThinker3 7B GGUF: https://huggingface.co/Mungert/OpenThinker3-7B-GGUF
- Magistral Small 2509 GGUF: https://huggingface.co/unsloth/Magistral-Small-2509-GGUF
- ERNIE‑4.5‑21B A3B Thinking GGUF: https://huggingface.co/unsloth/ERNIE-4.5-21B-A3B-Thinking-GGUF
- Llama 4 Scout GGUF: https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct
