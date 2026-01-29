# Quick Start: Authentication Setup

## 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## 2. Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit .env and set JWT_SECRET_KEY
# Generate secure key:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 3. Seed Test Users
```bash
python seed_users.py
```

Creates users:
- `admin` / `admin123`
- `director` / `director123`
- `senior_analyst` / `senior123`
- `analyst` / `analyst123`

## 4. Start Server
```bash
uvicorn app.main:app --reload
```

## 5. Test Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Get current user (replace TOKEN)
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Quick Test
```bash
# Run auth tests
python test_auth.py
```

## Roles & Permissions

| Role | Create Assessment | Update Assessment | Create Escalation | Review Escalation |
|------|-------------------|-------------------|-------------------|-------------------|
| Analyst | No | Yes | No | No |
| Senior Analyst | Yes | Yes | Yes | No |
| Director | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |

## Documentation
- Full setup: `AUTH_SETUP.md`
- Implementation: `IMPLEMENTATION_SUMMARY.md`
- Status: `../TASK_COMPLETION_STATUS.md`
