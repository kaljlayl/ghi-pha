"""
Seed script for creating test users in the GHI-PHA system.
Run this script to create initial users for testing authentication.

Usage:
    python -m app.seed_users
"""

import uuid
import bcrypt
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.schema import Base, User


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_seed_users(db: Session):
    """Create seed users for testing."""

    # Default password for all test users
    default_password = "password123"
    password_hash = hash_password(default_password)

    seed_users = [
        {
            "id": uuid.uuid4(),
            "username": "admin",
            "email": "admin@ghi.sa",
            "full_name": "System Administrator",
            "role": "Admin",
            "department": "IT",
            "position": "System Administrator",
            "phone": "+966-11-1234567",
            "mobile": "+966-50-1234567",
            "password_hash": password_hash,
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "analyst",
            "email": "analyst@ghi.sa",
            "full_name": "Ahmed Al-Rashid",
            "role": "Analyst",
            "department": "Public Health Intelligence",
            "position": "Public Health Analyst",
            "phone": "+966-11-2345678",
            "mobile": "+966-50-2345678",
            "password_hash": password_hash,
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "director",
            "email": "director@ghi.sa",
            "full_name": "Dr. Fatima Al-Zahrani",
            "role": "Director",
            "department": "Public Health Intelligence",
            "position": "Director of Public Health Intelligence",
            "phone": "+966-11-3456789",
            "mobile": "+966-50-3456789",
            "password_hash": password_hash,
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "senior_analyst",
            "email": "senior.analyst@ghi.sa",
            "full_name": "Mohammed Al-Ghamdi",
            "role": "Senior Analyst",
            "department": "Public Health Intelligence",
            "position": "Senior Public Health Analyst",
            "phone": "+966-11-4567890",
            "mobile": "+966-50-4567890",
            "password_hash": password_hash,
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    # Check if users already exist
    existing_users = db.query(User).filter(
        User.username.in_([u["username"] for u in seed_users])
    ).all()

    if existing_users:
        print(f"Found {len(existing_users)} existing users. Skipping seed.")
        for user in existing_users:
            print(f"  - {user.username} ({user.email})")
        return

    # Create users
    print(f"Creating {len(seed_users)} seed users...")
    for user_data in seed_users:
        user = User(**user_data)
        db.add(user)
        print(f"  + {user_data['username']} ({user_data['role']}) - {user_data['email']}")

    db.commit()
    print(f"\n✓ Successfully created {len(seed_users)} users")
    print(f"\nDefault password for all users: {default_password}")
    print("\nTest credentials:")
    for user_data in seed_users:
        print(f"  - {user_data['username']} / {default_password} ({user_data['role']})")


def main():
    """Main function to run the seed script."""
    print("=" * 60)
    print("GHI-PHA User Seeding Script")
    print("=" * 60)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create database session
    db = SessionLocal()

    try:
        create_seed_users(db)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    print("=" * 60)


if __name__ == "__main__":
    main()
