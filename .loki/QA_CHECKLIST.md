# QA Checklist - Interactive Map Feature

**Phase:** DEVELOPMENT → QA Transition
**Feature:** Interactive Surveillance Map with Geocoding
**Date:** 2026-01-30

---

## Backend QA

### Geocoding Service
- [ ] Service successfully geocodes new signals
- [ ] Cache-first lookup prevents duplicate API calls
- [ ] Country fallback works for city-level failures
- [ ] Rate limiting (1.1s) prevents Nominatim blocking
- [ ] Error handling doesn't block signal creation
- [ ] Location hash correctly identifies duplicates

### Database Schema
- [ ] Signals table has all geocoding columns
- [ ] Indexes created: idx_signals_coords, idx_location_hash
- [ ] Existing signals backfilled successfully
- [ ] No performance degradation on queries

### Map API Endpoint
- [ ] GET /api/v1/signals/map-data returns 200
- [ ] Response matches MapDataResponse schema
- [ ] Markers array populated with geocoded signals
- [ ] Heatmap points calculated correctly
- [ ] Filter parameters work (status, min_priority)
- [ ] Returns empty arrays gracefully when no data

**Test Command:**
```bash
cd backend && python test_map_endpoint.py
```

---

## Frontend QA

### SurveillanceMap Component
- [ ] Map renders without errors
- [ ] Cluster view displays markers
- [ ] Heatmap view displays intensity overlay
- [ ] Toggle between cluster/heatmap works
- [ ] Markers color-coded by priority (red/gold/teal/green)
- [ ] Cluster icons show count correctly
- [ ] Popups display full signal details
- [ ] Auto-fit bounds centers map on markers
- [ ] Legend displays priority scale

### Dashboard Integration
- [ ] Map replaces placeholder correctly
- [ ] Real-time updates (20s polling) visible
- [ ] Map height appropriate (500px)
- [ ] Responsive layout maintained
- [ ] No console errors
- [ ] Loading state handled gracefully
- [ ] Empty state shows helpful message

**Test Steps:**
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Login at http://localhost:5173/login
4. Navigate to Dashboard
5. Verify map loads with markers
6. Test cluster/heatmap toggle
7. Click markers to verify popups
8. Wait 20 seconds, verify live update

---

## Data Quality

### Geocoding Coverage
- [ ] All signals attempt geocoding
- [ ] Success rate tracked in logs
- [ ] Failed geocodes logged with reason
- [ ] Manual review of failed cases

**Check Coverage:**
```python
from app.models.schema import Signal
from app.database import SessionLocal

db = SessionLocal()
total = db.query(Signal).count()
geocoded = db.query(Signal).filter(Signal.latitude.isnot(None)).count()
print(f"Coverage: {geocoded}/{total} ({geocoded/total*100:.1f}%)")
db.close()
```

---

## Performance

### Backend Performance
- [ ] Map endpoint responds < 500ms
- [ ] No N+1 queries
- [ ] Database indexes used
- [ ] Geocoding doesn't block response

### Frontend Performance
- [ ] Map renders in < 2 seconds
- [ ] Smooth cluster zoom animations
- [ ] No memory leaks (check DevTools)
- [ ] Build warnings addressed

---

## Edge Cases

- [ ] No signals with coordinates → shows empty state
- [ ] Single signal → map centers on it
- [ ] 1000+ signals → clustering works smoothly
- [ ] Invalid coordinates → filtered out gracefully
- [ ] Network error → retry mechanism works
- [ ] API timeout → error displayed to user

---

## Security

- [ ] No API keys exposed in frontend
- [ ] Nominatim rate limiting enforced
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented in marker popups
- [ ] Auth middleware protects endpoint (if required)

---

## Accessibility

- [ ] Map has keyboard navigation
- [ ] Screen reader can announce signal count
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible

---

## Documentation

- [ ] API endpoint documented in OpenAPI spec
- [ ] Component usage documented
- [ ] Geocoding service readme created
- [ ] Backfill script usage documented

---

## Deployment Readiness

- [ ] Environment variables documented
- [ ] Database migrations (if using Alembic)
- [ ] Frontend build successful
- [ ] No CRITICAL/HIGH security vulnerabilities
- [ ] All tests pass
- [ ] Rollback plan documented

---

## Sign-Off

**Developer:** Loki Mode (Claude Sonnet 4.5)
**Status:** READY FOR QA
**Blockers:** None

**Next Phase:** Manual QA verification → Production deployment
