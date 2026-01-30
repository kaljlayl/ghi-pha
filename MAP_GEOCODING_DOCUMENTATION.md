# Map Visualization & Geocoding Documentation

## Overview

The GHI PHA system includes an interactive surveillance map that displays disease outbreak signals with geographic coordinates. This document explains how the geocoding system works and how map data is rendered.

## Table of Contents

1. [Geocoding System](#geocoding-system)
2. [Map Data API](#map-data-api)
3. [Frontend Map Component](#frontend-map-component)
4. [No API Keys Required](#no-api-keys-required)
5. [Troubleshooting](#troubleshooting)

---

## Geocoding System

### Architecture

The geocoding service automatically converts location data (country + specific location) into latitude/longitude coordinates for map visualization.

**File:** [backend/app/services/geocoding_service.py](backend/app/services/geocoding_service.py)

### Four-Step Fallback Strategy

1. **Database Cache** (Instant)
   - Checks for previously geocoded coordinates using MD5 hash of `country + location`
   - Returns cached coordinates immediately if found

2. **Specific Location Geocoding** (OpenStreetMap Nominatim API)
   - Queries: `"{location}, {country}"`
   - Example: `"Prey Veng Province, Cambodia"`
   - Includes 1.1-second delay for rate limiting (Nominatim ToS compliance)

3. **Country Center Fallback** (Hardcoded Dictionary)
   - Uses `COUNTRY_COORDINATES` dictionary with 140+ countries
   - Returns geographic center point if specific location fails
   - Example: Democratic Republic of the Congo → `-4.0383, 21.7587`

4. **API Country Lookup** (Nominatim API)
   - Last resort: queries Nominatim with just country name
   - Returns `'failed'` geocode_source if all methods fail

### Geocoding Result

```python
{
    'latitude': float,           # Decimal degrees
    'longitude': float,          # Decimal degrees
    'geocode_source': str,       # 'cache' | 'location' | 'country' | 'failed'
    'geocoded_at': datetime,     # Timestamp of geocoding
    'location_hash': str         # MD5 hash for caching
}
```

### Database Schema

**Signals Table** includes geocoding fields:

```python
latitude = Column(Numeric(10, 7), nullable=True)
longitude = Column(Numeric(10, 7), nullable=True)
geocoded_at = Column(DateTime, nullable=True)
geocode_source = Column(String(50), nullable=True)
location_hash = Column(String(32), nullable=True, index=True)
```

### Automatic Geocoding

#### BeaconCollector (Live Scraping)

**File:** [backend/app/services/beacon_collector.py](backend/app/services/beacon_collector.py) (line 177)

```python
geocode_result = geocode_signal_location(country, location, db=self.db)
```

Automatically geocodes all signals scraped from WHO Beacon before database insertion.

#### Seed Script (Sample Data)

**File:** [backend/seed_sample_signals.py](backend/seed_sample_signals.py) (lines 118-128)

```python
# Geocode the location
geocode_result = {}
try:
    geocode_result = geocode_signal_location(
        country=signal_data["country"],
        location=signal_data.get("location"),
        db=db
    )
    geocode_status = f"[geocoded: {geocode_result.get('geocode_source', 'unknown')}]"
except Exception as e:
    geocode_status = f"[geocoding failed: {str(e)}]"
```

Sample signals are geocoded when seeded to the database.

---

## Map Data API

### Endpoint: `/api/v1/signals/map-data`

**File:** [backend/app/api/v1/signals.py](backend/app/api/v1/signals.py) (lines 90-155)

**Method:** GET

**Query Parameters:**
- `status` (optional): Filter by triage_status
- `min_priority` (optional): Minimum priority score

**Response:**

```json
{
  "markers": [
    {
      "id": "uuid",
      "latitude": 11.4820562,
      "longitude": 105.3244566,
      "priority_score": 95.0,
      "disease": "Influenza A(H5N1)",
      "country": "Cambodia",
      "location": "Prey Veng Province",
      "cases": 1,
      "deaths": 1,
      "triage_status": "Pending Triage"
    }
  ],
  "heatmap_points": [
    {
      "latitude": 11.4820562,
      "longitude": 105.3244566,
      "intensity": 0.95
    }
  ],
  "total_signals": 25
}
```

### Backend Filtering

The endpoint **only returns signals with valid coordinates**:

```python
query = db.query(Signal).filter(
    Signal.latitude.isnot(None),
    Signal.longitude.isnot(None)
)
```

This ensures the frontend receives optimized, map-ready data.

---

## Frontend Map Component

### Data Fetching Hook

**File:** [frontend/src/hooks/useMapData.ts](frontend/src/hooks/useMapData.ts)

```typescript
export function useMapData(pollIntervalMs: number = 30000) {
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const data = await fetchMapData();
        setMapData(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch map data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
    const interval = setInterval(loadMapData, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { mapData, loading, error };
}
```

**Features:**
- Polls `/api/v1/signals/map-data` every 30 seconds (configurable)
- Returns markers and heatmap points
- Handles errors gracefully

### Dashboard Integration

**File:** [frontend/src/views/Dashboard.tsx](frontend/src/views/Dashboard.tsx)

```typescript
const Dashboard = () => {
  const { signals, loading, error } = useLiveSignals({ pollIntervalMs: 20000 });
  const { mapData } = useMapData(20000);

  return (
    <SurveillanceMap signals={mapData?.markers || []} height="calc(100vh - 280px)" />
  );
};
```

### SurveillanceMap Component

**File:** [frontend/src/components/SurveillanceMap.tsx](frontend/src/components/SurveillanceMap.tsx)

**Features:**
- **Cluster View**: Groups nearby signals with `react-leaflet-cluster`
- **Heatmap View**: Shows intensity based on priority scores
- **Circle Markers**: Color-coded by priority (4 tiers)
- **Popups**: Display disease, location, cases, deaths, CFR, priority, status
- **Base Map**: CartoDB Dark Matter tiles centered on Riyadh

**Priority Color Coding:**
- Priority < 50: Small light blue marker
- Priority 50-69: Medium cyan marker
- Priority 70-84: Large orange marker
- Priority ≥ 85: Extra-large red marker

---

## No API Keys Required

### Free & Open Source Geocoding

The system uses **OpenStreetMap Nominatim**, which:
- ✅ **No API key required**
- ✅ **Free for non-commercial use**
- ✅ **Rate-limited to 1 request per second** (handled automatically)
- ✅ **140+ country fallback dictionary** (no API needed)

### Nominatim Terms of Service

**Compliance:**
- Maximum 1 request per second (enforced with 1.1s delay)
- User-Agent header includes contact info
- Results cached in database to minimize API calls

**File:** [backend/app/services/geocoding_service.py](backend/app/services/geocoding_service.py) (lines 90-92)

```python
time.sleep(1.1)  # Rate limit: max 1 req/sec per Nominatim ToS
headers = {'User-Agent': 'GHI-PHA-System/1.0 (contact@example.com)'}
```

---

## Troubleshooting

### Map Shows "No signals with location data"

**Cause:** Signals in database don't have latitude/longitude coordinates

**Solution:**

1. **Check database for coordinates:**

```bash
cd backend
python -c "from app.database import SessionLocal; from app.models.schema import Signal; db = SessionLocal(); signals = db.query(Signal).all(); print(f'Signals with coords: {sum(1 for s in signals if s.latitude and s.longitude)}/{len(signals)}')"
```

2. **If signals have coordinates, check frontend console:**
   - Open browser DevTools (F12)
   - Check Network tab for `/api/v1/signals/map-data` request
   - Should return 200 OK with JSON containing markers

3. **If frontend shows errors, restart development server:**

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
uvicorn app.main:app --reload
```

### Geocoding Fails for Specific Locations

**Symptoms:** Signal has `geocode_source: 'failed'`

**Causes:**
1. Location name not recognized by Nominatim
2. Country not in fallback dictionary
3. Network issues with Nominatim API

**Solution:**

1. **Check geocoding result:**

```bash
cd backend
python -c "from app.services.geocoding_service import geocode_signal_location; from app.database import SessionLocal; db = SessionLocal(); result = geocode_signal_location('Yemen', 'Hodeidah Governorate', db); print(result)"
```

2. **Add country to fallback dictionary if missing:**

Edit `backend/app/services/geocoding_service.py` and add to `COUNTRY_COORDINATES`:

```python
COUNTRY_COORDINATES = {
    # ...existing countries...
    "Your Country": (latitude, longitude),
}
```

### Slow Initial Geocoding

**Expected:** First-time geocoding takes ~1.1 seconds per location due to Nominatim rate limiting.

**Optimization:** Subsequent lookups use database cache (instant).

**Example:** 25 signals × 1.1s = ~28 seconds for first seed, then instant on re-seed.

### Map Markers Not Clickable

**Cause:** Popup interaction disabled or z-index issue

**Solution:** Check `SurveillanceMap.tsx` for `interactive` prop on markers:

```typescript
<CircleMarker
  center={[signal.latitude, signal.longitude]}
  radius={radius}
  pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
>
  <Popup>
    {/* Popup content */}
  </Popup>
</CircleMarker>
```

---

## Performance Considerations

### Database Caching

- All geocoded coordinates stored in database
- `location_hash` column indexed for fast lookups
- Avoids redundant API calls for duplicate locations

### Rate Limiting

- Nominatim API: 1 request/second enforced
- Cache-first strategy minimizes API usage
- Country fallback provides instant results

### Frontend Optimization

- Map data fetched separately from general signals
- Backend pre-filters signals with coordinates
- Polling interval configurable (default 30s)
- React hooks prevent unnecessary re-renders

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/app/services/geocoding_service.py` | Core geocoding logic |
| `backend/app/services/beacon_collector.py` | Automatic geocoding during scraping |
| `backend/seed_sample_signals.py` | Sample data geocoding |
| `backend/app/api/v1/signals.py` | Map data API endpoint |
| `frontend/src/hooks/useMapData.ts` | Map data fetching hook |
| `frontend/src/components/SurveillanceMap.tsx` | Map visualization component |
| `frontend/src/views/Dashboard.tsx` | Dashboard with map integration |
| `frontend/src/api/ghi.ts` | API client with `fetchMapData()` |

---

## Summary

The GHI PHA geocoding and map system provides:

✅ **Automatic geocoding** for all signals
✅ **No API keys required** (uses free OpenStreetMap)
✅ **Four-level fallback** (cache → location → country → API)
✅ **Optimized performance** (database caching, rate limiting)
✅ **Real-time updates** (polling every 20-30 seconds)
✅ **Interactive map** (cluster + heatmap views)

For additional support, check the troubleshooting section or review the related files listed above.
