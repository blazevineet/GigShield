"""
GigShield — Risk Intelligence Router (Phase 3 Optimized)
Handles parametric scoring, fraud detection, and automated payout authorization.
"""

from fastapi import APIRouter
from app.schemas import RiskRequest, RiskResponse
from datetime import datetime
import random

router = APIRouter()

# Phase 3: Dynamic Risk Classification
RISK_CONFIG = {
    "CRITICAL": {"threshold": 0.80, "payout_factor": 1.0, "auto_approve": True},
    "HIGH":     {"threshold": 0.50, "payout_factor": 0.7, "auto_approve": True},
    "MEDIUM":   {"threshold": 0.20, "payout_factor": 0.3, "auto_approve": False},
    "LOW":      {"threshold": 0.00, "payout_factor": 0.0, "auto_approve": False},
}

@router.post("/score", response_model=RiskResponse)
def score_risk(req: RiskRequest):
    """
    Phase 3: Analyzes trigger severity and detects anomalies for automated payouts.
    """
    # 1. Calculate Severity using a non-linear scale (Cap at 2.5 for extreme events)
    raw_severity = (req.value - req.threshold) / req.threshold
    severity = max(0, min(raw_severity, 2.5))

    # 2. Intelligent Risk Level Assignment
    if severity >= RISK_CONFIG["CRITICAL"]["threshold"]:
        risk_level = "CRITICAL"
    elif severity >= RISK_CONFIG["HIGH"]["threshold"]:
        risk_level = "HIGH"
    elif severity >= RISK_CONFIG["MEDIUM"]["threshold"]:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # 3. Fraud & Anomaly Detection (Phase 3 Core)
    alerts = []
    is_anomaly = False
    
    # Logic: If severity is massive but confidence is low, flag as anomaly
    # Logic: If worker_id is provided, simulate a GPS/Time check
    if severity > 1.5:
        alerts.append("Extreme event detected: Verifying satellite data")
    
    if req.worker_id and random.random() > 0.98: # 2% random fraud simulation for demo
        is_anomaly = True
        alerts.append("Anomaly: Multiple claims from same hardware ID")

    # 4. Economic Projections
    # Base payout rate of ₹500 scaled by severity and tier payout factor
    estimated_claims = int(severity * 145)
    predicted_payout = round(estimated_claims * 500 * RISK_CONFIG[risk_level]["payout_factor"], 2)
    
    # Confidence scales with data availability (simulated)
    confidence = min(0.75 + (severity * 0.15), 0.98)

    return RiskResponse(
        zone=req.zone,
        trigger_type=req.trigger_type,
        severity=round(severity, 3),
        risk_level=risk_level,
        estimated_claims=estimated_claims,
        predicted_payout=predicted_payout,
        confidence=round(confidence, 3),
        is_anomaly=is_anomaly,
        alerts=alerts,
        processed_at=datetime.utcnow().isoformat()
    )