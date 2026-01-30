# GHI-PHA Known Issues & Resolutions

This document tracks known issues, bugs, and their resolutions across the GHI-PHA system.

---

## Resolved Issues

### [RESOLVED] React-Leaflet "Map container is already initialized" (2026-01-30)

**Status:** ✅ Fixed  
**Severity:** Medium (frontend crash in dev)  
**Components:** Frontend (React-Leaflet / Leaflet)

**Symptoms:**
- Dashboard fails with `Error: Map container is already initialized`
- ErrorBoundary shows stack trace from `react-leaflet`

**Root Cause:**
React 18 StrictMode and Vite HMR can mount/unmount the map component twice, leaving the Leaflet container initialized and causing a duplicate initialization.

**Resolution:**
- Track the Leaflet map instance and remove it on unmount
- Clear the container’s internal `_leaflet_id` to allow safe re-init

**Files Modified:**
- `frontend/src/components/SurveillanceMap.tsx`

---

### [RESOLVED] Notification UUID Type Mismatch (2026-01-30)

**Status:** ✅ Fixed
**Severity:** High (500 errors on notification endpoints)
**Components:** Backend API, Notification Service

**Symptoms:**
- `/api/v1/notifications/` returns 500 Internal Server Error
- `/api/v1/notifications/unread-count` returns 500 Internal Server Error
- Backend logs show: `AttributeError: 'str' object has no attribute 'hex'`
- SQLAlchemy error when querying notifications by recipient_id

**Root Cause:**
Type mismatch between API layer (passing strings) and database schema (expecting UUID objects). The `recipient_id` column uses `UUID(as_uuid=True)` but the API was converting user IDs to strings before querying.

**Resolution:**
- Updated service layer functions to accept `UUID` type instead of `str`
- Removed `str()` conversions in API layer
- Updated path parameter types to use `UUID` directly
- See [backend/BUGFIXES.md](backend/BUGFIXES.md) for detailed technical documentation

**Files Modified:**
- `backend/app/services/notification_service.py`
- `backend/app/api/v1/notifications.py`

**Verification:**
```bash
# Test the fix
python "C:\Users\K\AppData\Local\Temp\claude\d--GHI-ghi-pha\0d9411dc-43d8-404a-8c7c-48b367f5e834\scratchpad\test_notifications.py"
```

---

## Active Issues

None currently tracked.

---

## Best Practices Learned

### UUID Handling
**Pattern:** When working with UUID database columns:
1. Keep UUID objects as UUID throughout the application stack
2. Only convert to strings for JSON serialization (Pydantic handles automatically)
3. Use `UUID` type hints from the `uuid` module
4. FastAPI automatically converts string path/query parameters when type hint is `UUID`

**Anti-pattern to avoid:**
```python
# DON'T DO THIS
user_id = str(current_user.id)  # Converting UUID to string
service.get_notifications(user_id, db)  # Passing string to query UUID column

# DO THIS INSTEAD
service.get_notifications(current_user.id, db)  # Pass UUID directly
```

---

## Reporting New Issues

When documenting new issues, include:
1. **Symptoms:** Error messages, affected endpoints, user impact
2. **Reproduction steps:** How to trigger the issue
3. **Root cause analysis:** Technical explanation
4. **Resolution:** Changes made to fix
5. **Verification:** How to confirm the fix works

---
