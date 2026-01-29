from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import datetime
from app.database import get_db
from app.models.schema import Assessment, Signal, Escalation, User
from app.models.schemas_api import AssessmentResponse, AssessmentCreate, AssessmentUpdate
from app.auth import get_optional_current_user
from app.services import notification_service

router = APIRouter()

@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Create a new assessment. Requires authentication (Senior Analyst, Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Senior Analyst", "Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions. Required: Senior Analyst, Director, or Admin")

    # Verify signal exists
    signal = db.query(Signal).filter(Signal.id == assessment.signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    db_assessment = Assessment(**assessment.model_dump())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(assessment_id: str, db: Session = Depends(get_db)):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

@router.patch("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: str,
    update: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Update an assessment. Requires authentication (Analyst, Senior Analyst, Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Analyst", "Senior Analyst", "Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not db_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assessment, key, value)

    db.commit()
    db.refresh(db_assessment)
    return db_assessment

class CompleteAssessmentRequest(BaseModel):
    outcome: str  # 'archive' or 'escalate'
    justification: str

@router.post("/{assessment_id}/complete", response_model=AssessmentResponse)
def complete_assessment(
    assessment_id: str,
    request: CompleteAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Complete an assessment and optionally escalate to director. Requires authentication (Analyst, Senior Analyst, Director, Admin)."""
    # Check role permissions
    if current_user and current_user.role not in ["Analyst", "Senior Analyst", "Director", "Admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    # Get assessment
    db_assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not db_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Get associated signal
    signal = db.query(Signal).filter(Signal.id == db_assessment.signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    # Update assessment status
    db_assessment.status = "Completed"
    db_assessment.outcome_decision = request.outcome
    db_assessment.outcome_justification = request.justification
    db_assessment.completed_at = datetime.datetime.utcnow()

    # Handle escalation
    if request.outcome == "escalate":
        # Determine priority based on signal priority score
        priority = "Medium"
        if signal.priority_score and signal.priority_score >= 85:
            priority = "Critical"
        elif signal.priority_score and signal.priority_score >= 70:
            priority = "High"

        # Create escalation
        escalation = Escalation(
            signal_id=signal.id,
            assessment_id=db_assessment.id,
            escalation_level="Director",
            priority=priority,
            escalation_reason=request.justification,
            recommended_actions=[],
            director_status="Pending Review",
            escalated_by=db_assessment.assigned_to,
            escalated_at=datetime.datetime.utcnow()
        )
        db.add(escalation)
        db.flush()  # Ensure escalation has an ID

        # Notify directors of new escalation
        notification_service.notify_escalation_created(escalation, db)

        # Update signal status
        signal.current_status = "Escalated"
    elif request.outcome == "archive":
        # Archive signal
        signal.current_status = "Archived"

    db.commit()
    db.refresh(db_assessment)
    return db_assessment
