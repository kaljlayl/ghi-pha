"""
Seed script for creating test users in the GHI-PHA system.
Run this script to create initial users for testing authentication.

Usage:
    python -m app.seed_users
"""

import uuid
import bcrypt
import sys
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.schema import Base, User


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def load_credentials():
    """Load usernames and passwords from gitignored credential files."""
    creds_dir = Path(__file__).parent.parent / ".credentials"

    # Validate directory exists
    if not creds_dir.exists():
        raise FileNotFoundError(
            f"Credentials directory not found: {creds_dir}\n"
            "Create .credentials/ with usernames.txt and passwords.txt"
        )

    # Read usernames
    usernames_file = creds_dir / "usernames.txt"
    if not usernames_file.exists():
        raise FileNotFoundError(f"Missing {usernames_file}")

    with open(usernames_file) as f:
        usernames = [line.strip() for line in f if line.strip()]

    # Read passwords
    passwords_file = creds_dir / "passwords.txt"
    if not passwords_file.exists():
        raise FileNotFoundError(f"Missing {passwords_file}")

    with open(passwords_file) as f:
        passwords = [line.strip() for line in f if line.strip()]

    # Validate counts match
    if len(usernames) != len(passwords):
        raise ValueError(
            f"Credential mismatch: {len(usernames)} usernames vs {len(passwords)} passwords"
        )

    return usernames, passwords


def create_seed_users(db: Session):
    """Create seed users for testing."""

    print("\n=== Seeding Test Users ===")

    # Load credentials from files
    try:
        usernames, passwords = load_credentials()
    except (FileNotFoundError, ValueError) as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # User data template (roles, departments, etc.)
    seed_users = [
        {
            "id": uuid.uuid4(),
            "username": "admin",
            "full_name": "System Administrator",
            "role": "Admin",
            "department": "IT",
            "position": "System Administrator",
            "phone": "+966-11-1234567",
            "mobile": "+966-50-1234567",
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "director",
            "full_name": "Dr. Fatima Al-Zahrani",
            "role": "Director",
            "department": "Public Health Intelligence",
            "position": "Director of Public Health Intelligence",
            "phone": "+966-11-3456789",
            "mobile": "+966-50-3456789",
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "senior_analyst",
            "full_name": "Mohammed Al-Ghamdi",
            "role": "Senior Analyst",
            "department": "Public Health Intelligence",
            "position": "Senior Public Health Analyst",
            "phone": "+966-11-4567890",
            "mobile": "+966-50-4567890",
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": uuid.uuid4(),
            "username": "analyst",
            "full_name": "Ahmed Al-Rashid",
            "role": "Analyst",
            "department": "Public Health Intelligence",
            "position": "Public Health Analyst",
            "phone": "+966-11-2345678",
            "mobile": "+966-50-2345678",
            "mfa_enabled": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    # Match credentials to users
    for i, user_data in enumerate(seed_users):
        if i >= len(usernames):
            print(f"Warning: Not enough credentials for user {i+1}")
            break

        # Set email and hash password from credential files
        user_data["email"] = usernames[i]
        user_data["password_hash"] = hash_password(passwords[i])

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
        # Only log username and role - NO passwords printed
        print(f"  Created: {user_data['role']} - {user_data['email']}")

    db.commit()
    print(f"\n✅ Seeded {len(seed_users)} users successfully")


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
        print(f"\n[ERROR] Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    print("=" * 60)


if __name__ == "__main__":
    main()
