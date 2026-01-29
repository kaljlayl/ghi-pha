from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.schema import Escalation, Signal, Assessment, User
from app.models.schemas_api import EscalationResponse, EscalationCreate, EscalationUpdate, EscalationDetailResponse
from app.auth import get_optional_current_user

router = APIRouter()

@router.post("/", response_model=EscalationResponse)
def create_escalation(
    escalation: EscalationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Create a new escalation. Requires authentication (Senior Analyst, Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Senior Analyst", "Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions. Required: Senior Analyst, Director, or Admin")

    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == escalation.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    db_escalation = Escalation(**escalation.model_dump())
    db.add(db_escalation)
    db.commit()
    db.refresh(db_escalation)
    return db_escalation

@router.get("/pending", response_model=List[EscalationResponse])
def get_pending_escalations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get pending escalations. Requires authentication (Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions. Required: Director or Admin")

    return db.query(Escalation).filter(Escalation.director_status == "Pending Review").all()

@router.get("/{escalation_id}", response_model=EscalationDetailResponse)
def get_escalation_details(escalation_id: str, db: Session = Depends(get_db)):
    db_escalation = db.query(Escalation).filter(Escalation.id == escalation_id).first()
    if not db_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    # Fetch related signal and assessment
    signal = db.query(Signal).filter(Signal.id == db_escalation.signal_id).first()
    assessment = db.query(Assessment).filter(Assessment.id == db_escalation.assessment_id).first()

    if not signal or not assessment:
        raise HTTPException(status_code=404, detail="Related signal or assessment not found")

    # Return escalation with nested signal and assessment
    return {
        **db_escalation.__dict__,
        "signal": signal,
        "assessment": assessment
    }

@router.patch("/{escalation_id}/decision", response_model=EscalationResponse)
def director_decision(
    escalation_id: str,
    update: EscalationUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Make a decision on an escalation. Requires authentication (Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions. Required: Director or Admin")

    db_escalation = db.query(Escalation).filter(Escalation.id == escalation_id).first()
    if not db_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    # Map decision to director_status
    decision_to_status = {
        "approve": "Approved",
        "reject": "Rejected",
        "request_more_info": "Pending Review"
    }

    update_data = update.model_dump(exclude_unset=True)

    # Handle decision mapping
    if "director_decision" in update_data:
        decision = update_data.get("director_decision")
        if decision in decision_to_status:
            update_data["director_status"] = decision_to_status[decision]

    # Set reviewed_at timestamp
    update_data["reviewed_at"] = datetime.now()

    # Set resolved_at if approved or rejected
    if update_data.get("director_status") in ["Approved", "Rejected"]:
        update_data["resolved_at"] = datetime.now()

    for key, value in update_data.items():
        setattr(db_escalation, key, value)

    db.commit()
    db.refresh(db_escalation)
    return db_escalation
