-- GDPR Opt-Out Database Schema (Phase 2A - with CAPTCHA tracking)
-- This schema includes all tables for tracking opt-out submissions,
-- verification emails, and CAPTCHA solving metrics.

-- Main submissions tracking table
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- Status values: pending, submitted, awaiting_verification,
    --                verified, completed, failed, skipped

    submitted_at TIMESTAMP,
    verified_at TIMESTAMP,
    completed_at TIMESTAMP,

    email_alias TEXT,
    screenshot_path TEXT,
    confirmation_screenshot_path TEXT,

    notes TEXT,
    error_message TEXT,

    -- CAPTCHA tracking (Phase 2A)
    captcha_encountered BOOLEAN DEFAULT 0,
    captcha_type TEXT,  -- recaptcha_v2, recaptcha_v3, hcaptcha, turnstile, none
    captcha_solve_method TEXT,  -- api, manual, none
    captcha_solve_time_seconds REAL,
    captcha_api_cost REAL,
    captcha_api_provider TEXT,  -- 2captcha, anti-captcha, capsolver

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tracking
CREATE TABLE IF NOT EXISTS verification_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    submission_id INTEGER REFERENCES submissions(id),

    received_at TIMESTAMP,
    subject TEXT,
    verification_link TEXT,
    clicked_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for all actions
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    broker_id TEXT,
    details TEXT,  -- JSON
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form analysis table (for Phase 2B automation)
CREATE TABLE IF NOT EXISTS form_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL UNIQUE,

    -- Page structure
    page_url TEXT NOT NULL,
    form_selector TEXT,
    multi_step BOOLEAN DEFAULT 0,
    steps_count INTEGER,

    -- Field mappings (JSON)
    field_mappings TEXT,  -- JSON: {"first_name": {"selector": "#fname", "type": "text", ...}}

    -- CAPTCHA details
    captcha_type TEXT,  -- recaptcha_v2, recaptcha_v3, hcaptcha, turnstile, none
    captcha_selector TEXT,
    captcha_sitekey TEXT,  -- Cached sitekey for faster solving

    -- Submit details
    submit_button_selector TEXT,
    confirmation_selector TEXT,
    confirmation_text_pattern TEXT,

    -- Behavioral requirements
    requires_search_first BOOLEAN DEFAULT 0,
    required_delays TEXT,  -- JSON: {"after_page_load": 2000, "before_submit": 1000}
    uses_ajax BOOLEAN DEFAULT 0,
    redirect_after_submit BOOLEAN DEFAULT 0,
    redirect_url_pattern TEXT,

    -- Analysis metadata
    raw_technical_notes TEXT,
    analyzed_by TEXT,  -- claude_code, manual
    known_working BOOLEAN DEFAULT 1,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_successful_submission TIMESTAMP
);

-- CAPTCHA solving statistics (Phase 2A analytics)
CREATE TABLE IF NOT EXISTS captcha_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    captcha_type TEXT NOT NULL,

    -- Solve attempt details
    solve_method TEXT NOT NULL,  -- api, manual
    api_provider TEXT,  -- 2captcha, anti-captcha, etc.
    success BOOLEAN NOT NULL,
    solve_time_seconds REAL,
    api_cost REAL,
    error_message TEXT,

    -- Context
    page_url TEXT,
    submission_id INTEGER REFERENCES submissions(id),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_broker_id ON submissions(broker_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_emails_broker_id ON verification_emails(broker_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_broker_id ON audit_log(broker_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_form_analysis_broker_id ON form_analysis(broker_id);
CREATE INDEX IF NOT EXISTS idx_captcha_stats_broker_id ON captcha_stats(broker_id);
CREATE INDEX IF NOT EXISTS idx_captcha_stats_timestamp ON captcha_stats(timestamp);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_submissions_timestamp
AFTER UPDATE ON submissions
BEGIN
    UPDATE submissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_form_analysis_timestamp
AFTER UPDATE ON form_analysis
BEGIN
    UPDATE form_analysis SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
