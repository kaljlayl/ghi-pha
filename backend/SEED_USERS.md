# User Seeding Instructions

## Overview
This document provides instructions for seeding test users into the GHI-PHA system.

## Prerequisites
- Database connection configured in `.env` file
- Backend dependencies installed (`pip install -r requirements.txt`)

## Running the Seed Script

From the backend directory, run:

```bash
python -m app.seed_users
```

## Test Users Created

The script creates four test users with the following credentials:

| Username | Email | Role | Default Password |
|----------|-------|------|------------------|
| admin | admin@ghi.sa | Admin | password123 |
| analyst | analyst@ghi.sa | Analyst | password123 |
| senior_analyst | senior.analyst@ghi.sa | Senior Analyst | password123 |
| director | director@ghi.sa | Director | password123 |

## User Details

### Admin User
- **Full Name:** System Administrator
- **Department:** IT
- **Position:** System Administrator
- **Role:** Admin (full system access)

### Analyst User
- **Full Name:** Ahmed Al-Rashid
- **Department:** Public Health Intelligence
- **Position:** Public Health Analyst
- **Role:** Analyst (signal triage, assessment creation)

### Senior Analyst User
- **Full Name:** Mohammed Al-Ghamdi
- **Department:** Public Health Intelligence
- **Position:** Senior Public Health Analyst
- **Role:** Senior Analyst (review assessments, create RRAs)

### Director User
- **Full Name:** Dr. Fatima Al-Zahrani
- **Department:** Public Health Intelligence
- **Position:** Director of Public Health Intelligence
- **Role:** Director (escalation review, final decisions)

## Security Notes

- All users have the default password `password123`
- **IMPORTANT:** Change all passwords immediately after first login in production
- MFA is disabled by default for testing purposes
- All users are marked as active

## Troubleshooting

### Users Already Exist
If the script detects existing users with the same usernames, it will skip creation and display the existing users.

### Database Connection Error
Ensure your `.env` file has the correct database connection string:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Import Errors
Make sure you're running from the backend directory and all dependencies are installed.
