from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# --- Premium Schemas ---

class PremiumRequest(BaseModel):
    zone:          str   = Field(..., example="Velachery")
    tier:          str   = Field(..., example="standard") # basic | standard | pro
    avg_hours:     float = Field(..., ge=1, le=16, example=8.0)
    tenure_months: int   = Field(..., ge=0, example=6)
    is_monsoon:    bool  = Field(default=True)

class FeatureBreakdown(BaseModel):
    value:  float
    weight: float
    label:  str

class PremiumResponse(BaseModel):
    base_premium:    float
    final_premium:   float
    risk_score:      float
    multiplier:      float
    coverage_hours:  int
    safe_bonus:      int
    off_season_bonus:int
    tenure_bonus:    int
    features:        Dict[str, FeatureBreakdown]
    explanation:     str
    confidence:      float = Field(..., description="Model prediction certainty")
    metadata:        Optional[Dict[str, Any]] = None # To store model version or timestamp

# --- Risk & Fraud Schemas (Phase 3 Level Up) ---

class RiskRequest(BaseModel):
    zone:         str
    trigger_type: str  # e.g., "HEAVY_RAIN", "ORDER_DROP"
    value:        float
    threshold:    float
    worker_id:    Optional[str] = None # For individualized fraud tracking

class RiskResponse(BaseModel):
    zone:              str
    trigger_type:      str
    severity:          float
    risk_level:        str      # LOW | MEDIUM | HIGH | CRITICAL
    estimated_claims:  int
    predicted_payout:  float
    confidence:        float
    # Phase 3 Additions:
    is_anomaly:        bool = False
    alerts:            List[str] = [] # e.g., ["Unusual claim density", "GPS mismatch"]
    processed_at:      str = ""