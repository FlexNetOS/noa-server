#!/usr/bin/env node

/**
 * Llama.cpp SLLM Model Registry Manager
 * Handles model registration, database operations, and CSV import/export
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class ModelRegistry {
    constructor(dbPath = './registry/database/models.db') {
        this.dbPath = path.resolve(dbPath);
        this.db = null;
        this.ensureDatabaseDirectory();
    }

    ensureDatabaseDirectory() {
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database schema created');
                    resolve();
                }
            });
        });
    }

    async importCSV(csvPath) {
        const resolvedPath = path.resolve(csvPath);
        return new Promise((resolve, reject) => {
            const models = [];

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    models.push({
                        name: row.name,
                        display_name: row.display_name,
                        model_family: row.model_family,
                        model_size: row.model_size,
                        parameters: parseFloat(row.parameters) || null,
                        quantization: row.quantization,
                        file_format: row.file_format || 'GGUF',
                        capabilities: row.capabilities ? row.capabilities.split(',').map(c => c.trim()) : [],
                        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
                        description: row.description
                    });
                })
                .on('end', () => {
                    console.log(`📄 Parsed ${models.length} models from CSV`);
                    this.insertModels(models).then(resolve).catch(reject);
                })
                .on('error', reject);
        });
    }

    async insertModels(models) {
        for (const model of models) {
            await this.insertModel(model);
        }
    }

    async insertModel(model) {
        return new Promise((resolve, reject) => {
            // First check if model exists
            const checkSql = 'SELECT id FROM models WHERE name = ?';
            this.db.get(checkSql, [model.name], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row) {
                    // Model exists, update it
                    console.log(`📝 Updating existing model: ${model.name} (ID: ${row.id})`);
                    this.updateModel(row.id, model).then(() => resolve(row.id)).catch(reject);
                } else {
                    // Model doesn't exist, insert it
                    const insertSql = `
                        INSERT INTO models
                        (name, display_name, model_family, model_size, parameters, quantization, file_format, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `;

                    const values = [
                        model.name,
                        model.display_name,
                        model.model_family,
                        model.model_size,
                        model.parameters,
                        model.quantization,
                        model.file_format
                    ];

                    this.db.run(insertSql, values, function(err) {
                        if (err) {
                            console.log('❌ Insert Error:', err);
                            reject(err);
                        } else {
                            const modelId = this.lastID;
                            console.log(`✅ Inserted model: ${model.name} (ID: ${modelId})`);

                            // Insert relations
                            const insertRelations = async () => {
                                try {
                                    // Insert capabilities
                                    if (model.capabilities && model.capabilities.length > 0) {
                                        for (const cap of model.capabilities) {
                                            await this.insertCapability(modelId, cap);
                                        }
                                    }

                                    // Insert tags
                                    if (model.tags && model.tags.length > 0) {
                                        for (const tag of model.tags) {
                                            await this.insertTag(modelId, tag);
                                        }
                                    }

                                    // Insert description as metadata
                                    if (model.description) {
                                        await this.insertMetadata(modelId, 'description', model.description);
                                    }

                                    resolve(modelId);
                                } catch (relErr) {
                                    console.log('❌ Relation insert error:', relErr);
                                    reject(relErr);
                                }
                            };

                            insertRelations();
                        }
                    }.bind(this));
                }
            });
        });
    }

    async updateModel(modelId, model) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE models SET
                display_name = ?, model_family = ?, model_size = ?, parameters = ?,
                quantization = ?, file_format = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const values = [
                model.display_name,
                model.model_family,
                model.model_size,
                model.parameters,
                model.quantization,
                model.file_format,
                modelId
            ];

            this.db.run(sql, values, async (err) => {
                if (err) {
                    reject(err);
                } else {
                    // Insert/update relations
                    try {
                        // Delete existing relations first
                        await this.deleteModelRelations(modelId);

                        // Insert capabilities
                        if (model.capabilities && model.capabilities.length > 0) {
                            for (const cap of model.capabilities) {
                                await this.insertCapability(modelId, cap);
                            }
                        }

                        // Insert tags
                        if (model.tags && model.tags.length > 0) {
                            for (const tag of model.tags) {
                                await this.insertTag(modelId, tag);
                            }
                        }

                        // Insert description as metadata
                        if (model.description) {
                            await this.insertMetadata(modelId, 'description', model.description);
                        }

                        resolve();
                    } catch (relErr) {
                        reject(relErr);
                    }
                }
            });
        });
    }

    async deleteModelRelations(modelId) {
        const tables = ['model_capabilities', 'model_tags', 'model_metadata'];
        for (const table of tables) {
            await new Promise((resolve, reject) => {
                this.db.run(`DELETE FROM ${table} WHERE model_id = ?`, [modelId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    async insertCapability(modelId, capability) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR IGNORE INTO model_capabilities
                (model_id, capability) VALUES (?, ?)
            `;
            this.db.run(sql, [modelId, capability], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async insertTag(modelId, tag) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR IGNORE INTO model_tags
                (model_id, tag) VALUES (?, ?)
            `;
            this.db.run(sql, [modelId, tag], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async insertMetadata(modelId, key, value) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO model_metadata
                (model_id, meta_key, meta_value) VALUES (?, ?, ?)
            `;
            this.db.run(sql, [modelId, key, value], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getAllModels() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM model_summary
                ORDER BY model_family, parameters ASC
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async searchModels(query) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM model_summary
                WHERE name LIKE ? OR display_name LIKE ? OR model_family LIKE ?
                OR capabilities LIKE ? OR tags LIKE ?
                ORDER BY model_family, parameters ASC
            `;
            const searchTerm = `%${query}%`;
            const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getModelsByFamily(family) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM model_summary
                WHERE model_family = ?
                ORDER BY parameters ASC
            `;
            this.db.all(sql, [family], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async exportToCSV(outputPath) {
        const models = await this.getAllModels();
        const csvContent = this.modelsToCSV(models);
        fs.writeFileSync(outputPath, csvContent);
        console.log(`📄 Exported ${models.length} models to ${outputPath}`);
    }

    modelsToCSV(models) {
        const headers = [
            'id', 'name', 'display_name', 'model_family', 'model_size',
            'parameters', 'quantization', 'file_format', 'capabilities', 'tags'
        ];

        const rows = models.map(model => [
            model.id,
            model.name,
            model.display_name,
            model.model_family,
            model.model_size,
            model.parameters,
            model.quantization,
            model.file_format,
            model.capabilities,
            model.tags
        ]);

        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field || ''}"`).join(','))
        ];

        return csvLines.join('\n');
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('✅ Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const registry = new ModelRegistry();

    try {
        await registry.initialize();

        switch (command) {
            case 'import':
                const csvPath = args[1] || path.join(__dirname, '../csv/sllm_models.csv');
                console.log(`📥 Importing models from ${csvPath}`);
                await registry.importCSV(csvPath);
                console.log('✅ Import completed');
                break;

            case 'export':
                const outputPath = args[1] || './registry/csv/exported_models.csv';
                console.log(`📤 Exporting models to ${outputPath}`);
                await registry.exportToCSV(outputPath);
                console.log('✅ Export completed');
                break;

            case 'list':
                const models = await registry.getAllModels();
                console.log(`📋 Found ${models.length} models:`);
                models.forEach(model => {
                    console.log(`  ${model.name} (${model.model_family} ${model.model_size}) - ${model.capabilities}`);
                });
                break;

            case 'search':
                const query = args[1];
                if (!query) {
                    console.error('❌ Please provide a search query');
                    process.exit(1);
                }
                const results = await registry.searchModels(query);
                console.log(`🔍 Found ${results.length} models matching "${query}":`);
                results.forEach(model => {
                    console.log(`  ${model.name} (${model.model_family} ${model.model_size})`);
                });
                break;

            case 'family':
                const family = args[1];
                if (!family) {
                    console.error('❌ Please provide a model family');
                    process.exit(1);
                }
                const familyModels = await registry.getModelsByFamily(family);
                console.log(`🏠 Found ${familyModels.length} ${family} models:`);
                familyModels.forEach(model => {
                    console.log(`  ${model.name} (${model.model_size}) - ${model.capabilities}`);
                });
                break;

            default:
                console.log('Usage: node registry-manager.js <command> [args]');
                console.log('Commands:');
                console.log('  import [csv-path]    - Import models from CSV');
                console.log('  export [csv-path]    - Export models to CSV');
                console.log('  list                 - List all models');
                console.log('  search <query>       - Search models');
                console.log('  family <family>      - List models by family');
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await registry.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = ModelRegistry;
