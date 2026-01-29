from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List, Any

class SignalBase(BaseModel):
    disease: str
    country: str
    location: Optional[str] = None
    date_reported: date
    cases: int = 0
    deaths: int = 0
    case_fatality_rate: Optional[float] = None
    description: Optional[str] = None
    source_url: str

class SignalCreate(SignalBase):
    beacon_event_id: str
    raw_data: dict

class SignalUpdate(BaseModel):
    triage_status: Optional[str] = None
    triage_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    current_status: Optional[str] = None

class SignalResponse(SignalBase):
    id: UUID
    beacon_event_id: Optional[str]
    triage_status: str
    priority_score: Optional[float]
    current_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssessmentBase(BaseModel):
    signal_id: UUID
    assessment_type: str
    assigned_to: UUID

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    ihr_question_1: Optional[bool] = None
    ihr_question_1_notes: Optional[str] = None
    ihr_question_2: Optional[bool] = None
    ihr_question_2_notes: Optional[str] = None
    ihr_question_3: Optional[bool] = None
    ihr_question_3_notes: Optional[str] = None
    ihr_question_4: Optional[bool] = None
    ihr_question_4_notes: Optional[str] = None
    ihr_decision: Optional[str] = None
    rra_hazard_assessment: Optional[Any] = None
    rra_exposure_assessment: Optional[Any] = None
    rra_context_assessment: Optional[Any] = None
    rra_overall_risk: Optional[str] = None
    rra_confidence_level: Optional[str] = None
    rra_key_uncertainties: Optional[List[str]] = None
    rra_recommendations: Optional[List[str]] = None
    status: Optional[str] = None
    outcome_decision: Optional[str] = None
    outcome_justification: Optional[str] = None

class AssessmentResponse(AssessmentBase):
    id: UUID
    ihr_question_1: Optional[bool] = None
    ihr_question_1_notes: Optional[str] = None
    ihr_question_2: Optional[bool] = None
    ihr_question_2_notes: Optional[str] = None
    ihr_question_3: Optional[bool] = None
    ihr_question_3_notes: Optional[str] = None
    ihr_question_4: Optional[bool] = None
    ihr_question_4_notes: Optional[str] = None
    ihr_decision: Optional[str] = None
    rra_hazard_assessment: Optional[Any] = None
    rra_exposure_assessment: Optional[Any] = None
    rra_context_assessment: Optional[Any] = None
    rra_overall_risk: Optional[str] = None
    rra_confidence_level: Optional[str] = None
    rra_key_uncertainties: Optional[List[str]] = None
    rra_recommendations: Optional[List[str]] = None
    status: str
    reviewed_by: Optional[UUID] = None
    outcome_decision: Optional[str] = None
    outcome_justification: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EscalationCreate(BaseModel):
    signal_id: UUID
    assessment_id: UUID
    priority: str
    escalation_reason: str
    escalated_by: UUID

class EscalationUpdate(BaseModel):
    director_status: Optional[str] = None
    director_decision: Optional[str] = None
    director_notes: Optional[str] = None
    actions_taken: Optional[List[str]] = None

class EscalationResponse(BaseModel):
    id: UUID
    signal_id: UUID
    assessment_id: UUID
    escalation_level: str
    priority: str
    escalation_reason: str
    recommended_actions: Optional[List[str]] = None
    director_status: str
    director_decision: Optional[str] = None
    director_notes: Optional[str] = None
    actions_taken: Optional[List[str]] = None
    reviewed_by: Optional[UUID] = None
    escalated_at: datetime
    escalated_by: UUID
    reviewed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EscalationDetailResponse(EscalationResponse):
    signal: SignalResponse
    assessment: AssessmentResponse

    model_config = ConfigDict(from_attributes=True)
