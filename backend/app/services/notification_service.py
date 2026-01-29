import datetime
import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.schema import Notification, Signal, Assessment, Escalation, User

logger = logging.getLogger(__name__)


def notify_new_critical_signal(signal: Signal, db: Session):
    """Notify all Analyst users when a new critical signal (priority >= 85) is created."""
    if not signal.priority_score or signal.priority_score < 85:
        return

    # Find all users with Analyst, Senior Analyst, or Admin roles
    analysts = db.query(User).filter(
        User.role.in_(["Analyst", "Senior Analyst", "Admin"]),
        User.is_active == True
    ).all()

    for analyst in analysts:
        notification = Notification(
            recipient_id=analyst.id,
            notification_type="critical_signal",
            title=f"Critical Signal: {signal.disease} in {signal.country}",
            message=f"A critical health signal (Priority: {signal.priority_score:.0f}) has been detected for {signal.disease} in {signal.country}. Immediate triage required.",
            action_url=f"/triage?signal_id={signal.id}",
            signal_id=signal.id,
            priority="Critical"
        )
        db.add(notification)

    logger.info(f"Created critical signal notifications for {len(analysts)} analysts for signal {signal.id}")


def notify_escalation_created(escalation: Escalation, db: Session):
    """Notify Director users when a new escalation is created."""
    # Find all Director users
    directors = db.query(User).filter(
        User.role == "Director",
        User.is_active == True
    ).all()

    # Get associated signal for context
    signal = db.query(Signal).filter(Signal.id == escalation.signal_id).first()

    for director in directors:
        title = "New Escalation Requires Review"
        message = f"An escalation ({escalation.priority} priority) has been created"

        if signal:
            title = f"Escalation: {signal.disease} in {signal.country}"
            message = f"A {escalation.priority} priority escalation requires your review for {signal.disease} in {signal.country}."

        notification = Notification(
            recipient_id=director.id,
            notification_type="escalation_created",
            title=title,
            message=message,
            action_url=f"/escalations?escalation_id={escalation.id}",
            signal_id=escalation.signal_id,
            escalation_id=escalation.id,
            priority=escalation.priority
        )
        db.add(notification)

    logger.info(f"Created escalation notifications for {len(directors)} directors for escalation {escalation.id}")


def notify_assessment_assigned(assessment: Assessment, assignee_id: str, db: Session):
    """Notify a specific user when an assessment is assigned to them."""
    # Get user
    user = db.query(User).filter(User.id == assignee_id).first()
    if not user:
        logger.warning(f"Cannot send assessment notification: user {assignee_id} not found")
        return

    # Get associated signal for context
    signal = db.query(Signal).filter(Signal.id == assessment.signal_id).first()

    title = "New Assessment Assigned"
    message = f"A new {assessment.assessment_type} assessment has been assigned to you."

    if signal:
        title = f"Assessment: {signal.disease} in {signal.country}"
        message = f"You have been assigned a {assessment.assessment_type} assessment for {signal.disease} in {signal.country}."

    notification = Notification(
        recipient_id=assignee_id,
        notification_type="assessment_assigned",
        title=title,
        message=message,
        action_url=f"/assessments/{signal.id if signal else assessment.signal_id}",
        signal_id=assessment.signal_id,
        assessment_id=assessment.id,
        priority="Normal"
    )
    db.add(notification)

    logger.info(f"Created assessment assignment notification for user {assignee_id}")


def get_user_notifications(user_id: str, db: Session, limit: int = 50, unread_only: bool = False) -> List[Notification]:
    """Get notifications for a specific user."""
    query = db.query(Notification).filter(Notification.recipient_id == user_id)

    if unread_only:
        query = query.filter(Notification.read == False)

    return query.order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(user_id: str, db: Session) -> int:
    """Get count of unread notifications for a user."""
    return db.query(Notification).filter(
        Notification.recipient_id == user_id,
        Notification.read == False
    ).count()


def mark_notification_read(notification_id: str, user_id: str, db: Session) -> bool:
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == user_id
    ).first()

    if not notification:
        return False

    notification.read = True
    notification.read_at = datetime.datetime.utcnow()
    db.commit()

    return True


def mark_all_notifications_read(user_id: str, db: Session) -> int:
    """Mark all notifications as read for a user."""
    count = db.query(Notification).filter(
        Notification.recipient_id == user_id,
        Notification.read == False
    ).update({
        "read": True,
        "read_at": datetime.datetime.utcnow()
    })

    db.commit()
    return count
