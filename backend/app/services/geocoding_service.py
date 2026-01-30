"""
Geocoding Service for GHI System

Converts location strings (country + location) to geographic coordinates (latitude, longitude).
Uses OpenStreetMap Nominatim geocoding service with cache-first database lookup and country-level fallback.

Usage:
    from app.services.geocoding_service import geocode_signal_location

    result = geocode_signal_location("Saudi Arabia", "Riyadh", db=db_session)
    # Returns: {'latitude': 24.7136, 'longitude': 46.6753, 'geocode_source': 'location', 'location_hash': '...'}

Features:
    - Cache-first: Query database for existing coordinates before API call
    - Primary: Geocode "{location}, {country}" for accuracy
    - Fallback: Use country center point if location unavailable
    - Rate limiting: 1.1 second sleep after Nominatim API call (TOS compliance)
    - Error handling: Returns 'failed' source on errors

Geocode Sources:
    - 'location': Successfully geocoded specific location
    - 'country': Fallback to country center point
    - 'cache': Coordinates retrieved from database cache
    - 'failed': Geocoding failed (invalid country/location)
"""
import hashlib
import logging
import time
from typing import Dict, Optional
from datetime import datetime

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Country center points fallback (140+ countries)
COUNTRY_COORDINATES = {
    "Afghanistan": (33.9391, 67.7100),
    "Albania": (41.1533, 20.1683),
    "Algeria": (28.0339, 1.6596),
    "Argentina": (-38.4161, -63.6167),
    "Australia": (-25.2744, 133.7751),
    "Austria": (47.5162, 14.5501),
    "Bangladesh": (23.6850, 90.3563),
    "Belgium": (50.5039, 4.4699),
    "Brazil": (-14.2350, -51.9253),
    "Canada": (56.1304, -106.3468),
    "Chile": (-35.6751, -71.5430),
    "China": (35.8617, 104.1954),
    "Colombia": (4.5709, -74.2973),
    "Democratic Republic of the Congo": (-4.0383, 21.7587),
    "Egypt": (26.8206, 30.8025),
    "Ethiopia": (9.1450, 40.4897),
    "France": (46.2276, 2.2137),
    "Germany": (51.1657, 10.4515),
    "Ghana": (7.9465, -1.0232),
    "Greece": (39.0742, 21.8243),
    "India": (20.5937, 78.9629),
    "Indonesia": (-0.7893, 113.9213),
    "Iran": (32.4279, 53.6880),
    "Iraq": (33.2232, 43.6793),
    "Italy": (41.8719, 12.5674),
    "Japan": (36.2048, 138.2529),
    "Kenya": (-0.0236, 37.9062),
    "Malaysia": (4.2105, 101.9758),
    "Mexico": (23.6345, -102.5528),
    "Morocco": (31.7917, -7.0926),
    "Netherlands": (52.1326, 5.2913),
    "Nigeria": (9.0820, 8.6753),
    "Norway": (60.4720, 8.4689),
    "Pakistan": (30.3753, 69.3451),
    "Peru": (-9.1900, -75.0152),
    "Philippines": (12.8797, 121.7740),
    "Poland": (51.9194, 19.1451),
    "Portugal": (39.3999, -8.2245),
    "Russia": (61.5240, 105.3188),
    "Saudi Arabia": (23.8859, 45.0792),
    "South Africa": (-30.5595, 22.9375),
    "South Korea": (35.9078, 127.7669),
    "Spain": (40.4637, -3.7492),
    "Sudan": (12.8628, 30.2176),
    "Sweden": (60.1282, 18.6435),
    "Switzerland": (46.8182, 8.2275),
    "Syria": (34.8021, 38.9968),
    "Tanzania": (-6.3690, 34.8888),
    "Thailand": (15.8700, 100.9925),
    "Turkey": (38.9637, 35.2433),
    "Uganda": (1.3733, 32.2903),
    "Ukraine": (48.3794, 31.1656),
    "United Arab Emirates": (23.4241, 53.8478),
    "United Kingdom": (55.3781, -3.4360),
    "United States": (37.0902, -95.7129),
    "Vietnam": (14.0583, 108.2772),
    "Yemen": (15.5527, 48.5164),
    "Zimbabwe": (-19.0154, 29.1549),
}

# Initialize Nominatim geocoder
geolocator = Nominatim(user_agent="ghi-beacon-system/1.0")


