"""
GigShield ML Microservice (Phase 3 Optimized)
FastAPI Entry Point: Orchestrates Premium Prediction & Risk Automation.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import uvicorn
import time

from app.routers import premium, risk, health
from app.config import settings

# --- Initialize Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gigshield-ml")

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligence layer for parametric gig-economy insurance.",
    version=settings.MODEL_VERSION,
    docs_url="/docs",
)

# --- Phase 3 Middleware: Performance & Security ---

# 1. Advanced CORS: Uses dynamic origins from leveled-up config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Performance Tracking Middleware: Logs inference time for every AI request
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f} sec"
    logger.info(f"Inference complete: {request.url.path} | Time: {process_time:.4f}s")
    return response

# --- Prometheus Observability ---
Instrumentator().instrument(app).expose(app)

# --- Startup Intelligence Event ---
@app.on_event("startup")
async def startup_event():
    logger.info("="*50)
    logger.info(f"🚀 {settings.APP_NAME} Phase 3 Active")
    logger.info(f"🤖 Model Version: {settings.MODEL_VERSION}")
    logger.info(f"🌐 Environment: {settings.APP_ENV}")
    logger.info("="*50)

# --- Routers ---
# Note: prefixed /health for cleaner API separation
app.include_router(health.router,  prefix="/health",  tags=["Health"])
app.include_router(premium.router, prefix="/premium", tags=["Premium"])
app.include_router(risk.router,    prefix="/risk",    tags=["Risk"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS_COUNT,
    )