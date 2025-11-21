#!/usr/bin/env node

/**
 * Llama.cpp SLLM Registry API Server
 * REST API for model registry operations
 */

const express = require('express');
const ModelRegistry = require('./registry-manager.js');

const app = express();
const PORT = process.env.PORT || 3001;

let registry = null;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize registry
async function initializeRegistry() {
  try {
    registry = new ModelRegistry();
    await registry.initialize();
    console.log('✅ Model registry initialized');
  } catch (error) {
    console.error('❌ Failed to initialize registry:', error);
    process.exit(1);
  }
}

// Routes
app.get('/api/models', async (req, res) => {
  try {
    const { search, family, limit = 50, offset = 0 } = req.query;
    let models;

    if (search) {
      models = await registry.searchModels(search);
    } else if (family) {
      models = await registry.getModelsByFamily(family);
    } else {
      models = await registry.getAllModels();
    }

    // Apply pagination
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedModels = models.slice(start, end);

    res.json({
      success: true,
      data: paginatedModels,
      total: models.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // For now, return basic model info - could be extended to get detailed model data
    const models = await registry.getAllModels();
    const model = models.find((m) => m.id == id);

    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    res.json({ success: true, data: model });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/families', async (req, res) => {
  try {
    const models = await registry.getAllModels();
    const families = [...new Set(models.map((m) => m.model_family))].sort();

    res.json({ success: true, data: families });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/capabilities', async (req, res) => {
  try {
    const models = await registry.getAllModels();
    const allCapabilities = models.flatMap((m) =>
      m.capabilities ? m.capabilities.split(',') : []
    );
    const capabilities = [...new Set(allCapabilities)].sort();

    res.json({ success: true, data: capabilities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const models = await registry.getAllModels();
    const allTags = models.flatMap((m) => (m.tags ? m.tags.split(',') : []));
    const tags = [...new Set(allTags)].sort();

    res.json({ success: true, data: tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const models = await registry.getAllModels();

    const stats = {
      total_models: models.length,
      families: [...new Set(models.map((m) => m.model_family))].length,
      avg_parameters: models.reduce((sum, m) => sum + (m.parameters || 0), 0) / models.length,
      size_distribution: {
        tiny: models.filter((m) => (m.parameters || 0) < 1).length,
        small: models.filter((m) => (m.parameters || 0) >= 1 && (m.parameters || 0) < 5).length,
        medium: models.filter((m) => (m.parameters || 0) >= 5 && (m.parameters || 0) < 15).length,
        large: models.filter((m) => (m.parameters || 0) >= 15).length,
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Llama.cpp SLLM Registry API',
    version: '1.0.0',
    endpoints: {
      'GET /api/models': 'List/search models',
      'GET /api/models/:id': 'Get specific model',
      'GET /api/families': 'List model families',
      'GET /api/capabilities': 'List model capabilities',
      'GET /api/tags': 'List model tags',
      'GET /api/stats': 'Get registry statistics',
      'GET /health': 'Health check',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down registry API server...');
  if (registry) {
    await registry.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down registry API server...');
  if (registry) {
    await registry.close();
  }
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeRegistry();

  app.listen(PORT, () => {
    console.log(`🚀 Llama.cpp SLLM Registry API server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}`);
    console.log(`📋 Models available at http://localhost:${PORT}/api/models`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
