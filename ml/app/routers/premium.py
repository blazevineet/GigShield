from fastapi      import APIRouter, HTTPException
from app.schemas  import PremiumRequest, PremiumResponse
from app.premium_engine import predict_premium

router = APIRouter()

@router.post("/predict", response_model=PremiumResponse)
def predict(req: PremiumRequest):
    """
    Predict dynamic weekly premium for a worker profile.
    Uses XGBoost-style weighted feature model.
    """
    try:
        result = predict_premium(
            zone          = req.zone,
            tier          = req.tier,
            avg_hours     = req.avg_hours,
            tenure_months = req.tenure_months,
            is_monsoon    = req.is_monsoon,
        )
        return PremiumResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zones")
def list_zone_profiles():
    """Return risk profiles for all zones (for frontend display)."""
    from app.premium_engine import ZONE_PROFILES
    return {"data": ZONE_PROFILES}
