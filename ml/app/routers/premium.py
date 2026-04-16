"""
GigShield — Premium Intelligence Router (Phase 3 Optimized)
Exposes XGBoost-style prediction engine with confidence scoring.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.schemas import PremiumRequest, PremiumResponse
from app.premium_engine import predict_premium, ZONE_PROFILES
import logging

# Set up logging for Phase 3 audit trails
logger = logging.getLogger("gigshield-ml")

router = APIRouter()

@router.post("/predict", response_model=PremiumResponse)
async def predict(req: PremiumRequest):
    """
    Phase 3: Generates dynamic premium pricing using weighted feature vectors.
    Includes risk explanations and model confidence scores.
    """
    try:
        # Log the incoming request for transparency in the demo
        logger.info(f"Predicting premium for Zone: {req.zone}, Tier: {req.tier}")

        result = predict_premium(
            zone          = req.zone,
            tier          = req.tier,
            avg_hours     = req.avg_hours,
            tenure_months = req.tenure_months,
            is_monsoon    = req.is_monsoon,
        )

        # Level Up: Ensure the response is strictly typed to our new Phase 3 Schema
        return PremiumResponse(**result)

    except KeyError as e:
        # Handle cases where an unknown zone or tier is passed
        logger.error(f"Invalid input parameter: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")
    except Exception as e:
        logger.critical(f"Prediction Engine Failure: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal ML Engine Error")


@router.get("/zones")
def get_risk_profiles():
    """
    Returns the intelligence metadata for all supported zones.
    Used by the frontend to render 'High Risk Area' warnings.
    """
    # Level Up: Transform the dict into a list of objects for easier Frontend mapping
    formatted_zones = [
        {"name": name, "flood_index": data["flood"], "claim_index": data["claims"]}
        for name, data in ZONE_PROFILES.items()
    ]
    return {
        "count": len(formatted_zones),
        "zones": formatted_zones,
        "status": "active"
    }