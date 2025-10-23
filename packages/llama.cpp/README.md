# llama.cpp Neural Processing Layer

This package implements the neural processing layer for the Claude Suite using llama.cpp, providing GGUF model support, CUDA acceleration (when available), and unified APIs for model loading and inference.

## Architecture

```
packages/llama.cpp/
├── build/                    # CMake build artifacts
│   └── bin/                  # Compiled executables (llama-cli, etc.)
├── shims/                    # API abstraction layer
│   ├── gguf_loader.sh        # Bash shim for model loading and inference
│   └── http_bridge.py        # Python HTTP API bridge
├── models/                   # GGUF model files (not included)
├── test_neural_layer.sh      # Test suite
└── README.md                 # This file
```

## Features

- **GGUF Model Support**: Native support for GGUF format models
- **CUDA Acceleration**: GPU acceleration with unified memory support (CUDA 13.0+)
- **CPU Fallback**: OpenMP-accelerated CPU inference
- **Unified Memory**: Automatic CUDA Virtual Memory Management (VMM) for large models
- **Unified APIs**: Chat, streaming, and benchmarking interfaces
- **HTTP Bridge**: REST API for web integration
- **Environment Configuration**: Flexible model selection via environment variables

## Quick Start

### Prerequisites

- Linux/macOS/Windows (WSL2 recommended)
- CMake 3.16+
- C++ compiler (GCC/Clang/MSVC)
- Python 3.7+ (for HTTP bridge)
- **CUDA 13.0+** (optional, for GPU acceleration with unified memory)
- OpenMP support (usually included with GCC)

### Build

#### CPU-only Build (Default)

```bash
# Clone and build llama.cpp
cd packages/llama.cpp
git clone https://github.com/ggerganov/llama.cpp.git source
cd source
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

#### CUDA Build with Unified Memory

```bash
# Ensure CUDA 13.0+ is installed and in PATH
export CUDA_HOME=/usr/local/cuda-13.0
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH

# Build with CUDA support
cd packages/llama.cpp/source
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES="75;80;86;89;90"
make -j$(nproc)
```

### Environment Setup

```bash
# Set model path (optional)
export LLM_MODEL_PATH="/path/to/your/models"

# Enable CUDA (if GPU available)
export LLAMA_CUDA=true
export LLAMA_CUDA_DEVICE_COUNT=1

# Add to your shell profile for persistence
echo 'export LLM_MODEL_PATH="/path/to/models"' >> ~/.bashrc
echo 'export LLAMA_CUDA=true' >> ~/.bashrc
```

### Basic Usage

#### Command Line Interface

```bash
# Chat completion
./shims/gguf_loader.sh chat "Hello, how are you?" /path/to/model.gguf

# Streaming chat
./shims/gguf_loader.sh stream "Tell me a story" /path/to/model.gguf

# Benchmark model
./shims/gguf_loader.sh benchmark /path/to/model.gguf "Test prompt" 128
```

#### Python HTTP API

```bash
# Install Flask (optional)
pip install flask

# Start HTTP server
python3 shims/http_bridge.py serve --host 0.0.0.0 --port 8081

# Or use CLI
python3 shims/http_bridge.py chat --prompt "Hello world"
python3 shims/http_bridge.py info
```

#### HTTP API Endpoints

```bash
# Health check
GET /health

# Chat completion
POST /chat
{
  "prompt": "Hello, how are you?",
  "model_path": "/path/to/model.gguf",
  "context_size": 4096,
  "temperature": 0.8,
  "max_tokens": 256
}

# Streaming chat
POST /chat/stream
{
  "prompt": "Tell me a story",
  "model_path": "/path/to/model.gguf"
}

# Benchmark
POST /benchmark
{
  "model_path": "/path/to/model.gguf",
  "prompt": "Hello",
  "n_predict": 128
}

# Validate model
POST /validate
{
  "model_path": "/path/to/model.gguf"
}

# System info
GET /info
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_MODEL_PATH` | Default path to GGUF models | None |
| `LLAMA_CUDA` | Enable CUDA acceleration | `false` |
| `LLAMA_CUDA_DEVICE_COUNT` | Number of CUDA devices | Auto-detect |
| `LLAMA_CUDA_DEVICE` | CUDA device ID | `0` |
| `LLAMA_CUDA_NO_VMM` | Disable unified memory (VMM) | `false` (enabled) |
| `LLAMA_CUDA_VMM_MAX_SIZE` | Maximum VMM pool size (bytes) | `1073741824` (1GB) |

### Model Requirements

- **Format**: GGUF (recommended)
- **Quantization**: Any supported quantization (Q4_K_M, Q5_K_M, etc.)
- **Size**: Depends on available RAM/VRAM
- **Architecture**: LLaMA, LLaMA 2, Code Llama, etc.

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
./test_neural_layer.sh

# Run specific test categories
./test_neural_layer.sh env      # Environment validation
./test_neural_layer.sh model    # Model validation
./test_neural_layer.sh chat     # Chat API tests
./test_neural_layer.sh http     # HTTP bridge tests
./test_neural_layer.sh cuda     # CUDA configuration
./test_neural_layer.sh path     # Model path configuration
./test_neural_layer.sh perf     # Performance tests
```

