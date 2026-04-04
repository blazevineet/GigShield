"""
GigShield ML Microservice
FastAPI app exposing premium prediction and risk scoring endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import uvicorn

from app.routers import premium, risk, health
from app.config  import settings

app = FastAPI(
    title       = "GigShield ML Service",
    description = "Premium prediction, risk scoring, and fraud detection",
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ─── Middleware ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ─── Prometheus metrics ────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ─── Routers ──────────────────────────────────────────────
app.include_router(health.router,   prefix="",          tags=["Health"])
app.include_router(premium.router,  prefix="/premium",  tags=["Premium"])
app.include_router(risk.router,     prefix="/risk",     tags=["Risk"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host    = "0.0.0.0",
        port    = int(settings.PORT),
        reload  = settings.DEBUG,
        workers = 1 if settings.DEBUG else 4,
    )
