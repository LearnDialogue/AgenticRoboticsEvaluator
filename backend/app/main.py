"""
AgenticRoboticsEvaluator - FastAPI Application
A chat-only MVP for a near-peer reflective agent used weekly after robotics meetings.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, admin, sessions, health, stages, cps
from app.core.config import settings

app = FastAPI(
    title="AgenticRoboticsEvaluator",
    description="A reflective agent for robotics team meetings",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(sessions.router)
app.include_router(stages.router)
app.include_router(cps.router)


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    pass


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    pass
