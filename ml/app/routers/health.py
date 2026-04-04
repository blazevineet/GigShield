"""
GigShield ML — API Routers
"""

# ─── health.py ────────────────────────────────────────────
from fastapi  import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status":    "ok",
        "service":   "gigshield-ml",
        "version":   "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
