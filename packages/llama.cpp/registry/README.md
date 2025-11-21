# Llama.cpp SLLM Model Registry

A comprehensive model registry system for Small Language Models (SLLMs) designed
for efficient inference with llama.cpp. This registry provides a centralized
database for tracking, managing, and discovering SLLM models with detailed
metadata, capabilities, and performance metrics.

## 🚀 Features

- **SQLite Database**: Persistent storage with optimized queries and indexing
- **Model Metadata**: Comprehensive model information including parameters,
  quantization, capabilities
- **CSV Import/Export**: Easy bulk operations and data management
- **REST API**: Full HTTP API for model discovery and management
- **Performance Tracking**: Store and query model performance metrics
- **Tagging System**: Flexible categorization and filtering
- **Capability Mapping**: Track model capabilities (chat, code, reasoning, etc.)

## 📊 Current Model Collection

The registry currently contains **14 SLLM models** across multiple families:

### Model Families

- **Qwen** (5 models): From 0.6B to 30B parameters
- **Google/Gemma** (2 models): 270M and 4B variants
- **Microsoft/Phi** (1 model): 3.8B instruction-tuned
- **HuggingFace/SmolLM** (1 model): 3B efficient model
- **Meta/Llama** (1 model): 1B instruction-tuned
- **JanHQ** (1 model): 4B versatile model
- **TinyLlama** (1 model): 1.1B compact model
- **OpenThinker** (1 model): 7B reasoning-focused
- **Magistral** (1 model): Small multilingual model
- **ERNIE** (1 model): 21B Chinese reasoning model

### Size Distribution

- **Tiny** (< 1B): 3 models (21%)
- **Small** (1-5B): 6 models (43%)
- **Medium** (5-15B): 1 model (7%)
- **Large** (> 15B): 4 models (29%)

## 🏗️ Architecture

```
registry/
├── database/
│   ├── schema.sql          # SQLite database schema
│   └── models.db          # SQLite database file
├── csv/
│   ├── sllm_models.csv    # Model data in CSV format
│   └── exported_models.csv # Export destination
├── api/
│   ├── registry-manager.js # CLI management tool
│   └── server.js          # REST API server
└── package.json           # Dependencies and scripts
```

### Database Schema

- **`models`**: Core model information (name, family, size, parameters, etc.)
- **`model_capabilities`**: Model capabilities (chat, code, reasoning, etc.)
- **`model_tags`**: Flexible tagging system
- **`model_metadata`**: Key-value metadata storage
- **`performance_metrics`**: Performance tracking across hardware types
- **`model_summary`**: Pre-computed view for efficient queries

## 🚀 Quick Start

### Prerequisites

```bash
cd /home/deflex/noa-server/packages/llama.cpp/registry
npm install
```

### Import Models from CSV

```bash
npm run import
```

### Start API Server

```bash
npm start
# Server runs on http://localhost:3001
```

### CLI Operations

```bash
# List all models
npm run list

# Search models
npm run search "qwen"

# Export to CSV
npm run export

# Get models by family
npm run family "Qwen"
```

## 📡 API Endpoints

### Base URL: `http://localhost:3001`

#### GET `/api/models`

List/search models with optional filtering

- Query params: `search`, `family`, `limit`, `offset`

#### GET `/api/models/:id`

Get detailed information for a specific model

#### GET `/api/families`

List all available model families

#### GET `/api/capabilities`

List all model capabilities

#### GET `/api/tags`

List all model tags

#### GET `/api/stats`

Get registry statistics

#### GET `/health`

Health check endpoint

### Example API Usage

```bash
# Get all Qwen models
curl "http://localhost:3001/api/models?family=Qwen"

# Search for coding models
curl "http://localhost:3001/api/models?search=code"

# Get registry statistics
curl "http://localhost:3001/api/stats"
```

## 📋 Model Data Format

### CSV Format

```csv
name,display_name,model_family,model_size,parameters,quantization,file_format,capabilities,tags,description
qwen3-coder-30b-a3b-instruct-1m-gguf,Qwen3 Coder 30B A3B Instruct 1M,Qwen,30B,30.0,Q4_K_XL,GGUF,"chat,code,reasoning,math","coding,reasoning,large-model","Advanced coding model with 30B parameters"
```

### JSON API Response

```json
{
  "success": true,
  "data": {
    "id": 17,
    "name": "qwen3-coder-30b-a3b-instruct-1m-gguf",
    "display_name": "Qwen3 Coder 30B A3B Instruct 1M",
    "model_family": "Qwen",
    "model_size": "30B",
    "parameters": 30.0,
    "quantization": "Q4_K_XL",
    "file_format": "GGUF",
    "capabilities": "chat,code,reasoning,math",
    "tags": "coding,reasoning,large-model",
    "created_at": "2025-10-22T...",
    "updated_at": "2025-10-22T..."
  }
}
```

## 🔧 Development

### Adding New Models

1. **Update CSV**: Add new models to `csv/sllm_models.csv`
2. **Import Data**: Run `npm run import`
3. **Verify**: Check with `npm run list`

### Extending the Schema

1. **Modify Schema**: Update `database/schema.sql`
2. **Update Manager**: Modify `api/registry-manager.js` for new fields
3. **Reinitialize**: Delete `database/models.db` and re-import

### Performance Metrics

Track model performance across different hardware:

```javascript
// Example: Add performance data
const performanceData = {
  model_id: 17,
  hardware_type: 'cpu',
  metric_type: 'tokens_per_second',
  metric_value: 25.5,
  context_size: 4096,
};
```

## 📈 Use Cases

- **Model Selection**: Find optimal models for specific tasks
- **Capability Matching**: Identify models with required capabilities
- **Performance Comparison**: Compare models across hardware platforms
- **Inventory Management**: Track available models and versions
- **Integration Planning**: Plan model deployment in applications

## 🤝 Integration with Llama.cpp

This registry is designed to integrate seamlessly with llama.cpp workflows:

- **Model Discovery**: API-driven model selection
- **Metadata Access**: Rich model information for UI/UX
- **Performance Tracking**: Benchmark results storage
- **Capability Filtering**: Task-appropriate model selection

## 📄 License

MIT License - See llama.cpp project license for details.

## 🤝 Contributing

1. Fork the repository
2. Add new models to CSV or extend functionality
3. Test changes with existing models
4. Submit pull request

## 📞 Support

For issues related to:

- **Model Registry**: Check API documentation and CLI help
- **Llama.cpp Integration**: Refer to main llama.cpp documentation
- **Model Performance**: Use performance tracking features
