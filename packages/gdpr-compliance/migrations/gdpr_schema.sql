-- GDPR Compliance Database Schema
-- Complete schema for GDPR compliance implementation

-- User Consent Table
CREATE TABLE IF NOT EXISTS user_consent (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(100),
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_active_consent UNIQUE (user_id, consent_type, granted_at)
);

CREATE INDEX idx_consent_user ON user_consent(user_id);
CREATE INDEX idx_consent_type ON user_consent(consent_type);
CREATE INDEX idx_consent_granted ON user_consent(granted) WHERE withdrawn_at IS NULL;

-- Processing Activities (ROPA)
CREATE TABLE IF NOT EXISTS processing_activities (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(100) NOT NULL,
  data_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipients JSONB DEFAULT '[]'::jsonb,
  retention_period INTEGER,
  security_measures JSONB NOT NULL DEFAULT '[]'::jsonb,
  cross_border_transfer BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processing_legal_basis ON processing_activities(legal_basis);
CREATE INDEX idx_processing_subjects ON processing_activities USING GIN (data_subjects);
CREATE INDEX idx_processing_active ON processing_activities(active);

-- Data Subject Requests
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  verification_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_request_type CHECK (request_type IN ('access', 'erasure', 'rectification', 'portability', 'restriction', 'objection')),
  CONSTRAINT chk_status CHECK (status IN ('pending', 'in_progress', 'verification_required', 'completed', 'rejected', 'cancelled'))
);

CREATE INDEX idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_type ON data_subject_requests(request_type);
CREATE INDEX idx_dsr_submitted ON data_subject_requests(submitted_at);

-- Data Breaches
CREATE TABLE IF NOT EXISTS data_breaches (
  id UUID PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL,
  breach_type VARCHAR(100) NOT NULL,
  affected_users INTEGER NOT NULL DEFAULT 0,
  data_categories JSONB DEFAULT '[]'::jsonb,
  risk_level VARCHAR(50) NOT NULL,
  notified_at TIMESTAMPTZ,
  authority_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  description TEXT NOT NULL,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT chk_breach_type CHECK (breach_type IN ('confidentiality_breach', 'availability_breach', 'integrity_breach'))
);

CREATE INDEX idx_breach_detected ON data_breaches(detected_at);
CREATE INDEX idx_breach_risk ON data_breaches(risk_level);
CREATE INDEX idx_breach_unresolved ON data_breaches(resolved_at) WHERE resolved_at IS NULL;

-- Breach Notifications
CREATE TABLE IF NOT EXISTS breach_notifications (
  id UUID PRIMARY KEY,
  breach_id UUID NOT NULL REFERENCES data_breaches(id) ON DELETE CASCADE,
  recipient_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_recipient_type CHECK (recipient_type IN ('DPO', 'SUPERVISORY_AUTHORITY', 'USER'))
);

CREATE INDEX idx_breach_notif_breach ON breach_notifications(breach_id);
CREATE INDEX idx_breach_notif_type ON breach_notifications(recipient_type);

-- Processing Restrictions
CREATE TABLE IF NOT EXISTS processing_restrictions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  scope JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  restricted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lifted_at TIMESTAMPTZ,
  lift_reason TEXT,
  CONSTRAINT chk_restriction_reason CHECK (reason IN ('accuracy', 'unlawful', 'objection', 'legal_claim'))
);

CREATE INDEX idx_restriction_user ON processing_restrictions(user_id);
CREATE INDEX idx_restriction_status ON processing_restrictions(status);

-- Processing Objections
CREATE TABLE IF NOT EXISTS processing_objections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  objection_type VARCHAR(100) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  CONSTRAINT chk_objection_type CHECK (objection_type IN ('direct_marketing', 'legitimate_interests', 'profiling', 'research'))
);

CREATE INDEX idx_objection_user ON processing_objections(user_id);
CREATE INDEX idx_objection_type ON processing_objections(objection_type);

-- Cookie Consent
CREATE TABLE IF NOT EXISTS cookie_consent (
  id UUID PRIMARY KEY,
  user_id UUID,
  preferences JSONB NOT NULL,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cookie_user ON cookie_consent(user_id);

-- Data Transfers (Third Party)
CREATE TABLE IF NOT EXISTS data_transfers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_contact VARCHAR(255),
  data_categories JSONB NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(100) NOT NULL,
  safeguards TEXT,
  transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  revoked_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  CONSTRAINT chk_transfer_status CHECK (status IN ('ACTIVE', 'REVOKED', 'WITHDRAWN'))
);

CREATE INDEX idx_transfer_user ON data_transfers(user_id);
CREATE INDEX idx_transfer_status ON data_transfers(status);

-- Marketing Suppression List
CREATE TABLE IF NOT EXISTS marketing_suppression (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  reason VARCHAR(255) NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppression_user ON marketing_suppression(user_id);

-- Analytics Opt-out
CREATE TABLE IF NOT EXISTS analytics_opt_out (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_optout_user ON analytics_opt_out(user_id);

-- Research Exclusions
CREATE TABLE IF NOT EXISTS research_exclusions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_excl_user ON research_exclusions(user_id);

-- User Data Metadata
CREATE TABLE IF NOT EXISTS user_data_metadata (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  data_category VARCHAR(100) NOT NULL,
  restricted BOOLEAN DEFAULT false,
  restriction_reason TEXT,
  restricted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_category UNIQUE (user_id, data_category)
);

CREATE INDEX idx_metadata_user ON user_data_metadata(user_id);
CREATE INDEX idx_metadata_restricted ON user_data_metadata(restricted) WHERE restricted = true;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Incident Tickets
CREATE TABLE IF NOT EXISTS incident_tickets (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  assigned_to VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT chk_ticket_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'))
);

CREATE INDEX idx_incident_status ON incident_tickets(status);
CREATE INDEX idx_incident_severity ON incident_tickets(severity);
CREATE INDEX idx_incident_created ON incident_tickets(created_at);

-- Comments
COMMENT ON TABLE user_consent IS 'Records of user consent for various processing activities';
COMMENT ON TABLE processing_activities IS 'Record of Processing Activities (ROPA) - Article 30 GDPR';
COMMENT ON TABLE data_subject_requests IS 'Data Subject Rights requests (access, erasure, etc.)';
COMMENT ON TABLE data_breaches IS 'Data breach incident tracking and management';
COMMENT ON TABLE breach_notifications IS 'Breach notification history (72-hour requirement)';
COMMENT ON TABLE processing_restrictions IS 'Article 18 - Right to Restriction tracking';
COMMENT ON TABLE processing_objections IS 'Article 21 - Right to Object tracking';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
