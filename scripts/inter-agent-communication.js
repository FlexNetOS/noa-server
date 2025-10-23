#!/usr/bin/env node

/**
 * Inter-Agent Communication System
 * Enables agents to exchange messages, coordinate tasks, and share data
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class InterAgentCommunication {
    constructor() {
        this.projectRoot = '/home/deflex/noa-server';
        this.hiveDbPath = path.join(this.projectRoot, '.hive-mind', 'hive.db');
        this.db = null;
        this.messageQueue = [];
        this.activeSubscriptions = new Map();
    }

    async initialize() {
        console.log('📡 Initializing Inter-Agent Communication System...\n');

        // Initialize database connection
        this.db = new sqlite3.Database(this.hiveDbPath);

        // Ensure message tables exist
        await this.initializeMessageTables();

        // Start message processing
        this.startMessageProcessor();

        console.log('✅ Inter-Agent Communication System ready\n');
    }

    async initializeMessageTables() {
        // Check if tables exist and have the right structure
        const existingTables = await this.allQuery("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('messages', 'message_deliveries', 'agent_subscriptions')", []);

        if (existingTables.length === 3) {
            console.log('📋 Message tables already exist, validating structure...');
            // Tables exist, assume they're correct for now
            return;
        }

        // Drop existing tables if they exist with wrong structure
        const dropQueries = [
            'DROP TABLE IF EXISTS agent_subscriptions',
            'DROP TABLE IF EXISTS message_deliveries',
            'DROP TABLE IF EXISTS messages'
        ];

        for (const sql of dropQueries) {
            await this.runQuery(sql);
        }

        // Create tables
        const tables = [
            `CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE NOT NULL,
                sender_agent_id TEXT NOT NULL,
                recipient_agent_id TEXT,
                swarm_id TEXT,
                message_type TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                content TEXT NOT NULL,
                metadata TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME,
                expires_at DATETIME,
                FOREIGN KEY (sender_agent_id) REFERENCES agents(id),
                FOREIGN KEY (recipient_agent_id) REFERENCES agents(id),
                FOREIGN KEY (swarm_id) REFERENCES swarms(id)
            )`,
            `CREATE TABLE message_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT NOT NULL,
                recipient_agent_id TEXT NOT NULL,
                delivery_status TEXT DEFAULT 'pending',
                delivered_at DATETIME,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                FOREIGN KEY (message_id) REFERENCES messages(message_id),
                FOREIGN KEY (recipient_agent_id) REFERENCES agents(id)
            )`,
            `CREATE TABLE agent_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                subscription_type TEXT DEFAULT 'direct',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(agent_id, topic),
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )`
        ];

        for (const sql of tables) {
            await this.runQuery(sql);
        }

        // Create indexes
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`,
            `CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`,
            `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_agent_id)`,
            `CREATE INDEX IF NOT EXISTS idx_messages_swarm ON messages(swarm_id)`,
            `CREATE INDEX IF NOT EXISTS idx_deliveries_status ON message_deliveries(delivery_status)`
        ];

        for (const sql of indexes) {
            await this.runQuery(sql);
        }
    }

    async sendMessage(senderId, message) {
        const messageId = this.generateMessageId();
        const messageData = {
            message_id: messageId,
            sender_agent_id: senderId,
            recipient_agent_id: message.recipientId || null,
            swarm_id: message.swarmId || null,
            message_type: message.type,
            priority: message.priority || 1,
            content: JSON.stringify(message.content),
            metadata: message.metadata ? JSON.stringify(message.metadata) : null,
            expires_at: message.expiresAt || null
        };

        await this.runQuery('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            messageData.message_id, // id (TEXT PRIMARY KEY)
            messageData.swarm_id, // swarm_id
            messageData.sender_agent_id, // sender_id
            messageData.recipient_agent_id, // recipient_id
            'general', // channel (default)
            messageData.message_type, // type
            messageData.content, // content
            messageData.priority, // priority
            null, // consensus_vote
            new Date().toISOString(), // timestamp
            0, // processed (BOOLEAN)
            messageData.metadata || '{}' // metadata
        ]);

        // Queue recipients for delivery
        await this.queueMessageDeliveries(messageId, message);

        return messageId;
    }

    async queueMessageDeliveries(messageId, message) {
        let recipients = [];

        if (message.recipientId) {
            // Direct message
            recipients = [message.recipientId];
        } else if (message.swarmId) {
            // Swarm broadcast
            recipients = await this.getSwarmAgents(message.swarmId);
        } else if (message.topic) {
            // Topic-based message
            recipients = await this.getTopicSubscribers(message.topic);
        } else {
            // Global broadcast (not recommended for production)
            recipients = await this.getAllAgents();
        }

        for (const recipientId of recipients) {
            if (recipientId !== message.senderId) { // Don't send to self
                await this.runQuery('INSERT INTO message_deliveries VALUES (?, ?, ?, ?, ?, ?, ?)', [
                    null, // id (auto)
                    messageId,
                    recipientId,
                    'pending',
                    null, // delivered_at
                    null, // error_message
                    0 // retry_count
                ]);
            }
        }
    }

    async receiveMessages(agentId, options = {}) {
        const { limit = 10, messageTypes = null, status = 'pending' } = options;

        let query = `
            SELECT m.*, md.delivery_status, md.delivered_at, md.error_message
            FROM messages m
            JOIN message_deliveries md ON m.id = md.message_id
            WHERE md.recipient_agent_id = ?
            AND md.delivery_status = ?
        `;
        const params = [agentId, status];

        if (messageTypes && messageTypes.length > 0) {
            query += ` AND m.message_type IN (${messageTypes.map(() => '?').join(',')})`;
            params.push(...messageTypes);
        }

        query += ` ORDER BY m.priority DESC, m.timestamp ASC LIMIT ?`;
        params.push(limit);

        const rows = await this.allQuery(query, params);

        // Mark messages as delivered
        for (const row of rows) {
            await this.markMessageDelivered(row.message_id, agentId);
        }

        return rows.map(row => ({
            ...row,
            content: JSON.parse(row.content),
            metadata: row.metadata ? JSON.parse(row.metadata) : null
        }));
    }

    async markMessageDelivered(messageId, agentId) {
        await this.runQuery(
            'UPDATE message_deliveries SET delivery_status = ?, delivered_at = ? WHERE message_id = ? AND recipient_agent_id = ?',
            ['delivered', new Date().toISOString(), messageId, agentId]
        );
    }

    async subscribeToTopic(agentId, topic) {
        await this.runQuery(
            'INSERT OR REPLACE INTO agent_subscriptions VALUES (?, ?, ?, ?, ?)',
            [null, agentId, topic, 'topic', new Date().toISOString()]
        );
    }

    async unsubscribeFromTopic(agentId, topic) {
        await this.runQuery(
            'DELETE FROM agent_subscriptions WHERE agent_id = ? AND topic = ?',
            [agentId, topic]
        );
    }

    async getTopicSubscribers(topic) {
        const rows = await this.allQuery(
            'SELECT agent_id FROM agent_subscriptions WHERE topic = ?',
            [topic]
        );
        return rows.map(row => row.agent_id);
    }

    async getSwarmAgents(swarmId) {
        const rows = await this.allQuery(
            'SELECT id FROM agents WHERE swarm_id = ?',
            [swarmId]
        );
        return rows.map(row => row.id);
    }

    async getAllAgents() {
        const rows = await this.allQuery('SELECT id FROM agents', []);
        return rows.map(row => row.id);
    }

    async broadcastToSwarm(senderId, swarmId, message) {
        return await this.sendMessage(senderId, {
            ...message,
            swarmId,
            type: 'swarm_broadcast'
        });
    }

    async sendDirectMessage(senderId, recipientId, message) {
        return await this.sendMessage(senderId, {
            ...message,
            recipientId,
            type: 'direct_message'
        });
    }

    async publishToTopic(senderId, topic, message) {
        return await this.sendMessage(senderId, {
            ...message,
            topic,
            type: 'topic_publish'
        });
    }

    async requestResponse(senderId, recipientId, request, timeout = 30000) {
        const requestId = this.generateMessageId();
        const responsePromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.activeSubscriptions.delete(requestId);
                reject(new Error('Request timeout'));
            }, timeout);

            this.activeSubscriptions.set(requestId, {
                resolve,
                reject,
                timeoutId,
                type: 'response'
            });
        });

        await this.sendMessage(senderId, {
            recipientId,
            type: 'request',
            content: { ...request, requestId },
            metadata: { requestId, expectsResponse: true }
        });

        return responsePromise;
    }

    async sendResponse(originalMessageId, senderId, recipientId, response) {
        await this.sendMessage(senderId, {
            recipientId,
            type: 'response',
            content: response,
            metadata: { originalMessageId }
        });
    }

    startMessageProcessor() {
        // Process messages every 5 seconds
        setInterval(async () => {
            await this.processPendingMessages();
        }, 5000);
    }

    async processPendingMessages() {
        // Clean up expired messages (not supported in current schema)
        // Process response messages using the 'type' column
        const responseMessages = await this.allQuery(
            "SELECT * FROM messages WHERE type = 'response' AND processed = 0",
            []
        );

        for (const message of responseMessages) {
            const metadata = message.metadata ? JSON.parse(message.metadata) : {};
            const subscription = this.activeSubscriptions.get(metadata.originalMessageId);
            if (subscription && subscription.type === 'response') {
                clearTimeout(subscription.timeoutId);
                subscription.resolve(JSON.parse(message.content));
                this.activeSubscriptions.delete(metadata.originalMessageId);
            }
            // Mark as processed
            await this.runQuery("UPDATE messages SET processed = 1 WHERE id = ?", [message.id]);
        }
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Testing utilities
    async getMessageStats() {
        const stats = await this.allQuery(`
            SELECT
                COUNT(*) as total_messages,
                SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed_messages,
                SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed_messages
            FROM messages
        `, []);

        const deliveryStats = await this.allQuery(`
            SELECT
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_deliveries,
                SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_deliveries
            FROM message_deliveries
        `, []);

        return {
            messages: stats[0],
            deliveries: deliveryStats[0]
        };
    }
}

module.exports = InterAgentCommunication;

// CLI interface for testing
if (require.main === module) {
    const comms = new InterAgentCommunication();

    async function testInterAgentCommunication() {
        try {
            await comms.initialize();

            console.log('🧪 Testing Inter-Agent Communication...\n');

            // Test message sending
            console.log('📤 Testing message sending...');
            const messageId = await comms.sendDirectMessage('agent_001', 'agent_002', {
                type: 'test_message',
                content: { text: 'Hello from agent_001!' }
            });
            console.log(`✅ Message sent with ID: ${messageId}`);

            // Test swarm broadcast
            console.log('\n📢 Testing swarm broadcast...');
            const broadcastId = await comms.broadcastToSwarm('agent_001', 'core_development', {
                type: 'announcement',
                content: { text: 'System update available' }
            });
            console.log(`✅ Broadcast sent with ID: ${broadcastId}`);

            // Test topic subscription and publishing
            console.log('\n📋 Testing topic messaging...');
            await comms.subscribeToTopic('agent_002', 'system_updates');
            const topicId = await comms.publishToTopic('agent_001', 'system_updates', {
                type: 'system_update',
                content: { version: '1.0.1', changes: ['Bug fixes', 'Performance improvements'] }
            });
            console.log(`✅ Topic message sent with ID: ${topicId}`);

            // Test message receiving
            console.log('\n📥 Testing message receiving...');
            const messages = await comms.receiveMessages('agent_002');
            console.log(`✅ Received ${messages.length} messages`);

            // Show stats
            console.log('\n📊 Message Statistics:');
            const stats = await comms.getMessageStats();
            console.log(`Messages: ${JSON.stringify(stats.messages, null, 2)}`);
            console.log(`Deliveries: ${JSON.stringify(stats.deliveries, null, 2)}`);

            console.log('\n🎉 Inter-Agent Communication testing completed successfully!');

        } catch (error) {
            console.error('❌ Inter-Agent Communication testing failed:', error);
            process.exit(1);
        } finally {
            await comms.close();
        }
    }

    testInterAgentCommunication();
}