## Performance Optimization

### CPU Optimization

- Use latest GCC with OpenMP support
- Set thread count: `export OMP_NUM_THREADS=$(nproc)`
- Use AVX2/AVX-512 capable CPU for best performance

### GPU Optimization (CUDA)

```bash
# Enable CUDA
export LLAMA_CUDA=true

# Multi-GPU setup
export LLAMA_CUDA_DEVICE_COUNT=2
export LLAMA_CUDA_DEVICE=0,1

# Unified Memory configuration (enabled by default)
export LLAMA_CUDA_NO_VMM=false  # Enable unified memory
export LLAMA_CUDA_VMM_MAX_SIZE=2147483648  # 2GB VMM pool

# Memory optimization
export LLAMA_CUDA_FORCE_MMQ=true  # Force memory-mapped quantization
```

### Model Selection

- **Small models** (<7B): Q4_K_M quantization, fast inference
- **Medium models** (7B-13B): Q4_K_M or Q5_K_M, balance speed/quality
- **Large models** (13B+): Q3_K_L or lower, slower but manageable

## Troubleshooting

### Common Issues

1. **"llama-cli not found"**
   - Ensure build completed successfully
   - Check `build/bin/` directory exists

2. **"Model file not found"**
   - Verify `LLM_MODEL_PATH` is set correctly
   - Check file permissions

3. **CUDA not working**
   - Verify NVIDIA drivers installed (CUDA 13.0+ compatible)
   - Check `nvidia-smi` output
   - Ensure CUDA toolkit 13.0+ is in PATH
   - Unified memory requires CUDA 13.0+ with VMM support

4. **Out of memory**
   - Reduce context size (`--ctx-size 2048`)
   - Use smaller model or higher quantization
   - Enable memory mapping (`--mlock 0`)
   - Adjust VMM pool size: `export LLAMA_CUDA_VMM_MAX_SIZE=536870912` (512MB)

### Debug Mode

Enable verbose logging:

```bash
export LLAMA_LOG_LEVEL=debug
export LLAMA_LOG_FILE=/tmp/llama.log
```

## Claude Code Integration

This package includes full **Model Context Protocol (MCP)** integration with Claude Code, enabling seamless access to neural processing capabilities directly within Claude Code's chat interface.

### MCP Architecture

```
┌─────────────────┐    MCP Protocol    ┌──────────────────────┐
│   Claude Code   │◄─────────────────►│  llama.cpp MCP Server │
│                 │                   │                      │
│ • Chat Interface│                   │ • http_bridge.py     │
│ • Tool Execution│                   │ • LlamaMCPServer     │
│ • Code Editing  │                   │ • LlamaBridge        │
└─────────────────┘                   └──────────────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │   llama.cpp Core     │
                                   │                      │
                                   │ • llama-cli binary   │
                                   │ • GGUF model support │
                                   │ • CUDA acceleration  │
                                   │ • gguf_loader.sh     │
                                   └──────────────────────┘
```

### MCP Server Setup

The MCP server is automatically configured when Claude Code detects the `.mcp.json` file in the project directory.

#### MCP Prerequisites

- **Claude Code**: `npm install -g @anthropic-ai/claude-code`
- **MCP Library**: `pip install mcp` (in virtual environment)
- **Authentication**: Run `claude setup-token` to authenticate

#### MCP Configuration

The `.mcp.json` file configures the neural processing MCP server:

```json
{
  "mcpServers": {
    "neural-processing": {
      "command": "/home/deflex/praisonai_env/bin/python3",
      "args": ["/home/deflex/noa-server/packages/llama.cpp/shims/http_bridge.py", "mcp"],
      "env": {
        "LLAMA_CPP_DIR": "/home/deflex/noa-server/packages/llama.cpp",
        "LLM_MODEL_PATH": "/home/deflex/noa-server/packages/llama.cpp/models",
        "LLAMA_CUDA": "true",
        "LLAMA_CUDA_NO_VMM": "false",
        "LLAMA_CUDA_VMM_MAX_SIZE": "1073741824"
      }
    }
  }
}
```

#### MCP Verification

Check MCP server status:

```bash
# From llama.cpp directory
claude mcp list

# Expected output:
# neural-processing: /home/deflex/praisonai_env/bin/python3 ... - ✓ Connected
```

### Available MCP Tools

Claude Code can access 6 neural processing tools through MCP:

#### 1. Chat Completion (`chat_completion`)

Generate text responses using llama.cpp models.

**Parameters:**

- `prompt` (required): Input text prompt
- `model_path` (optional): Path to GGUF model file
- `context_size` (optional): Context window size (default: 4096)
- `temperature` (optional): Sampling temperature (default: 0.8)
- `max_tokens` (optional): Maximum tokens to generate (default: 256)