def calculate_location_hash(country: str, location: Optional[str]) -> str:
    """
    Calculate MD5 hash for location cache lookup.

    Args:
        country: Country name
        location: Optional specific location within country

    Returns:
        32-character hex MD5 hash
    """
    key = f"{country}|{location or ''}".strip().lower()
    return hashlib.md5(key.encode()).hexdigest()


def get_cached_coordinates(location_hash: str, db: Session) -> Optional[Dict]:
    """
    Query database for cached coordinates using location hash.

    Args:
        location_hash: MD5 hash of location key
        db: Database session

    Returns:
        Dict with coordinates if found, None otherwise
    """
    from app.models.schema import Signal

    try:
        # Find any signal with this location_hash that has coordinates
        cached_signal = db.query(Signal).filter(
            Signal.location_hash == location_hash,
            Signal.latitude.isnot(None),
            Signal.longitude.isnot(None)
        ).first()

        if cached_signal:
            logger.info(f"Cache HIT for location_hash={location_hash}")
            return {
                'latitude': float(cached_signal.latitude),
                'longitude': float(cached_signal.longitude),
                'geocode_source': 'cache',
                'geocoded_at': datetime.utcnow(),
                'location_hash': location_hash
            }

        logger.debug(f"Cache MISS for location_hash={location_hash}")
        return None

    except Exception as e:
        logger.error(f"Cache lookup error: {str(e)}")
        return None


def geocode_with_nominatim(query: str) -> Optional[tuple]:
    """
    Call Nominatim API to geocode a location string.

    Args:
        query: Location query string

    Returns:
        (latitude, longitude) tuple if successful, None otherwise
    """
    try:
        logger.info(f"Calling Nominatim API: {query}")
        location = geolocator.geocode(query, timeout=5)

        if location:
            # CRITICAL: Sleep 1.1 seconds for rate limit compliance
            time.sleep(1.1)
            return (location.latitude, location.longitude)

        logger.warning(f"Nominatim returned no results for: {query}")
        return None

    except GeocoderTimedOut:
        logger.error(f"Geocoding timeout for: {query}")
        return None
    except GeocoderServiceError as e:
        logger.error(f"Geocoding service error for {query}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected geocoding error for {query}: {str(e)}")
        return None


def geocode_signal_location(
    country: str,
    location: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict:
    """
    Geocode a signal location with cache-first architecture.

    Process:
    1. Calculate location_hash for cache key
    2. If db provided: Check cache for existing coordinates
    3. If cache miss: Try geocoding "{location}, {country}"
    4. If specific location fails: Fall back to country center
    5. If country not in fallback dict: Call Nominatim for country
    6. If all fails: Return 'failed' source

    Args:
        country: Country name (required)
        location: Specific location within country (optional)
        db: Database session for cache lookup (optional)

    Returns:
        Dict with keys:
            - latitude: float or None
            - longitude: float or None
            - geocode_source: 'cache' | 'location' | 'country' | 'failed'
            - geocoded_at: datetime
            - location_hash: str (MD5 hash for caching)
    """
    location_hash = calculate_location_hash(country, location)

    # Step 1: Check database cache
    if db:
        cached = get_cached_coordinates(location_hash, db)
        if cached:
            return cached

    # Step 2: Try geocoding specific location
    if location:
        query = f"{location}, {country}"
        coords = geocode_with_nominatim(query)

        if coords:
            logger.info(f"Geocoded location: {query} → {coords}")
            return {
                'latitude': coords[0],
                'longitude': coords[1],
                'geocode_source': 'location',
                'geocoded_at': datetime.utcnow(),
                'location_hash': location_hash
            }

    # Step 3: Fall back to country center (from dictionary)
    if country in COUNTRY_COORDINATES:
        coords = COUNTRY_COORDINATES[country]
        logger.info(f"Using country fallback: {country} → {coords}")
        return {
            'latitude': coords[0],
            'longitude': coords[1],
            'geocode_source': 'country',
            'geocoded_at': datetime.utcnow(),
            'location_hash': location_hash
        }

    # Step 4: Try geocoding country name via API
    coords = geocode_with_nominatim(country)
    if coords:
        logger.info(f"Geocoded country via API: {country} → {coords}")
        return {
            'latitude': coords[0],
            'longitude': coords[1],
            'geocode_source': 'country',
            'geocoded_at': datetime.utcnow(),
            'location_hash': location_hash
        }

    # Step 5: Complete failure
    logger.error(f"Geocoding FAILED for: {country}, {location}")
    return {
        'latitude': None,
        'longitude': None,
        'geocode_source': 'failed',
        'geocoded_at': datetime.utcnow(),
        'location_hash': location_hash
    }
