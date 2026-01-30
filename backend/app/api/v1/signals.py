from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schema import Signal
from app.models.schemas_api import SignalResponse, SignalUpdate, FilterOptionsResponse, MapDataResponse, MapMarker, HeatmapPoint
from app.services.beacon_collector import BeaconCollector

router = APIRouter()

@router.get("/", response_model=List[SignalResponse])
def get_signals(
    status: str = None,
    disease: str = None,
    location: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Signal)
    if status:
        query = query.filter(Signal.triage_status == status)
    if disease:
        query = query.filter(Signal.disease == disease)
    if location:
        # Match either country or location field
        query = query.filter(
            (Signal.country == location) | (Signal.location == location)
        )
    return query.order_by(Signal.priority_score.desc()).all()

@router.get("/filters", response_model=FilterOptionsResponse)
def get_filter_options(db: Session = Depends(get_db)):
    """Get distinct values for disease and location filters"""

    # Get distinct diseases
    diseases = db.query(Signal.disease)\
        .distinct()\
        .order_by(Signal.disease)\
        .all()

    # Get distinct countries and locations, combine them
    countries = db.query(Signal.country).distinct().all()
    locations = db.query(Signal.location)\
        .filter(Signal.location.isnot(None))\
        .distinct()\
        .all()

    all_locations = list(set(
        [c[0] for c in countries] + [l[0] for l in locations]
    ))
    all_locations.sort()

    return {
        "diseases": [d[0] for d in diseases],
        "locations": all_locations
    }

@router.get("/{signal_id}", response_model=SignalResponse)
def get_signal(signal_id: str, db: Session = Depends(get_db)):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal

@router.post("/{signal_id}/triage")
def triage_signal(signal_id: str, update: SignalUpdate, db: Session = Depends(get_db)):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    if update.triage_status:
        signal.triage_status = update.triage_status
    if update.triage_notes:
        signal.triage_notes = update.triage_notes
    if update.rejection_reason:
        signal.rejection_reason = update.rejection_reason
    if update.current_status:
        signal.current_status = update.current_status
    
    db.commit()
    return {"message": f"Signal {signal_id} triaged successfully"}

@router.post("/poll-beacon")
async def poll_beacon(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger a Beacon poll in the background"""
    collector = BeaconCollector(db)
    background_tasks.add_task(collector.fetch_and_process)
    return {"message": "Beacon sync started in background"}


@router.get("/map-data", response_model=MapDataResponse)
def get_map_data(
    status: str = None,
    min_priority: float = None,
    db: Session = Depends(get_db)
):
    """
    Get optimized map data for visualization.

    Returns signals with coordinates as markers and heatmap points.
    Only returns signals that have been successfully geocoded.

    Args:
        status: Optional filter by triage_status
        min_priority: Optional minimum priority score
        db: Database session

    Returns:
        MapDataResponse with markers and heatmap_points arrays
    """
    # Query signals with coordinates
    query = db.query(Signal).filter(
        Signal.latitude.isnot(None),
        Signal.longitude.isnot(None)
    )

    # Apply filters
    if status:
        query = query.filter(Signal.triage_status == status)
    if min_priority is not None:
        query = query.filter(Signal.priority_score >= min_priority)

    signals = query.all()

    # Build markers
    markers = [
        MapMarker(
            id=str(signal.id),
            latitude=float(signal.latitude),
            longitude=float(signal.longitude),
            priority_score=float(signal.priority_score) if signal.priority_score else 0.0,
            disease=signal.disease,
            country=signal.country,
            location=signal.location,
            cases=signal.cases,
            deaths=signal.deaths,
            triage_status=signal.triage_status
        )
        for signal in signals
    ]

    # Build heatmap points (normalized intensity 0-1)
    heatmap_points = [
        HeatmapPoint(
            latitude=float(signal.latitude),
            longitude=float(signal.longitude),
            intensity=min(1.0, float(signal.priority_score or 0.0) / 100.0)
        )
        for signal in signals
    ]

    return MapDataResponse(
        markers=markers,
        heatmap_points=heatmap_points,
        total_signals=len(signals)
    )
