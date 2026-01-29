-- Migration: Add notifications table
-- Created: 2026-01-30
-- Description: Creates the notifications table for Phase 3.1 implementation

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    signal_id UUID REFERENCES signals(id),
    assessment_id UUID REFERENCES assessments(id),
    escalation_id UUID REFERENCES escalations(id),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'Normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications for critical signals, escalations, and assignments';
COMMENT ON COLUMN notifications.recipient_id IS 'ID of the user who should receive this notification';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification: critical_signal, escalation_created, assessment_assigned';
COMMENT ON COLUMN notifications.priority IS 'Priority level: Critical, High, Medium, Normal';
COMMENT ON COLUMN notifications.action_url IS 'Frontend URL to navigate to when notification is clicked';
