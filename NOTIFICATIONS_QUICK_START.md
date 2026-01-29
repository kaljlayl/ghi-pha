# Notifications System - Quick Start Guide

## Setup

### 1. Database Migration

Run the SQL migration to create the notifications table:

**For PostgreSQL/Neon:**
```bash
cd backend
psql $DATABASE_URL -f migrations/001_add_notifications_table.sql
```

**For SQLite (local development):**
```bash
cd backend
sqlite3 ghi_system.db < migrations/001_add_notifications_table_sqlite.sql
```

**Or using SQLAlchemy (recommended):**
```bash
cd backend
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 2. Start Backend
```bash
cd backend
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
uvicorn app.main:app --reload
```

### 3. Start Frontend
```bash
cd frontend
npm install  # if not already done
npm run dev
```

## Testing the Notifications System

### Test 1: Critical Signal Notification

1. **Create a critical signal** (priority >= 85):
   - Option A: Use the beacon collector to fetch real data
   - Option B: Manually insert a signal via API or database with `priority_score >= 85`

2. **Verify notification created**:
   ```bash
   # Check notifications table
   sqlite3 backend/ghi_system.db "SELECT * FROM notifications;"
   ```

3. **Check frontend**:
   - Log in as an Analyst user
   - Look for the bell icon in the header (should show unread count)
   - Click bell to see notification about critical signal
   - Click notification to navigate to triage page

### Test 2: Escalation Notification

1. **Create and complete an assessment with escalation**:
   - Go to Triage page
   - Approve a signal for assessment
   - Go to Assessments page
   - Complete the assessment form
   - Choose "Escalate to Director" as outcome
   - Submit

2. **Verify notification created**:
   ```bash
   sqlite3 backend/ghi_system.db "SELECT * FROM notifications WHERE notification_type='escalation_created';"
   ```

3. **Check frontend**:
   - Log out and log in as a Director user
   - Check bell icon for unread count
   - Click bell to see escalation notification
   - Click notification to navigate to escalations page

### Test 3: Notification Actions

1. **Mark as Read**:
   - Click on an unread notification
   - Verify the teal dot disappears
   - Verify unread count decreases
   - Check database: `read` column should be TRUE

2. **Mark All as Read**:
   - Click "Mark all read" button in notification dropdown
   - Verify all notifications become read
   - Verify unread count goes to 0

3. **Auto-Refresh**:
   - Keep browser open
   - Create a new notification (e.g., via API or backend)
   - Wait 30 seconds
   - Verify unread count updates automatically

## API Testing

### Get Notifications
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=analyst1&password=password123" | jq -r .access_token)

# Get notifications
curl http://localhost:8000/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN" | jq

# Get unread count
curl http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Mark Notification as Read
```bash
# Get notification ID from list
NOTIF_ID="<notification-id-here>"

curl -X PATCH http://localhost:8000/api/v1/notifications/$NOTIF_ID/read \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Mark All as Read
```bash
curl -X PATCH http://localhost:8000/api/v1/notifications/mark-all-read \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Troubleshooting

### Notifications not appearing
1. Check that user is logged in (token in localStorage)
2. Check browser console for errors
3. Verify API is running and accessible
4. Check that notifications exist in database for that user

### Unread count not updating
1. Check that polling is enabled (30s interval)
2. Check network tab for API calls every 30s
3. Verify no CORS errors in console

### Notifications not being created
1. Check that signals have `priority_score >= 85`
2. Verify notification service is imported correctly
3. Check backend logs for errors
4. Verify database flush is happening before notification creation

### Bell icon not showing
1. Verify NotificationBell component is imported in App.tsx
2. Check that user is authenticated
3. Check browser console for import errors

## Expected Behavior

### Critical Signal Flow
1. Beacon collector finds new event with high priority
2. Signal created in database with `priority_score >= 85`
3. Notification service creates notification for all Analysts
4. Frontend bell icon updates within 30 seconds
5. Analyst sees notification in dropdown
6. Clicking notification navigates to triage page with signal highlighted

### Escalation Flow
1. Analyst completes assessment with "escalate" outcome
2. Escalation record created in database
3. Notification service creates notification for all Directors
4. Frontend bell icon updates within 30 seconds
5. Director sees notification in dropdown
6. Clicking notification navigates to escalations page

## Configuration

### Poll Interval
To change the notification polling interval, modify the `useNotifications` hook call in `NotificationBell.tsx`:
```typescript
const { ... } = useNotifications(60000); // Poll every 60 seconds instead of 30
```

### Notification Limit
To change how many notifications are loaded, modify the API call in `notifications.ts`:
```typescript
async getNotifications(limit = 100, unreadOnly = false) // Load 100 instead of 50
```

### Priority Threshold
To change the critical signal threshold, modify `beacon_collector.py`:
```python
if signal.priority_score and signal.priority_score >= 80:  # Changed from 85 to 80
    notification_service.notify_new_critical_signal(signal, self.db)
```