**Example:**

```bash
claude --print "Generate a chat completion for: 'Explain quantum computing in simple terms'"
```

#### 2. Streaming Chat (`stream_chat`)

Generate real-time streaming chat responses.

**Parameters:**

- `prompt` (required): Input text prompt
- `model_path` (optional): Path to GGUF model file
- `context_size` (optional): Context window size (default: 4096)
- `temperature` (optional): Sampling temperature (default: 0.8)

**Example:**

```bash
claude --print "Start a streaming chat about machine learning"
```

#### 3. Model Benchmarking (`benchmark_model`)

Test model performance and inference speed.

**Parameters:**

- `model_path` (optional): Path to GGUF model file
- `prompt` (optional): Test prompt (default: "Hello, how are you?")
- `n_predict` (optional): Number of tokens to predict (default: 128)

**Example:**

```bash
claude --print "Benchmark the performance of the llama-7b model"
```

#### 4. Model Validation (`validate_model`)

Verify GGUF model file integrity.

**Parameters:**

- `model_path` (required): Path to GGUF model file

**Example:**

```bash
claude --print "Validate the integrity of /path/to/model.gguf"
```

#### 5. System Information (`get_system_info`)

Get neural processing system configuration.

**Parameters:** None

**Example:**

```bash
claude --print "Get neural processing system information"
```

#### 6. List Models (`list_available_models`)

Browse available GGUF models in the models directory.

**Parameters:** None

**Example:**

```bash
claude --print "List all available GGUF models"
```

### Usage Examples

#### Basic Chat Interaction

```bash
# Start Claude Code in the llama.cpp directory
cd /home/deflex/noa-server/packages/llama.cpp
claude

# In Claude Code chat:
# "Generate a creative story about AI"
# "What neural processing tools are available?"
# "Benchmark model performance with CUDA"
```

#### Advanced Workflows

```bash
# Model validation workflow
claude --print "First validate this model file, then benchmark its performance"

# Multi-step analysis
claude --print "Get system info, list available models, then suggest the best model for coding tasks"
```

#### Development Integration

```bash
# Code generation with AI assistance
claude --print "Generate Python code for a neural network, then validate it works"

# Documentation assistance
claude --print "Explain how CUDA acceleration works in llama.cpp"
```

### MCP Server Implementation

The MCP server is implemented in `shims/http_bridge.py` with the `LlamaMCPServer` class:

- **Async Communication**: Uses stdio protocol for MCP communication
- **Tool Registration**: Dynamically registers neural processing tools
- **Error Handling**: Comprehensive error handling with structured responses
- **Resource Management**: Proper cleanup and connection management

### Security & Permissions

- **Permission Model**: Claude Code requires explicit permission for MCP tool access
- **Sandboxing**: Neural processing runs in isolated Python environment
- **File Access**: Restricted to configured model directories
- **Resource Limits**: Configurable timeouts and memory constraints

### MCP Troubleshooting

#### MCP Common Issues

1. **"MCP server not connected"**

   ```bash
   # Check server status
   claude mcp list

   # Restart MCP server
   claude mcp remove neural-processing
   claude mcp add-json neural-processing <config>
   ```

2. **"Permission denied for MCP tools"**

   ```bash
   # Grant permissions (may require interactive session)
   claude --dangerously-skip-permissions --print "test"
   ```

3. **"MCP library not found"**

   ```bash
   # Install MCP in virtual environment
   source praisonai_env/bin/activate
   pip install mcp
   ```

4. **CUDA not working in MCP**
   - Ensure `LLAMA_CUDA=true` in MCP server environment
   - Verify CUDA installation: `nvidia-smi`
   - Check VMM configuration

#### MCP Debug Mode

Enable MCP debugging:

```bash
# Enable debug logging
claude --debug mcp --print "test neural processing"

# Check MCP server logs
tail -f ~/.cache/claude-cli-nodejs/*/mcp-logs-*/
```

### Integration Benefits

1. **Seamless AI Assistance**: Neural processing available directly in chat
2. **Local Processing**: No external API dependencies
3. **GPU Acceleration**: CUDA support for fast inference
4. **Model Flexibility**: Support for any GGUF-quantized model
5. **Tool Integration**: Neural capabilities as Claude Code tools
6. **Extensible**: Easy to add new neural processing features

### Future Enhancements

- **Multi-Model Support**: Concurrent model loading
- **Advanced Sampling**: More sophisticated generation parameters
- **Model Fine-tuning**: Integration with training workflows
- **Batch Processing**: Parallel inference capabilities
- **Custom Tool Development**: User-defined neural processing tools

## Security Considerations

- Model files can be large; ensure adequate disk space
- HTTP API should be protected in production
- Validate model paths to prevent directory traversal
- Consider rate limiting for public APIs

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test with multiple model types

## License

This implementation uses llama.cpp (MIT License) and follows the Claude Suite licensing terms.
