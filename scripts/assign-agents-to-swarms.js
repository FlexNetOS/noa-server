#!/usr/bin/env node
/**
 * Agent Swarm Assignment Script
 * Version: 1.0.0
 * Date: October 22, 2025
 *
 * Assigns agents to appropriate swarms based on their capabilities and roles
 */

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class AgentSwarmAssigner {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.hiveDbPath = path.join(this.projectRoot, '.hive-mind', 'hive.db');
    }

    async initialize() {
        console.log('🎯 Initializing Agent Swarm Assignment...\n');

        // Initialize database connection
        this.db = new sqlite3.Database(this.hiveDbPath);

        console.log('✅ Hive mind database ready\n');
    }

    async assignAgentsToSwarms() {
        console.log('🔄 Assigning Agents to Swarms...\n');

        // Define assignment rules
        const assignmentRules = {
            'swarm-core': {
                name: 'Core Development Swarm',
                criteria: (agent) => {
                    return agent.type === 'core' ||
                           agent.type === 'universal' ||
                           agent.type === 'specialized';
                }
            },
            'swarm-tools': {
                name: 'Tool Integration Swarm',
                criteria: (agent) => {
                    return agent.type === 'tool' ||
                           agent.type === 'infrastructure';
                }
            },
            'swarm-orchestration': {
                name: 'Orchestration Swarm',
                criteria: (agent) => {
                    return agent.type === 'orchestrator';
                }
            }
        };

        let totalAssigned = 0;

        for (const [swarmId, rule] of Object.entries(assignmentRules)) {
            console.log(`📋 Processing ${rule.name}...`);

            // Get agents matching criteria
            const agents = await this.getAgentsByCriteria(rule.criteria);
            console.log(`   Found ${agents.length} matching agents`);

            // Assign agents to swarm
            for (const agent of agents) {
                await this.assignAgentToSwarm(agent.id, swarmId);
                console.log(`   ✅ Assigned: ${agent.name} (${agent.type})`);
                totalAssigned++;
            }

            console.log(`   📊 ${rule.name}: ${agents.length} agents assigned\n`);
        }

        console.log(`🎉 Total agents assigned: ${totalAssigned}\n`);
        return totalAssigned;
    }

    async getAgentsByCriteria(criteria) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT id, name, type, role FROM agents', [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const matchingAgents = rows.filter(criteria);
                resolve(matchingAgents);
            });
        });
    }

    async assignAgentToSwarm(agentId, swarmId) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE agents SET swarm_id = ? WHERE id = ?';

            this.db.run(sql, [swarmId, agentId], function(err) {
                if (err) {
                    console.log(`❌ Failed to assign agent ${agentId}: ${err.message}`);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async generateAssignmentReport() {
        console.log('📊 Generating Assignment Report...\n');

        return new Promise((resolve, reject) => {
            // Get assignment statistics
            const sql = `
                SELECT
                    s.name as swarm_name,
                    s.id as swarm_id,
                    COUNT(a.id) as agent_count,
                    GROUP_CONCAT(a.type) as agent_types
                FROM swarms s
                LEFT JOIN agents a ON s.id = a.swarm_id
                GROUP BY s.id, s.name
                ORDER BY s.name
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('# Agent Swarm Assignment Report\n');
                console.log('**Date:**', new Date().toISOString());
                console.log('**Status:** ✅ ASSIGNMENT COMPLETE\n');

                rows.forEach(row => {
                    console.log(`## ${row.swarm_name}`);
                    console.log(`- **Agents Assigned:** ${row.agent_count}`);
                    if (row.agent_types) {
                        const types = [...new Set(row.agent_types.split(','))];
                        console.log(`- **Agent Types:** ${types.join(', ')}`);
                    }
                    console.log('');
                });

                // Get unassigned agents
                this.db.all('SELECT COUNT(*) as unassigned FROM agents WHERE swarm_id IS NULL', [], (err2, unassignedRows) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }

                    const unassigned = unassignedRows[0].unassigned;
                    if (unassigned > 0) {
                        console.log(`## ⚠️ Unassigned Agents: ${unassigned}\n`);
                    } else {
                        console.log('## ✅ All Agents Assigned\n');
                    }

                    console.log('---\n*Assignment completed successfully*');
                    resolve();
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

            // Assign agents to swarms
            const assignedCount = await this.assignAgentsToSwarms();

            // Generate report
            await this.generateAssignmentReport();

            console.log('🎉 Agent Swarm Assignment COMPLETED!');
            console.log(`📊 Summary: ${assignedCount} agents assigned to swarms`);

        } catch (error) {
            console.error('❌ Assignment failed:', error);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Run the assignment
if (require.main === module) {
    const assigner = new AgentSwarmAssigner();
    assigner.run();
}

module.exports = AgentSwarmAssigner;