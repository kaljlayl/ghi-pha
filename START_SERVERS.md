# Start GHI Servers - Quick Reference

## Backend (Terminal 1)

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test it works:**
```bash
curl http://localhost:8000/api/v1/signals/map-data
```

Should return JSON with markers array.

---

## Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

**You should see:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open browser:**
- Navigate to: http://localhost:5173
- Login if required
- View Dashboard - map should load with 5 markers

---

## Quick Checks

### Backend Health
```bash
curl http://localhost:8000/docs
```
Should open OpenAPI docs

### Map Data
```bash
curl http://localhost:8000/api/v1/signals/map-data
```
Should return JSON with 5 markers

### Database
```bash
cd backend
venv\Scripts\activate
python -c "from app.models.schema import Signal; from app.database import SessionLocal; db = SessionLocal(); print(f'Signals: {db.query(Signal).count()}'); print(f'Geocoded: {db.query(Signal).filter(Signal.latitude.isnot(None)).count()}'); db.close()"
```

Should show: Signals: 5, Geocoded: 5

---

## Troubleshooting

**"NO SIGNALS WITH LOCATION DATA"**
- Backend not running → Start backend first
- Backend error → Check terminal for errors
- Wrong port → Backend must be on :8000
- CORS error → Check browser console (F12)

**"Internal Server Error"**
- Not using venv → Must activate venv first
- Missing dependencies → Run `venv\Scripts\pip install -r requirements.txt`
- Database issue → Check backend/ghi_system.db exists

**Notification Errors (500)**
- If notifications fail to load, see [KNOWN_ISSUES.md](KNOWN_ISSUES.md#resolved-notification-uuid-type-mismatch-2026-01-30)
- Backend bugfix documentation: [backend/BUGFIXES.md](backend/BUGFIXES.md)

**Port already in use**
- Kill process: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`
- Or use different port: `uvicorn app.main:app --port 8001`

---

## Documentation

- **Bug Reports**: [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- **Backend Fixes**: [backend/BUGFIXES.md](backend/BUGFIXES.md)
- **Auth Setup**: [backend/AUTH_SETUP.md](backend/AUTH_SETUP.md)
- **QA Checklist**: [.loki/QA_CHECKLIST.md](.loki/QA_CHECKLIST.md)
