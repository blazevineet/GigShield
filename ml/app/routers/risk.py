from fastapi     import APIRouter
from app.schemas import RiskRequest, RiskResponse

router = APIRouter()

RISK_THRESHOLDS = {
    "LOW":      0.25,
    "MEDIUM":   0.50,
    "HIGH":     0.75,
    "CRITICAL": 1.00,
}

@router.post("/score", response_model=RiskResponse)
def score_risk(req: RiskRequest):
    """
    Score the risk level of a parametric trigger event.
    Returns severity, predicted claims count, and payout estimate.
    """
    severity   = min((req.value - req.threshold) / req.threshold, 2.0)
    risk_level = (
        "CRITICAL" if severity > 0.75 else
        "HIGH"     if severity > 0.50 else
        "MEDIUM"   if severity > 0.25 else
        "LOW"
    )

    # Heuristic — replace with trained model in production
    estimated_claims  = int(severity * 120)
    predicted_payout  = round(estimated_claims * 280 * 0.80, 2)
    confidence        = min(0.65 + severity * 0.20, 0.95)

    return RiskResponse(
        zone             = req.zone,
        trigger_type     = req.trigger_type,
        severity         = round(severity, 3),
        risk_level       = risk_level,
        estimated_claims = estimated_claims,
        predicted_payout = predicted_payout,
        confidence       = round(confidence, 3),
    )
