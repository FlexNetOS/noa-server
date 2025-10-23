-- Model Registry Database Schema for llama.cpp SLLM Registry
-- This database stores information about Small Language Models (SLLMs) for efficient inference

-- Models table: Core model information
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    model_family TEXT NOT NULL, -- e.g., 'Qwen', 'Gemma', 'Phi', 'SmolLM', etc.
    model_size TEXT NOT NULL, -- e.g., '0.6B', '1.1B', '3B', '3.8B', '4B'
    parameters REAL, -- Number of parameters in billions
    quantization TEXT, -- e.g., 'Q4_K_M', 'Q4_K_XL', 'GGUF', etc.
    file_format TEXT DEFAULT 'GGUF',
    file_path TEXT, -- Path to model file
    hash_sha256 TEXT, -- SHA256 hash for verification
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Model capabilities and features
CREATE TABLE IF NOT EXISTS model_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    capability TEXT NOT NULL, -- e.g., 'chat', 'code', 'math', 'reasoning', 'multilingual'
    capability_level TEXT DEFAULT 'basic', -- 'basic', 'intermediate', 'advanced'
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    hardware_type TEXT NOT NULL, -- 'cpu', 'gpu', 'vulkan', 'metal'
    metric_type TEXT NOT NULL, -- 'tokens_per_second', 'memory_usage', 'load_time'
    metric_value REAL NOT NULL,
    metric_unit TEXT, -- 'tokens/s', 'MB', 'seconds', etc.
    context_size INTEGER, -- Context window size used for measurement
    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- Model metadata (key-value pairs for extensibility)
CREATE TABLE IF NOT EXISTS model_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE(model_id, meta_key)
);

-- Tags for categorization and filtering
CREATE TABLE IF NOT EXISTS model_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE(model_id, tag)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_models_family ON models(model_family);
CREATE INDEX IF NOT EXISTS idx_models_size ON models(model_size);
CREATE INDEX IF NOT EXISTS idx_models_parameters ON models(parameters);
CREATE INDEX IF NOT EXISTS idx_capabilities_model ON model_capabilities(model_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_type ON model_capabilities(capability);
CREATE INDEX IF NOT EXISTS idx_performance_model ON performance_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_performance_hardware ON performance_metrics(hardware_type);
CREATE INDEX IF NOT EXISTS idx_metadata_model ON model_metadata(model_id);
CREATE INDEX IF NOT EXISTS idx_tags_model ON model_tags(model_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON model_tags(tag);

-- Views for common queries
CREATE VIEW IF NOT EXISTS model_summary AS
SELECT
    m.id,
    m.name,
    m.display_name,
    m.model_family,
    m.model_size,
    m.parameters,
    m.quantization,
    m.file_format,
    GROUP_CONCAT(DISTINCT mc.capability) as capabilities,
    GROUP_CONCAT(DISTINCT mt.tag) as tags,
    m.created_at,
    m.updated_at
FROM models m
LEFT JOIN model_capabilities mc ON m.id = mc.model_id
LEFT JOIN model_tags mt ON m.id = mt.model_id
GROUP BY m.id;

-- View for model performance summary
CREATE VIEW IF NOT EXISTS model_performance_summary AS
SELECT
    m.name,
    m.model_family,
    m.model_size,
    pm.hardware_type,
    AVG(CASE WHEN pm.metric_type = 'tokens_per_second' THEN pm.metric_value END) as avg_tokens_per_sec,
    AVG(CASE WHEN pm.metric_type = 'memory_usage' THEN pm.metric_value END) as avg_memory_mb,
    AVG(CASE WHEN pm.metric_type = 'load_time' THEN pm.metric_value END) as avg_load_time_sec,
    COUNT(pm.id) as measurement_count
FROM models m
LEFT JOIN performance_metrics pm ON m.id = pm.model_id
GROUP BY m.id, pm.hardware_type;
