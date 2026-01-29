"""
Seed script to create test users for the GHI system.
Run this script to create initial users in the database.

Usage: python seed_users.py
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.schema import User
from app.auth import get_password_hash
import uuid


def seed_users():
    """Create test users with different roles."""
    db = SessionLocal()

    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"Database already has {existing_users} users. Skipping seed.")
            print("To re-seed, delete existing users first.")
            return

        users_to_create = [
            {
                "username": "admin",
                "email": "admin@ghi.sa",
                "password": "admin123",
                "full_name": "System Administrator",
                "role": "Admin",
                "department": "IT",
                "position": "System Administrator"
            },
            {
                "username": "director",
                "email": "director@ghi.sa",
                "password": "director123",
                "full_name": "Dr. Ahmed Al-Rashid",
                "role": "Director",
                "department": "Public Health Intelligence",
                "position": "Director"
            },
            {
                "username": "senior_analyst",
                "email": "senior@ghi.sa",
                "password": "senior123",
                "full_name": "Dr. Sarah Al-Mutairi",
                "role": "Senior Analyst",
                "department": "Epidemiology",
                "position": "Senior Epidemiologist"
            },
            {
                "username": "analyst",
                "email": "analyst@ghi.sa",
                "password": "analyst123",
                "full_name": "Omar Al-Zahrani",
                "role": "Analyst",
                "department": "Surveillance",
                "position": "Epidemiologist"
            }
        ]

        created_users = []
        for user_data in users_to_create:
            password = user_data.pop("password")
            user = User(
                **user_data,
                password_hash=get_password_hash(password),
                is_active=True,
                phone="+966-11-XXX-XXXX",
                mobile="+966-5X-XXX-XXXX"
            )
            db.add(user)
            created_users.append(user)

        db.commit()

        print("✓ Successfully created test users:\n")
        for user in created_users:
            print(f"  • {user.role}: {user.username} ({user.email})")
            print(f"    Password: Use the password set in seed script")

        print("\nTest credentials:")
        for user_data in users_to_create:
            username = user_data["username"]
            # Show first password character only for security
            print(f"  {username}: (see seed_users.py for password)")

        print("\nYou can now login at: POST /api/v1/auth/login")

    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding test users for GHI system...\n")
    seed_users()
    print("\n✓ Seed complete!")
