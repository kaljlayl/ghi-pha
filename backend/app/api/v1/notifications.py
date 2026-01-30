from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.models.schema import Notification, User
from app.auth import get_current_user
from app.services import notification_service

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    notification_type: str
    title: str
    message: str
    action_url: Optional[str] = None
    signal_id: Optional[str] = None
    assessment_id: Optional[str] = None
    escalation_id: Optional[str] = None
    read: bool
    read_at: Optional[str] = None
    priority: str
    created_at: str

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int


class MarkReadRequest(BaseModel):
    pass


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's notifications."""
    notifications = notification_service.get_user_notifications(
        current_user.id,
        db,
        limit=limit,
        unread_only=unread_only
    )
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    count = notification_service.get_unread_count(current_user.id, db)
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    success = notification_service.mark_notification_read(
        notification_id,
        current_user.id,
        db
    )

    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Return updated notification
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    return notification


@router.patch("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    count = notification_service.mark_all_notifications_read(current_user.id, db)
    return {"marked_read": count}
