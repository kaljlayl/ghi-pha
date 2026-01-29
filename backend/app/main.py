import asyncio
import os
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, SessionLocal, engine
from app.services.beacon_collector import BeaconCollector

# Create tables (for local development, ideally use Alembic for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Global Health Intelligence (GHI) System")

# CORS Configuration for Frontend (e.g., Cloudflare Pages)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def beacon_poll_loop() -> None:
    enabled = os.getenv("ENABLE_BEACON_POLLING", "1").lower() in {"1", "true", "yes"}
    if not enabled:
        return

    interval_minutes = int(os.getenv("BEACON_POLL_INTERVAL_MINUTES", "15"))
    jitter_seconds = int(os.getenv("BEACON_POLL_JITTER_SECONDS", "30"))
    while True:
        db = SessionLocal()
        try:
            BeaconCollector(db).fetch_and_process()
        finally:
            db.close()
        sleep_seconds = interval_minutes * 60
        if jitter_seconds > 0:
            sleep_seconds += random.randint(0, jitter_seconds)
        await asyncio.sleep(sleep_seconds)


@app.on_event("startup")
async def start_background_polling() -> None:
    asyncio.create_task(beacon_poll_loop())

@app.get("/")
def read_root():
    return {"status": "GHI System API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# API Routers
from app.api.v1 import signals, assessments, escalations, auth, notifications

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(signals.router, prefix="/api/v1/signals", tags=["Signals"])
app.include_router(assessments.router, prefix="/api/v1/assessments", tags=["Assessments"])
app.include_router(escalations.router, prefix="/api/v1/escalations", tags=["Escalations"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
