-- Data Retention Database Schema
-- Complete schema for automated data retention and lifecycle management

-- Retention Policies
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY,
  policy_name VARCHAR(255) UNIQUE NOT NULL,
  data_type VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  archive_days INTEGER CHECK (archive_days > 0 AND archive_days < retention_days),
  legal_basis TEXT,
  exceptions JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retention_policy_data_type ON retention_policies(data_type);
CREATE INDEX idx_retention_policy_active ON retention_policies(active);

-- Data Lifecycle Tracking
CREATE TABLE IF NOT EXISTS data_lifecycle (
  id UUID PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id UUID NOT NULL,
  policy_id UUID REFERENCES retention_policies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  legal_hold BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_lifecycle_record UNIQUE (table_name, record_id)
);

CREATE INDEX idx_lifecycle_expires ON data_lifecycle(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_lifecycle_policy ON data_lifecycle(policy_id);
CREATE INDEX idx_lifecycle_table ON data_lifecycle(table_name);
CREATE INDEX idx_lifecycle_legal_hold ON data_lifecycle(legal_hold) WHERE legal_hold = true;
CREATE INDEX idx_lifecycle_archived ON data_lifecycle(archived_at) WHERE archived_at IS NOT NULL;

-- Deletion Log (Audit Trail)
CREATE TABLE IF NOT EXISTS deletion_log (
  id UUID PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletion_reason VARCHAR(255) NOT NULL,
  deleted_by VARCHAR(255) NOT NULL,
  verification_hash VARCHAR(64) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_deletion_log_table ON deletion_log(table_name);
CREATE INDEX idx_deletion_log_deleted_at ON deletion_log(deleted_at);
CREATE INDEX idx_deletion_log_deleted_by ON deletion_log(deleted_by);

-- Archived Data Storage
CREATE TABLE IF NOT EXISTS archived_data (
  id UUID PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id UUID NOT NULL,
  data TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  storage_type VARCHAR(50) NOT NULL DEFAULT 'cold',
  compressed BOOLEAN DEFAULT true,
  encrypted BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_archived_record UNIQUE (table_name, record_id),
  CONSTRAINT chk_storage_type CHECK (storage_type IN ('cold', 'archive', 'glacier'))
);

CREATE INDEX idx_archived_table ON archived_data(table_name);
CREATE INDEX idx_archived_at ON archived_data(archived_at);
CREATE INDEX idx_archived_storage ON archived_data(storage_type);

-- Retention Events Log
CREATE TABLE IF NOT EXISTS retention_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(255),
  record_id UUID,
  policy_id UUID REFERENCES retention_policies(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_event_type CHECK (event_type IN ('POLICY_APPLIED', 'ARCHIVED', 'DELETED', 'LEGAL_HOLD_PLACED', 'LEGAL_HOLD_RELEASED', 'POLICY_CREATED', 'POLICY_UPDATED'))
);

CREATE INDEX idx_retention_events_type ON retention_events(event_type);
CREATE INDEX idx_retention_events_table ON retention_events(table_name);
CREATE INDEX idx_retention_events_created ON retention_events(created_at);

-- Retention Reports
CREATE TABLE IF NOT EXISTS retention_reports (
  id UUID PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_data JSONB NOT NULL,
  generated_by VARCHAR(255),
  CONSTRAINT chk_report_type CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL', 'AD_HOC'))
);

CREATE INDEX idx_retention_reports_type ON retention_reports(report_type);
CREATE INDEX idx_retention_reports_generated ON retention_reports(generated_at);

-- Legal Holds
CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY,
  case_id VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  placed_by VARCHAR(255) NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  affected_records JSONB DEFAULT '[]'::jsonb,
  CONSTRAINT chk_hold_status CHECK (status IN ('ACTIVE', 'RELEASED'))
);

CREATE INDEX idx_legal_holds_case ON legal_holds(case_id);
CREATE INDEX idx_legal_holds_status ON legal_holds(status);

-- Functions and Triggers

-- Function to automatically set expiry date when lifecycle record is created
CREATE OR REPLACE FUNCTION set_lifecycle_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    SELECT created_at + (retention_days || ' days')::INTERVAL
    INTO NEW.expires_at
    FROM retention_policies
    WHERE id = NEW.policy_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lifecycle_expiry
BEFORE INSERT ON data_lifecycle
FOR EACH ROW
EXECUTE FUNCTION set_lifecycle_expiry();

-- Function to log retention events
CREATE OR REPLACE FUNCTION log_retention_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO retention_events (id, event_type, table_name, record_id, policy_id, event_data)
    VALUES (gen_random_uuid(), 'POLICY_APPLIED', NEW.table_name, NEW.record_id, NEW.policy_id,
            jsonb_build_object('expires_at', NEW.expires_at));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      INSERT INTO retention_events (id, event_type, table_name, record_id, event_data)
      VALUES (gen_random_uuid(), 'ARCHIVED', NEW.table_name, NEW.record_id,
              jsonb_build_object('archived_at', NEW.archived_at));
    END IF;

    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      INSERT INTO retention_events (id, event_type, table_name, record_id, event_data)
      VALUES (gen_random_uuid(), 'DELETED', NEW.table_name, NEW.record_id,
              jsonb_build_object('deleted_at', NEW.deleted_at));
    END IF;

    IF NEW.legal_hold = true AND OLD.legal_hold = false THEN
      INSERT INTO retention_events (id, event_type, table_name, record_id, event_data)
      VALUES (gen_random_uuid(), 'LEGAL_HOLD_PLACED', NEW.table_name, NEW.record_id,
              jsonb_build_object('placed_at', NOW()));
    END IF;

    IF NEW.legal_hold = false AND OLD.legal_hold = true THEN
      INSERT INTO retention_events (id, event_type, table_name, record_id, event_data)
      VALUES (gen_random_uuid(), 'LEGAL_HOLD_RELEASED', NEW.table_name, NEW.record_id,
              jsonb_build_object('released_at', NOW()));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_retention_event
AFTER INSERT OR UPDATE ON data_lifecycle
FOR EACH ROW
EXECUTE FUNCTION log_retention_event();

-- View: Records Expiring Soon (30 days)
CREATE OR REPLACE VIEW records_expiring_soon AS
SELECT
  dl.id,
  dl.table_name,
  dl.record_id,
  rp.policy_name,
  dl.expires_at,
  EXTRACT(DAY FROM dl.expires_at - NOW()) as days_remaining
FROM data_lifecycle dl
JOIN retention_policies rp ON dl.policy_id = rp.id
WHERE dl.deleted_at IS NULL
  AND dl.legal_hold = false
  AND dl.expires_at > NOW()
  AND dl.expires_at <= NOW() + INTERVAL '30 days'
ORDER BY dl.expires_at ASC;

-- View: Records Ready for Archival
CREATE OR REPLACE VIEW records_ready_for_archival AS
SELECT
  dl.id,
  dl.table_name,
  dl.record_id,
  rp.policy_name,
  rp.archive_days,
  dl.created_at
FROM data_lifecycle dl
JOIN retention_policies rp ON dl.policy_id = rp.id
WHERE dl.archived_at IS NULL
  AND dl.deleted_at IS NULL
  AND dl.legal_hold = false
  AND rp.archive_days IS NOT NULL
  AND dl.created_at <= NOW() - (rp.archive_days || ' days')::INTERVAL
ORDER BY dl.created_at ASC;

-- View: Expired Records Ready for Deletion
CREATE OR REPLACE VIEW expired_records AS
SELECT
  dl.id,
  dl.table_name,
  dl.record_id,
  rp.policy_name,
  dl.expires_at,
  EXTRACT(DAY FROM NOW() - dl.expires_at) as days_expired
FROM data_lifecycle dl
JOIN retention_policies rp ON dl.policy_id = rp.id
WHERE dl.deleted_at IS NULL
  AND dl.legal_hold = false
  AND dl.expires_at <= NOW()
ORDER BY dl.expires_at ASC;

-- Comments
COMMENT ON TABLE retention_policies IS 'Defines data retention policies for different data types';
COMMENT ON TABLE data_lifecycle IS 'Tracks lifecycle of all records subject to retention policies';
COMMENT ON TABLE deletion_log IS 'Audit trail of all permanent deletions';
COMMENT ON TABLE archived_data IS 'Cold storage for archived records';
COMMENT ON TABLE retention_events IS 'Event log for all retention-related activities';
COMMENT ON TABLE legal_holds IS 'Tracks legal holds preventing data deletion';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
