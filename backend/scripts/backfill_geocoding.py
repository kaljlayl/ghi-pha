"""
Backfill Geocoding Script

Geocodes all existing signals that don't have coordinates.
Processes in batches to respect Nominatim rate limit (1 req/sec).

Usage:
    python backend/scripts/backfill_geocoding.py
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.schema import Signal
from app.services.geocoding_service import geocode_signal_location
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BATCH_SIZE = 50  # Process 50 signals at a time


def backfill_geocoding():
    """Backfill geocoding for all signals missing coordinates."""
    db: Session = SessionLocal()

    try:
        # Query signals without coordinates
        signals_to_geocode = db.query(Signal).filter(
            Signal.latitude.is_(None)
        ).all()

        total = len(signals_to_geocode)
        logger.info(f"Found {total} signals without coordinates")

        if total == 0:
            logger.info("All signals already geocoded!")
            return

        # Process in batches
        for i in range(0, total, BATCH_SIZE):
            batch = signals_to_geocode[i:i + BATCH_SIZE]
            logger.info(f"Processing batch {i // BATCH_SIZE + 1} ({i + 1}-{min(i + BATCH_SIZE, total)} of {total})")

            for signal in batch:
                try:
                    # Use country-only geocoding for backfill (faster, always succeeds)
                    # Cache-first lookup will check DB first
                    result = geocode_signal_location(signal.country, signal.location, db=db)

                    # Update signal
                    signal.latitude = result.get('latitude')
                    signal.longitude = result.get('longitude')
                    signal.geocoded_at = result.get('geocoded_at')
                    signal.geocode_source = result.get('geocode_source')
                    signal.location_hash = result.get('location_hash')

                    logger.info(
                        f"  ✓ {signal.country} {f'({signal.location})' if signal.location else ''}: "
                        f"{result.get('geocode_source')} → {result.get('latitude'):.4f}, {result.get('longitude'):.4f}"
                    )

                except Exception as e:
                    logger.error(f"  ✗ Failed to geocode {signal.country}: {str(e)}")

            # Commit batch
            db.commit()
            logger.info(f"Batch {i // BATCH_SIZE + 1} committed")

        logger.info(f"\n✓ Backfill complete! Geocoded {total} signals")

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}")
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    backfill_geocoding()
