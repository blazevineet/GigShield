from pydantic import BaseModel, Field
from typing  import Optional, Dict, Any

class PremiumRequest(BaseModel):
    zone:          str   = Field(..., example="Velachery")
    tier:          str   = Field(..., example="standard")       # basic | standard | pro
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

class RiskRequest(BaseModel):
    zone:         str
    trigger_type: str
    value:        float
    threshold:    float

class RiskResponse(BaseModel):
    zone:              str
    trigger_type:      str
    severity:          float
    risk_level:        str                        # LOW | MEDIUM | HIGH | CRITICAL
    estimated_claims:  int
    predicted_payout:  float
    confidence:        float
