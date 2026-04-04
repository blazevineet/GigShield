"""
GigShield — Premium Engine
XGBoost-style feature-weighted model for dynamic premium calculation.
In production: train on historical claims data, serialize with joblib.
"""

import numpy  as np
import pandas as pd
from typing import Dict, Tuple

# ─── Zone risk profiles (from DB in production) ────────────
ZONE_PROFILES: Dict[str, Dict] = {
    "Velachery":       {"flood": 0.85, "claims": 0.78},
    "Tambaram":        {"flood": 0.72, "claims": 0.65},
    "Sholinganallur":  {"flood": 0.68, "claims": 0.60},
    "Anna Nagar":      {"flood": 0.45, "claims": 0.40},
    "Adyar":           {"flood": 0.40, "claims": 0.38},
    "T. Nagar":        {"flood": 0.55, "claims": 0.50},
    "Porur":           {"flood": 0.60, "claims": 0.52},
    "Guindy":          {"flood": 0.50, "claims": 0.45},
}

TIER_BASE: Dict[str, float] = {
    "basic":    29.0,
    "standard": 49.0,
    "pro":      79.0,
}

TIER_MAX_PAYOUT: Dict[str, float] = {
    "basic":    500.0,
    "standard": 1000.0,
    "pro":      2000.0,
}

FEATURE_WEIGHTS = {
    "zone_flood":    0.30,
    "zone_claims":   0.20,
    "seasonal":      0.20,
    "hours_exp":     0.15,
    "tenure_risk":   0.15,
}

ADJUSTMENT_CAP = 0.25   # ±25% of base


def build_feature_vector(
    zone:          str,
    avg_hours:     float,
    tenure_months: int,
    is_monsoon:    bool,
) -> Dict[str, Dict]:
    """
    Engineer feature vector from raw inputs.
    Returns dict with value, weight, label for each feature.
    """
    zp = ZONE_PROFILES.get(zone, {"flood": 0.50, "claims": 0.45})

    return {
        "zone_flood": {
            "value":  zp["flood"],
            "weight": FEATURE_WEIGHTS["zone_flood"],
            "label":  "Zone Flood Risk Index",
        },
        "zone_claims": {
            "value":  zp["claims"],
            "weight": FEATURE_WEIGHTS["zone_claims"],
            "label":  "Historical Claim Frequency",
        },
        "seasonal": {
            "value":  1.0 if is_monsoon else 0.35,
            "weight": FEATURE_WEIGHTS["seasonal"],
            "label":  "Seasonal / Monsoon Index",
        },
        "hours_exp": {
            "value":  min(avg_hours / 12.0, 1.0),
            "weight": FEATURE_WEIGHTS["hours_exp"],
            "label":  "Daily Hours Exposure",
        },
        "tenure_risk": {
            "value":  (
                0.15 if tenure_months > 24 else
                0.45 if tenure_months > 12 else
                0.70 if tenure_months > 6  else
                1.00
            ),
            "weight": FEATURE_WEIGHTS["tenure_risk"],
            "label":  "Tenure Discount Factor",
        },
    }


def compute_risk_score(features: Dict[str, Dict]) -> float:
    """Weighted sum of feature values → risk score in [0, 1]."""
    return sum(f["value"] * f["weight"] for f in features.values())


def compute_coverage_hours(
    zone:          str,
    tenure_months: int,
    is_monsoon:    bool,
) -> Tuple[int, int, int, int]:
    """
    Returns (total_hours, safe_bonus, off_season_bonus, tenure_bonus).
    Low-risk zones and loyal workers get extended coverage hours.
    """
    zp           = ZONE_PROFILES.get(zone, {"flood": 0.55})
    base         = 8
    safe_bonus   = 2 if zp["flood"] < 0.50 else 0
    offseason    = 1 if not is_monsoon else 0
    tenure_bonus = 1 if tenure_months > 12 else 0
    total        = base + safe_bonus + offseason + tenure_bonus
    return total, safe_bonus, offseason, tenure_bonus


def predict_premium(
    zone:          str,
    tier:          str,
    avg_hours:     float,
    tenure_months: int,
    is_monsoon:    bool,
) -> dict:
    """
    Main prediction function.
    In production: load serialized XGBoost model with joblib.load().
    """
    base     = TIER_BASE.get(tier, 49.0)
    features = build_feature_vector(zone, avg_hours, tenure_months, is_monsoon)
    score    = compute_risk_score(features)

    # Map score [0,1] → multiplier [0.75, 1.25]
    multiplier   = 0.75 + score * 0.50
    raw_premium  = base * multiplier
    lo, hi       = base * (1 - ADJUSTMENT_CAP), base * (1 + ADJUSTMENT_CAP)
    final        = round(max(lo, min(hi, raw_premium)))

    coverage_hours, safe_bonus, offseason_bonus, tenure_bonus = compute_coverage_hours(
        zone, tenure_months, is_monsoon
    )

    diff = final - base
    if diff > 0:
        explanation = f"₹{diff} risk loading — {zone} is a high-risk zone during monsoon season."
    elif diff < 0:
        explanation = f"₹{abs(diff)} discount — {zone} has historically low disruption risk."
    else:
        explanation = "Base rate applied — neutral risk profile."

    return {
        "base_premium":     base,
        "final_premium":    final,
        "risk_score":       round(score, 4),
        "multiplier":       round(multiplier, 3),
        "coverage_hours":   coverage_hours,
        "safe_bonus":       safe_bonus,
        "off_season_bonus": offseason_bonus,
        "tenure_bonus":     tenure_bonus,
        "features":         features,
        "explanation":      explanation,
    }
