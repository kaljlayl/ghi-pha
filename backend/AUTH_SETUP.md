# Authentication Setup Guide

## Overview

The GHI system now includes JWT-based authentication with role-based access control (RBAC).

## Features

- JWT token authentication (24-hour expiration by default)
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Optional authentication for backward compatibility
- Protected endpoints for assessments and escalations

## Roles

- **Admin**: Full system access
- **Director**: Review escalations, manage assessments
- **Senior Analyst**: Create assessments and escalations
- **Analyst**: Update assessments, complete workflows

## Installation

1. Install dependencies:
```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

Or from requirements.txt:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set:
```env
JWT_SECRET_KEY=your-super-secret-key-here
JWT_EXPIRATION_MINUTES=1440
```

**IMPORTANT**: Generate a secure secret key in production:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Seeding Test Users

Create test users for development:

```bash
cd backend
python -m app.seed_users
```

This creates:
- `admin` / `password123` (Admin)
- `director` / `password123` (Director)
- `senior_analyst` / `password123` (Senior Analyst)
- `analyst` / `password123` (Analyst)

## API Endpoints

### Authentication

#### POST /api/v1/auth/login
Login with username/password, returns JWT token.

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@ghi.sa",
    "full_name": "System Administrator",
    "role": "Admin",
    "is_active": true
  }
}
```

#### GET /api/v1/auth/me
Get current user info (requires authentication).

**Request:**
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/v1/auth/logout
Logout (invalidate token on client).

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/v1/auth/refresh
Refresh token (extend expiration).

## Protected Endpoints

### Assessments
- `POST /api/v1/assessments/` - Create assessment (Senior Analyst+)
- `PATCH /api/v1/assessments/{id}` - Update assessment (Analyst+)
- `POST /api/v1/assessments/{id}/complete` - Complete assessment (Analyst+)

### Escalations
- `POST /api/v1/escalations/` - Create escalation (Senior Analyst+)
- `GET /api/v1/escalations/pending` - View pending (Director+)
- `PATCH /api/v1/escalations/{id}/decision` - Make decision (Director+)

### Unauthenticated Endpoints
The following endpoints remain accessible without authentication:
- `GET /api/v1/signals/` - List signals
- `GET /api/v1/signals/{id}` - Get signal
- `POST /api/v1/signals/{id}/triage` - Triage signal
- `POST /api/v1/signals/poll-beacon` - Manual beacon poll

## Using Authentication in Requests

### With curl
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=password123" | jq -r .access_token)

# 2. Use token in requests
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### With Python requests
```python
import requests

# Login
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    data={"username": "admin", "password": "password123"}
)
token = response.json()["access_token"]

# Use token
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    "http://localhost:8000/api/v1/auth/me",
    headers=headers
)
print(response.json())
```

### With JavaScript/Frontend
```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=admin&password=password123'
});
const { access_token } = await loginResponse.json();

// Store token (localStorage or secure cookie)
localStorage.setItem('token', access_token);

// Use token in requests
const response = await fetch('http://localhost:8000/api/v1/auth/me', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const user = await response.json();
```

## Security Notes

1. **JWT Secret**: Always use a strong, random secret key in production
2. **HTTPS**: Use HTTPS in production to protect tokens in transit
3. **Token Storage**: Store tokens securely (httpOnly cookies or secure storage)
4. **Token Expiration**: Default is 24 hours, adjust as needed
5. **Token Blacklist**: For production, implement Redis-based token blacklist for logout

## Development vs Production

### Development
- Use simple passwords for test users
- Token stored in localStorage is acceptable
- HTTP is acceptable for local testing

### Production
- Use strong passwords and enforce password policies
- Implement token refresh rotation
- Use httpOnly secure cookies or secure token storage
- Always use HTTPS
- Implement token blacklist with Redis
- Add rate limiting for login attempts
- Enable audit logging for authentication events

## Troubleshooting

### "Could not validate credentials"
- Token may be expired (24 hours default)
- Token may be malformed
- Secret key mismatch between token creation and validation

### "Insufficient permissions"
- User role doesn't have access to endpoint
- Check user role with `GET /api/v1/auth/me`

### "Inactive user"
- User account is disabled (`is_active=false`)
- Contact admin to reactivate

## Next Steps

1. Implement token blacklist with Redis for production
2. Add password reset functionality
3. Implement MFA (two-factor authentication)
4. Add login attempt rate limiting
5. Implement audit logging for authentication events
