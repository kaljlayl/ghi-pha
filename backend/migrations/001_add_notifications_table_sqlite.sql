-- Migration: Add notifications table (SQLite version)
-- Created: 2026-01-30
-- Description: Creates the notifications table for Phase 3.1 implementation

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    signal_id TEXT,
    assessment_id TEXT,
    escalation_id TEXT,
    read INTEGER DEFAULT 0,
    read_at TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'Normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signal_id) REFERENCES signals(id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    FOREIGN KEY (escalation_id) REFERENCES escalations(id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
