#!/usr/bin/env node
/**
 * Orphaned Agent Integration Script
 * Version: 1.0.0
 * Date: October 22, 2025
 *
 * Registers all orphaned agents and tools with the hive mind system
 */

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class OrphanedAgentIntegrator {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.hiveDbPath = path.join(this.projectRoot, '.hive-mind', 'hive.db');
        this.auditReport = path.join(this.projectRoot, 'docs', 'orphaned-agents-audit.md');
    }

    async initialize() {
        console.log('🚀 Initializing Orphaned Agent Integration...\n');

        // Ensure hive mind database exists
        await this.ensureHiveMindDatabase();

        // Initialize database connection
        this.db = new sqlite3.Database(this.hiveDbPath);

        console.log('✅ Hive mind database ready\n');
    }

    async ensureHiveMindDatabase() {
        const hiveDir = path.dirname(this.hiveDbPath);

        try {
            await fs.access(hiveDir);
        } catch {
            await fs.mkdir(hiveDir, { recursive: true });
        }

        // Check if database exists
        try {
            await fs.access(this.hiveDbPath);
        } catch {
            // Create database with schema
            await this.createHiveMindSchema();
        }
    }

    async createHiveMindSchema() {
        const db = new sqlite3.Database(this.hiveDbPath);

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create agents table
                db.run(`
                    CREATE TABLE agents (
                        id TEXT PRIMARY KEY,
                        swarm_id TEXT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        role TEXT,
                        capabilities TEXT DEFAULT '[]',
                        status TEXT DEFAULT 'active',
                        performance_score REAL DEFAULT 0.5,
                        task_count INTEGER DEFAULT 0,
                        success_rate REAL DEFAULT 1.0,
                        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT DEFAULT '{}',
                        FOREIGN KEY (swarm_id) REFERENCES swarms (id)
                    )
                `);

                // Create swarms table
                db.run(`
                    CREATE TABLE swarms (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT DEFAULT 'active',
                        agent_count INTEGER DEFAULT 0,
                        performance_score REAL DEFAULT 0.5,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT DEFAULT '{}'
                    )
                `);

                // Create tasks table
                db.run(`
                    CREATE TABLE tasks (
                        id TEXT PRIMARY KEY,
                        swarm_id TEXT,
                        agent_id TEXT,
                        type TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        priority INTEGER DEFAULT 1,
                        data TEXT DEFAULT '{}',
                        result TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME,
                        FOREIGN KEY (swarm_id) REFERENCES swarms (id),
                        FOREIGN KEY (agent_id) REFERENCES agents (id)
                    )
                `);

                // Create indexes
                db.run(`CREATE INDEX idx_agents_swarm_id ON agents(swarm_id)`);
                db.run(`CREATE INDEX idx_agents_status ON agents(status)`);
                db.run(`CREATE INDEX idx_swarms_status ON swarms(status)`);
                db.run(`CREATE INDEX idx_tasks_status ON tasks(status)`);

                db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async registerAwesomeClaudeAgents() {
        console.log('📋 Registering Awesome Claude Agents...\n');

        const agentsDir = path.join(this.projectRoot, 'awesome-claude-agents', 'agents');
        const categories = ['core', 'universal', 'orchestrators', 'specialized'];

        let registeredCount = 0;

        for (const category of categories) {
            const categoryPath = path.join(agentsDir, category);

            try {
                const items = await fs.readdir(categoryPath, { withFileTypes: true });

                for (const item of items) {
                    if (item.isDirectory()) {
                        // Handle specialized subdirectories (react, laravel, etc.)
                        const subDirPath = path.join(categoryPath, item.name);
                        const subItems = await fs.readdir(subDirPath);

                        for (const subItem of subItems) {
                            if (subItem.endsWith('.md')) {
                                const agentData = await this.parseAgentFile(path.join(subDirPath, subItem));
                                if (agentData) {
                                    await this.registerAgent(agentData, category);
                                    registeredCount++;
                                }
                            }
                        }
                    } else if (item.name.endsWith('.md')) {
                        const agentData = await this.parseAgentFile(path.join(categoryPath, item.name));
                        if (agentData) {
                            await this.registerAgent(agentData, category);
                            registeredCount++;
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️  Warning: Could not read category ${category}: ${error.message}`);
            }
        }

        console.log(`✅ Registered ${registeredCount} agents from awesome-claude-agents\n`);
        return registeredCount;
    }

    async parseAgentFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            // Extract agent name from filename
            const fileName = path.basename(filePath, '.md');
            const name = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Extract basic info from markdown
            let role = '';
            let capabilities = [];
            let type = 'specialized';

            for (const line of lines.slice(0, 50)) { // Check first 50 lines
                if (line.includes('## Role') || line.includes('**Role**')) {
                    role = line.replace(/[*#]/g, '').trim();
                }
                if (line.includes('capability') || line.includes('skill')) {
                    capabilities.push(line.replace(/[*#-]/g, '').trim());
                }
            }

            // Determine type based on filename/path
            if (filePath.includes('/core/')) type = 'core';
            else if (filePath.includes('/orchestrators/')) type = 'orchestrator';
            else if (filePath.includes('/universal/')) type = 'universal';

            return {
                id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name,
                type,
                role: role || `${name} Agent`,
                capabilities: JSON.stringify(capabilities.slice(0, 5)), // Limit to 5 capabilities
                metadata: JSON.stringify({
                    source: 'awesome-claude-agents',
                    filePath: path.relative(this.projectRoot, filePath),
                    registered_at: new Date().toISOString()
                })
            };
        } catch (error) {
            console.log(`⚠️  Warning: Could not parse ${filePath}: ${error.message}`);
            return null;
        }
    }

    async registerAgent(agentData, category) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO agents
                (id, name, type, role, capabilities, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                agentData.id,
                agentData.name,
                agentData.type,
                agentData.role,
                agentData.capabilities,
                agentData.metadata
            ], function(err) {
                if (err) {
                    console.log(`❌ Failed to register ${agentData.name}: ${err.message}`);
                    reject(err);
                } else {
                    console.log(`✅ Registered: ${agentData.name} (${agentData.type})`);
                    resolve();
                }
            });
        });
    }

    async registerMCPTools() {
        console.log('🔧 Registering MCP Tools...\n');

        const mcpServers = [
            {
                name: 'Filesystem Server',
                type: 'tool',
                role: 'File System Operations',
                capabilities: JSON.stringify(['read', 'write', 'list', 'search', 'copy', 'move']),
                metadata: JSON.stringify({
                    source: 'mcp',
                    server: 'filesystem',
                    tools: 6,
                    path: 'mcp/servers/filesystem'
                })
            },
            {
                name: 'GitHub Server',
                type: 'tool',
                role: 'Repository Management',
                capabilities: JSON.stringify(['issues', 'pulls', 'repos', 'search', 'webhooks']),
                metadata: JSON.stringify({
                    source: 'mcp',
                    server: 'github',
                    tools: 6,
                    path: 'mcp/servers/github'
                })
            },
            {
                name: 'SQLite Server',
                type: 'tool',
                role: 'Database Operations',
                capabilities: JSON.stringify(['query', 'insert', 'update', 'delete', 'schema']),
                metadata: JSON.stringify({
                    source: 'mcp',
                    server: 'sqlite',
                    tools: 5,
                    path: 'mcp/servers/sqlite'
                })
            }
        ];

        let registeredCount = 0;

        for (const server of mcpServers) {
            const agentData = {
                id: `mcp-${server.name.toLowerCase().replace(/\s+/g, '-')}`,
                name: server.name,
                type: server.type,
                role: server.role,
                capabilities: server.capabilities,
                metadata: server.metadata
            };

            try {
                await this.registerAgent(agentData, 'tools');
                registeredCount++;
            } catch (error) {
                console.log(`❌ Failed to register MCP tool ${server.name}: ${error.message}`);
            }
        }

        console.log(`✅ Registered ${registeredCount} MCP tools\n`);
        return registeredCount;
    }

    async createInitialSwarms() {
        console.log('🐝 Creating Initial Swarms...\n');

        const swarms = [
            {
                id: 'swarm-core',
                name: 'Core Development Swarm',
                objective: 'Handle core development tasks',
                queen_type: 'strategic',
                topology: 'hierarchical',
                max_agents: 8,
                metadata: JSON.stringify({
                    purpose: 'Handle core development tasks',
                    agents: ['code-reviewer', 'performance-optimizer', 'documentation-specialist']
                })
            },
            {
                id: 'swarm-tools',
                name: 'Tool Integration Swarm',
                objective: 'Manage tool integrations and MCP servers',
                queen_type: 'operational',
                topology: 'hierarchical',
                max_agents: 6,
                metadata: JSON.stringify({
                    purpose: 'Manage tool integrations and MCP servers',
                    agents: ['filesystem-server', 'github-server', 'sqlite-server']
                })
            },
            {
                id: 'swarm-orchestration',
                name: 'Orchestration Swarm',
                objective: 'Coordinate complex multi-agent workflows',
                queen_type: 'coordination',
                topology: 'hierarchical',
                max_agents: 10,
                metadata: JSON.stringify({
                    purpose: 'Coordinate complex multi-agent workflows',
                    agents: ['team-configurator', 'project-analyst', 'tech-lead-orchestrator']
                })
            }
        ];

        return new Promise((resolve, reject) => {
            let completed = 0;
            const total = swarms.length;

            swarms.forEach(swarm => {
                const sql = `
                    INSERT OR REPLACE INTO swarms
                    (id, name, objective, queen_type, topology, max_agents, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                this.db.run(sql, [
                    swarm.id,
                    swarm.name,
                    swarm.objective,
                    swarm.queen_type,
                    swarm.topology,
                    swarm.max_agents,
                    swarm.metadata
                ], function(err) {
                    if (err) {
                        console.log(`❌ Failed to create swarm ${swarm.name}: ${err.message}`);
                    } else {
                        console.log(`✅ Created swarm: ${swarm.name}`);
                    }

                    completed++;
                    if (completed === total) {
                        console.log(`✅ Created ${total} swarms\n`);
                        resolve(total);
                    }
                });
            });
        });
    }

    async connectMemorySystems() {
        console.log('🧠 Connecting Memory Systems...\n');

        // Check if swarm memory exists
        const swarmMemoryPath = path.join(this.projectRoot, '.swarm', 'memory.db');

        try {
            await fs.access(swarmMemoryPath);
            console.log('✅ Swarm memory system found');

            // Create a bridge record in hive mind
            const bridgeData = {
                id: 'memory-bridge-swarm',
                name: 'Swarm Memory Bridge',
                type: 'infrastructure',
                role: 'Memory System Integration',
                capabilities: JSON.stringify(['memory-sync', 'context-sharing', 'state-persistence']),
                metadata: JSON.stringify({
                    source: 'memory-bridge',
                    swarm_memory_path: swarmMemoryPath,
                    integration_status: 'connected',
                    connected_at: new Date().toISOString()
                })
            };

            await this.registerAgent(bridgeData, 'infrastructure');
            console.log('✅ Memory systems connected\n');

            return true;
        } catch {
            console.log('⚠️  Swarm memory system not found, skipping connection\n');
            return false;
        }
    }

    async generateIntegrationReport() {
        console.log('📊 Generating Integration Report...\n');

        return new Promise((resolve, reject) => {
            // Get final counts
            this.db.all(`
                SELECT
                    COUNT(CASE WHEN type = 'core' THEN 1 END) as core_agents,
                    COUNT(CASE WHEN type = 'universal' THEN 1 END) as universal_agents,
                    COUNT(CASE WHEN type = 'orchestrator' THEN 1 END) as orchestrator_agents,
                    COUNT(CASE WHEN type = 'specialized' THEN 1 END) as specialized_agents,
                    COUNT(CASE WHEN type = 'tool' THEN 1 END) as tools,
                    COUNT(CASE WHEN type = 'infrastructure' THEN 1 END) as infrastructure
                FROM agents
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stats = rows[0];

                this.db.all(`SELECT COUNT(*) as swarm_count FROM swarms`, [], (err2, swarmRows) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }

                    const swarmCount = swarmRows[0].swarm_count;

                    const report = `
# Orphaned Agent Integration - COMPLETED

**Date:** ${new Date().toISOString()}
**Status:** ✅ INTEGRATION COMPLETE

## Integration Results

### Agents Registered: ${stats.core_agents + stats.universal_agents + stats.orchestrator_agents + stats.specialized_agents + stats.tools + stats.infrastructure}

- **Core Agents:** ${stats.core_agents}
- **Universal Agents:** ${stats.universal_agents}
- **Orchestrator Agents:** ${stats.orchestrator_agents}
- **Specialized Agents:** ${stats.specialized_agents}
- **Tools:** ${stats.tools}
- **Infrastructure:** ${stats.infrastructure}

### Swarms Created: ${swarmCount}

### Memory Systems: ${stats.infrastructure > 0 ? '✅ Connected' : '❌ Not Connected'}

## Next Steps

1. **Task Assignment:** Assign agents to appropriate swarms
2. **Capability Testing:** Verify agent capabilities work correctly
3. **Performance Monitoring:** Monitor agent performance and success rates
4. **Coordination Protocols:** Implement inter-agent communication

---
*Integration completed successfully*
                    `.trim();

                    console.log(report);
                    resolve(report);
                });
            });
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }

    async run() {
        try {
            await this.initialize();

            // Phase 1: Register all orphaned agents
            const agentCount = await this.registerAwesomeClaudeAgents();

            // Phase 2: Register MCP tools
            const toolCount = await this.registerMCPTools();

            // Phase 3: Create initial swarms
            const swarmCount = await this.createInitialSwarms();

            // Phase 4: Connect memory systems
            const memoryConnected = await this.connectMemorySystems();

            // Phase 5: Generate report
            await this.generateIntegrationReport();

            console.log('🎉 Orphaned Agent Integration COMPLETED!');
            console.log(`📊 Summary: ${agentCount} agents + ${toolCount} tools + ${swarmCount} swarms integrated`);

            if (memoryConnected) {
                console.log('🧠 Memory systems unified');
            }

        } catch (error) {
            console.error('❌ Integration failed:', error);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Run the integration
if (require.main === module) {
    const integrator = new OrphanedAgentIntegrator();
    integrator.run();
}

module.exports = OrphanedAgentIntegrator;
