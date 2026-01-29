"""
Authentication endpoints for login, logout, and user info.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
    JWT_EXPIRATION_MINUTES
)
from app.database import get_db
from app.models.schema import User

router = APIRouter()


# Response Models
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class LogoutResponse(BaseModel):
    message: str


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible login endpoint.

    Accepts username and password via form data and returns a JWT access token.

    Args:
        form_data: OAuth2 password request form (username, password)
        db: Database session

    Returns:
        Token response with access token and user info

    Raises:
        HTTPException: 401 if credentials are invalid
    """
    # Find user by username
    user = db.query(User).filter(User.username == form_data.username).first()

    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token_expires = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role},
        expires_delta=access_token_expires
    )

    # Return token and user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRATION_MINUTES * 60,  # Convert to seconds
        "user": UserInfo.model_validate(user)
    }


@router.post("/logout", response_model=LogoutResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (invalidates token on client side).

    Note: JWT tokens are stateless, so true invalidation would require
    a token blacklist (Redis). For now, this endpoint serves as a
    confirmation that the client should discard the token.

    Args:
        current_user: Current authenticated user

    Returns:
        Logout confirmation message
    """
    # TODO: Implement token blacklist with Redis for production
    # For now, client should discard the token
    return {
        "message": f"User {current_user.username} logged out successfully. Please discard your token."
    }


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Current authenticated user from token

    Returns:
        User information
    """
    return UserInfo.model_validate(current_user)


# Optional: Endpoint to refresh token (useful for long-running sessions)
@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Refresh access token for current user.

    Args:
        current_user: Current authenticated user

    Returns:
        New token with extended expiration
    """
    access_token_expires = timedelta(minutes=JWT_EXPIRATION_MINUTES)
    access_token = create_access_token(
        data={"sub": str(current_user.id), "username": current_user.username, "role": current_user.role},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRATION_MINUTES * 60,
        "user": UserInfo.model_validate(current_user)
    }
