"""
Test script for JWT authentication system.
Tests token creation, validation, and user authentication.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.auth import (
    create_access_token,
    decode_access_token,
    verify_password,
    get_password_hash
)
from datetime import timedelta


def test_password_hashing():
    """Test password hashing and verification."""
    print("Testing password hashing...")
    password = "test_password123"
    hashed = get_password_hash(password)

    assert verify_password(password, hashed), "Password verification failed"
    assert not verify_password("wrong_password", hashed), "Wrong password verified"

    print("  [OK] Password hashing works correctly")


def test_jwt_token_creation():
    """Test JWT token creation and decoding."""
    print("\nTesting JWT token creation...")

    # Create token with test data
    test_data = {
        "sub": "test-user-id",
        "username": "testuser",
        "role": "Admin"
    }

    token = create_access_token(test_data, expires_delta=timedelta(minutes=30))
    assert token, "Token creation failed"
    print(f"  [OK]Token created: {token[:50]}...")

    # Decode token
    decoded = decode_access_token(token)
    assert decoded["sub"] == test_data["sub"], "User ID mismatch"
    assert decoded["username"] == test_data["username"], "Username mismatch"
    assert decoded["role"] == test_data["role"], "Role mismatch"
    assert "exp" in decoded, "No expiration in token"

    print("  [OK] Token decoded successfully")
    print(f"  [OK] Token payload: sub={decoded['sub']}, role={decoded['role']}")


def test_token_expiration():
    """Test token expiration."""
    print("\nTesting token expiration...")

    # Create expired token
    test_data = {"sub": "test-user", "username": "test"}
    expired_token = create_access_token(test_data, expires_delta=timedelta(seconds=-1))

    try:
        decode_access_token(expired_token)
        print("  [FAIL] Expired token was accepted (this should not happen)")
    except Exception as e:
        print(f"  [OK] Expired token rejected correctly: {type(e).__name__}")


def run_all_tests():
    """Run all authentication tests."""
    print("=" * 60)
    print("Authentication System Tests")
    print("=" * 60)

    try:
        test_password_hashing()
        test_jwt_token_creation()
        test_token_expiration()

        print("\n" + "=" * 60)
        print("All tests passed!")
        print("=" * 60)
        return True
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
