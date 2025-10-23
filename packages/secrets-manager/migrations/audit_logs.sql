-- ========================================
-- AUDIT LOGS TABLE AND INDEXES
-- ========================================
-- This migration creates the audit_logs table with partitioning
-- and appropriate indexes for compliance and querying

-- Create audit_logs table (partitioned by month)
CREATE TABLE IF NOT EXISTS audit_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Event classification
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    result VARCHAR(50) NOT NULL CHECK (result IN ('success', 'failure', 'denied', 'error')),

    -- Actor (who performed the action)
    actor_id VARCHAR(255),
    actor_type VARCHAR(50) CHECK (actor_type IN ('user', 'service', 'system', 'api_key', 'anonymous')),
    actor_name VARCHAR(255),

    -- Resource (what was accessed/modified)
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),

    -- Network context
    ip_address INET,
    user_agent TEXT,

    -- Additional context
    metadata JSONB,

    -- Error information
    error_message TEXT,
    error_code VARCHAR(100),

    -- Compliance
    compliance_frameworks VARCHAR(50)[],
    contains_sensitive_data BOOLEAN DEFAULT FALSE,

    -- Tamper detection
    checksum VARCHAR(128),

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create indexes on main table
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id) WHERE resource_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_actor_timestamp ON audit_logs(actor_id, timestamp DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_sensitive ON audit_logs(timestamp DESC) WHERE contains_sensitive_data = TRUE;

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_audit_metadata ON audit_logs USING GIN(metadata);

-- Create default partition (for data that doesn't fit other partitions)
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;

-- ========================================
-- PARTITION MANAGEMENT FUNCTIONS
-- ========================================

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    partition_exists BOOLEAN;
BEGIN
    -- Create partition for next month
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');

    -- Check if partition already exists
    SELECT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = partition_name
    ) INTO partition_exists;

    IF NOT partition_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions (run via cron)
CREATE OR REPLACE FUNCTION auto_create_audit_log_partitions()
RETURNS void AS $$
DECLARE
    month_offset INT;
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- Create partitions for next 3 months
    FOR month_offset IN 0..2 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (month_offset || ' months')::interval);
        end_date := start_date + interval '1 month';
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );

            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (for retention policy)
CREATE OR REPLACE FUNCTION drop_old_audit_log_partitions(retention_days INT)
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := CURRENT_DATE - retention_days;

    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'audit_logs_%'
          AND tablename != 'audit_logs_default'
          AND to_date(substring(tablename from 12), 'YYYY_MM') < cutoff_date
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
        RAISE NOTICE 'Dropped partition: %', partition_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STATISTICS AND ANALYSIS VIEWS
-- ========================================

-- View for recent security events
CREATE OR REPLACE VIEW audit_security_events AS
SELECT
    id,
    timestamp,
    event_type,
    actor_id,
    actor_type,
    resource_type,
    resource_id,
    ip_address,
    result,
    error_message,
    metadata
FROM audit_logs
WHERE event_type LIKE 'security.%'
   OR result IN ('denied', 'failure')
ORDER BY timestamp DESC;

-- View for authentication events
CREATE OR REPLACE VIEW audit_auth_events AS
SELECT
    id,
    timestamp,
    event_type,
    actor_id,
    ip_address,
    result,
    error_message,
    CASE
        WHEN event_type = 'auth.login' AND result = 'success' THEN 'Login Success'
        WHEN event_type = 'auth.login' AND result = 'failure' THEN 'Login Failed'
        WHEN event_type = 'auth.logout' THEN 'Logout'
        ELSE event_type
    END as event_description
FROM audit_logs
WHERE event_type LIKE 'auth.%'
ORDER BY timestamp DESC;

-- View for failed access attempts
CREATE OR REPLACE VIEW audit_failed_access AS
SELECT
    date_trunc('hour', timestamp) as hour,
    actor_id,
    ip_address,
    COUNT(*) as failure_count,
    array_agg(DISTINCT event_type) as event_types,
    array_agg(DISTINCT resource_type) as resource_types
FROM audit_logs
WHERE result IN ('failure', 'denied')
  AND timestamp > NOW() - interval '24 hours'
GROUP BY date_trunc('hour', timestamp), actor_id, ip_address
HAVING COUNT(*) > 5
ORDER BY hour DESC, failure_count DESC;

-- ========================================
-- COMPLIANCE HELPER FUNCTIONS
-- ========================================

-- Function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_report(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    framework VARCHAR(50)
)
RETURNS TABLE(
    metric VARCHAR,
    value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_events'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND (framework IS NULL OR framework = ANY(compliance_frameworks))

    UNION ALL

    SELECT 'auth_events'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND event_type LIKE 'auth.%'
      AND (framework IS NULL OR framework = ANY(compliance_frameworks))

    UNION ALL

    SELECT 'failed_logins'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND event_type = 'auth.login_failed'
      AND (framework IS NULL OR framework = ANY(compliance_frameworks))

    UNION ALL

    SELECT 'data_access_events'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND event_type LIKE 'data.%'
      AND (framework IS NULL OR framework = ANY(compliance_frameworks))

    UNION ALL

    SELECT 'permission_denials'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND event_type = 'authz.permission_denied'
      AND (framework IS NULL OR framework = ANY(compliance_frameworks))

    UNION ALL

    SELECT 'security_incidents'::VARCHAR, COUNT(*)
    FROM audit_logs
    WHERE timestamp BETWEEN start_date AND end_date
      AND event_type LIKE 'security.%'
      AND (framework IS NULL OR framework = ANY(compliance_frameworks));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL SETUP
-- ========================================

-- Create initial partitions (current month + next 2 months)
SELECT auto_create_audit_log_partitions();

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON audit_logs TO audit_reader;
-- GRANT INSERT ON audit_logs TO audit_writer;
-- GRANT SELECT ON audit_security_events TO security_team;

-- ========================================
-- MAINTENANCE JOBS (Add to cron)
-- ========================================

-- Create new partitions monthly:
-- 0 0 1 * * psql -d <database> -c "SELECT auto_create_audit_log_partitions();"

-- Drop old partitions according to retention policy (e.g., keep 365 days):
-- 0 2 1 * * psql -d <database> -c "SELECT drop_old_audit_log_partitions(365);"

-- Analyze table statistics weekly:
-- 0 3 * * 0 psql -d <database> -c "ANALYZE audit_logs;"

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE audit_logs IS 'Audit trail for all security-relevant events in the system';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit event';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the event occurred (used for partitioning)';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (auth.login, data.read, etc.)';
COMMENT ON COLUMN audit_logs.actor_id IS 'ID of the user/service that performed the action';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource that was accessed/modified';
COMMENT ON COLUMN audit_logs.checksum IS 'SHA-256 checksum for tamper detection';
COMMENT ON COLUMN audit_logs.compliance_frameworks IS 'Array of compliance frameworks this event relates to (SOC2, PCI_DSS, HIPAA, etc.)';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify partitions exist
-- SELECT tablename FROM pg_tables WHERE tablename LIKE 'audit_logs_%' ORDER BY tablename;

-- Check table size
-- SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));

-- Test insert
-- INSERT INTO audit_logs (event_type, action, result, actor_id, resource_type, resource_id)
-- VALUES ('auth.login', 'login', 'success', 'test-user', 'system', 'api');
