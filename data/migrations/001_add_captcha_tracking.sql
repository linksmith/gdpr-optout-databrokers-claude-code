-- Migration: Add CAPTCHA tracking fields to existing submissions table
-- Run this if you already have a submissions.db from Phase 1
-- Usage: sqlite3 data/submissions.db < data/migrations/001_add_captcha_tracking.sql

-- Add CAPTCHA tracking columns to submissions table
ALTER TABLE submissions ADD COLUMN captcha_encountered BOOLEAN DEFAULT 0;
ALTER TABLE submissions ADD COLUMN captcha_type TEXT;
ALTER TABLE submissions ADD COLUMN captcha_solve_method TEXT;
ALTER TABLE submissions ADD COLUMN captcha_solve_time_seconds REAL;
ALTER TABLE submissions ADD COLUMN captcha_api_cost REAL;
ALTER TABLE submissions ADD COLUMN captcha_api_provider TEXT;

-- Create CAPTCHA statistics table
CREATE TABLE IF NOT EXISTS captcha_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    captcha_type TEXT NOT NULL,

    -- Solve attempt details
    solve_method TEXT NOT NULL,  -- api, manual
    api_provider TEXT,
    success BOOLEAN NOT NULL,
    solve_time_seconds REAL,
    api_cost REAL,
    error_message TEXT,

    -- Context
    page_url TEXT,
    submission_id INTEGER REFERENCES submissions(id),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_captcha_stats_broker_id ON captcha_stats(broker_id);
CREATE INDEX IF NOT EXISTS idx_captcha_stats_timestamp ON captcha_stats(timestamp);

-- Update schema version (create table if it doesn't exist)
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Add CAPTCHA tracking fields and captcha_stats table');
