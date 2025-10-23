-- Noa Server Database Initialization
-- PostgreSQL initialization script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS noa_core;
CREATE SCHEMA IF NOT EXISTS noa_agents;
CREATE SCHEMA IF NOT EXISTS noa_memory;

-- Set search path
SET search_path TO noa_core, public;

-- Core tables
CREATE TABLE IF NOT EXISTS noa_core.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'inactive',
    port INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS noa_core.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES noa_core.services(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    response_time_ms INTEGER,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent tables
CREATE TABLE IF NOT EXISTS noa_agents.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    capabilities JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS noa_agents.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES noa_agents.agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Memory tables
CREATE TABLE IF NOT EXISTS noa_memory.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_key VARCHAR(255) NOT NULL UNIQUE,
    data JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS noa_memory.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_status ON noa_core.services(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON noa_core.health_checks(service_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON noa_core.health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_agents_status ON noa_agents.agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON noa_agents.tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON noa_agents.tasks(status);
CREATE INDEX IF NOT EXISTS idx_sessions_key ON noa_memory.sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata ON noa_memory.embeddings USING GIN(metadata);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON noa_core.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON noa_agents.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON noa_memory.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO noa_core.services (name, type, port, status) VALUES
    ('mcp', 'coordination', 8001, 'active'),
    ('claude-flow', 'orchestration', 9100, 'active'),
    ('ui-dashboard', 'frontend', 9200, 'active'),
    ('llama-cpp', 'neural', 9300, 'active'),
    ('agenticos', 'agent-system', 9400, 'active')
ON CONFLICT (name) DO NOTHING;

COMMENT ON SCHEMA noa_core IS 'Core service management and health tracking';
COMMENT ON SCHEMA noa_agents IS 'Agent orchestration and task management';
COMMENT ON SCHEMA noa_memory IS 'Distributed memory and session storage';
