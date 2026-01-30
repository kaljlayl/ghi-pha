# GHI-PHA Backend Bugfixes

This document tracks bug fixes and resolutions in the GHI-PHA backend system.

---

## 2026-01-30: Notification UUID Type Mismatch

### Issue
Notification endpoints (`/api/v1/notifications/` and `/api/v1/notifications/unread-count`) were returning 500 Internal Server Errors with the following SQLAlchemy error:

```
AttributeError: 'str' object has no attribute 'hex'
sqlalchemy.exc.StatementError: (builtins.AttributeError) 'str' object has no attribute 'hex'
```

### Root Cause
The `Notification.recipient_id` column is defined as `UUID(as_uuid=True)` in the database schema, which expects UUID objects. However, the API layer was converting `current_user.id` to a string using `str(current_user.id)` before passing it to the service layer. When SQLAlchemy attempted to filter by this string value against a UUID column, it failed because strings don't have the `.hex` attribute that UUID objects possess.

**Type Mismatch Chain:**
1. `current_user.id` → UUID object (from authentication)
2. API layer converts → `str(current_user.id)` → string
3. Service layer receives string and queries against UUID column
4. SQLAlchemy attempts to access `.hex` attribute → Error

### Files Modified

#### 1. backend/app/services/notification_service.py
- Added `UUID` import from `uuid` module
- Updated function signatures to accept `UUID` instead of `str`:
  - `get_user_notifications(user_id: UUID, ...)`
  - `get_unread_count(user_id: UUID, ...)`
  - `mark_notification_read(notification_id: UUID, user_id: UUID, ...)`
  - `mark_all_notifications_read(user_id: UUID, ...)`
  - `notify_assessment_assigned(assessment: Assessment, assignee_id: UUID, ...)`

#### 2. backend/app/api/v1/notifications.py
- Added `UUID` import from `uuid` module
- Removed `str()` conversion in all endpoints:
  - `list_notifications()` - line 48: Changed `str(current_user.id)` to `current_user.id`
  - `get_unread_count()` - line 63: Changed `str(current_user.id)` to `current_user.id`
  - `mark_notification_read()` - line 74: Changed `str(current_user.id)` to `current_user.id`
  - `mark_all_read()` - line 94: Changed `str(current_user.id)` to `current_user.id`
- Updated `notification_id` path parameter type from `str` to `UUID` (line 69)

### Solution
Removed unnecessary string conversions in the API layer and updated type hints in the service layer to use UUID objects consistently throughout the stack. This ensures type-safe UUID handling from authentication through to database queries.

### Verification
After the fix:
- Notification endpoints return 200 OK
- Notification bell displays unread count correctly
- No SQLAlchemy UUID-related errors in backend logs
- Users can view, mark as read, and manage notifications without errors

### Pattern for Future Development
When working with UUID columns in the database:
1. Keep UUID objects as UUID throughout the stack (don't convert to strings)
2. Only convert UUIDs to strings for JSON serialization (Pydantic handles this automatically)
3. FastAPI automatically converts string path/query parameters to UUID when the type hint is `UUID`
4. Use consistent type hints: `UUID` from the `uuid` module

---
