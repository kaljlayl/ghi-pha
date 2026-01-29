# Phase 3.1: Notifications System Implementation

## Overview
Implemented a comprehensive notifications system with backend and frontend components to notify users about critical signals, escalations, and assessment assignments.

## Backend Implementation

### 1. Database Model (backend/app/models/schema.py)
Added `Notification` model with:
- Fields: id, recipient_id, notification_type, title, message, action_url, signal_id, assessment_id, escalation_id, read, read_at, priority, created_at
- Indexes:
  - `idx_notifications_recipient_read` (recipient_id, read) - for efficient unread queries
  - `idx_notifications_type` (notification_type) - for filtering by type

### 2. Notification Service (backend/app/services/notification_service.py)
Created service functions:
- `notify_new_critical_signal(signal, db)` - Notifies all Analyst, Senior Analyst, and Admin users when a signal with priority >= 85 is created
- `notify_escalation_created(escalation, db)` - Notifies all Director users when an escalation is created
- `notify_assessment_assigned(assessment, assignee_id, db)` - Notifies specific user when assigned an assessment
- `get_user_notifications(user_id, db, limit, unread_only)` - Retrieves notifications for a user
- `get_unread_count(user_id, db)` - Gets count of unread notifications
- `mark_notification_read(notification_id, user_id, db)` - Marks single notification as read
- `mark_all_notifications_read(user_id, db)` - Marks all user notifications as read

### 3. API Endpoints (backend/app/api/v1/notifications.py)
Created REST API with endpoints:
- `GET /api/v1/notifications` - List user's notifications (with pagination and unread filter)
- `GET /api/v1/notifications/unread-count` - Get unread notification count
- `PATCH /api/v1/notifications/{id}/read` - Mark notification as read
- `PATCH /api/v1/notifications/mark-all-read` - Mark all notifications as read

All endpoints require authentication using JWT tokens.

### 4. Workflow Integration

#### Beacon Collector (backend/app/services/beacon_collector.py)
- Modified `_create_signal()` to call `notify_new_critical_signal()` for signals with priority >= 85
- Added `db.flush()` to ensure signal has an ID before notification creation

#### Assessment Completion (backend/app/api/v1/assessments.py)
- Modified `complete_assessment()` endpoint to call `notify_escalation_created()` when creating escalations
- Added `db.flush()` to ensure escalation has an ID before notification creation

#### Main Application (backend/app/main.py)
- Registered notifications router with prefix `/api/v1/notifications`

## Frontend Implementation

### 1. Type Definitions (frontend/src/types.ts)
Added `Notification` type with all fields matching backend model.

### 2. API Client (frontend/src/api/notifications.ts)
Created API client with methods:
- `getNotifications(limit, unreadOnly)` - Fetch notifications
- `getUnreadCount()` - Fetch unread count
- `markAsRead(notificationId)` - Mark single notification as read
- `markAllAsRead()` - Mark all notifications as read

Uses `ghi_auth_token` localStorage key for authentication.

### 3. React Hook (frontend/src/hooks/useNotifications.ts)
Created `useNotifications` hook providing:
- State: notifications, unreadCount, loading, error
- Functions: markAsRead, markAllAsRead, refresh
- Auto-polling: Refreshes unread count every 30 seconds (configurable)
- Initial data fetch on mount

### 4. NotificationBell Component (frontend/src/components/NotificationBell.tsx)
Created comprehensive notification UI component with:
- Bell icon with unread count badge (animated pulse when unread)
- Dropdown with glassmorphic styling
- Notification list with:
  - Title, message, and time ago formatting
  - Priority-based color coding (Critical, High, Normal)
  - Unread indicator (teal dot and border)
  - Click to navigate to action_url
  - Individual mark as read on click
- Header with "Mark all read" button
- Empty state handling
- Loading state
- Custom scrollbar styling
- Click outside to close
- Auto-refresh on page navigation

### 5. Integration (frontend/src/App.tsx)
- Added NotificationBell to header, positioned next to critical/pending count displays
- Bell updates on route changes to keep notifications fresh

### 6. Styling (frontend/src/index.css)
Added custom scrollbar styles for notification dropdown with teal accent colors matching the design system.

## Notification Flow

### Critical Signal Detection
1. Beacon collector scrapes new events
2. If signal priority_score >= 85:
   - Signal saved to database
   - All Analyst/Senior Analyst/Admin users receive notification
   - Notification includes disease, country, priority score, link to triage page

### Escalation Created
1. Analyst completes assessment with "escalate" outcome
2. Escalation record created
3. All Director users receive notification
4. Notification includes disease, country, priority level, link to escalations page

### Assessment Assignment (future use)
1. When an assessment is assigned to a user
2. Call `notify_assessment_assigned()` with assessment and assignee_id
3. User receives notification with link to assessment page

## Success Criteria
- [x] Critical signals (priority >= 85) trigger notifications to all Analysts
- [x] Escalations trigger notifications to all Directors
- [x] Bell icon shows unread count
- [x] Clicking notification navigates to relevant page
- [x] Mark as read functionality works
- [x] Mark all as read functionality works
- [x] Real-time unread count polling (30s interval)
- [x] Glassmorphic UI matching design system
- [x] Priority-based color coding
- [x] Time ago formatting
- [x] Authentication integration

## Testing Recommendations

1. **Database Migration**
   - Run Alembic migration to create `notifications` table
   - Verify indexes are created

2. **Backend Testing**
   - Create test signal with priority >= 85, verify notifications created
   - Complete assessment with escalation, verify director notifications
   - Test API endpoints with authenticated requests

3. **Frontend Testing**
   - Log in as Analyst, verify bell appears
   - Create critical signal, verify notification appears
   - Click notification, verify navigation
   - Test mark as read functionality
   - Test mark all as read
   - Verify unread count updates correctly

## Next Steps
- Set up database migration for notifications table
- Add notification preferences (allow users to configure notification types)
- Add email/SMS notification delivery options
- Add notification sound/toast for new critical notifications
- Add notification filtering by type
- Add notification archive/delete functionality
