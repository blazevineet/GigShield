"""
GigShield — Premium Engine (Phase 3: Advanced Intelligence)
Implements Non-linear Risk Compounding and Dynamic Feature Importance.
"""

import numpy as np
from typing import Dict, Tuple

# ─── Enhanced Zone Risk Profiles ───────────────────────────
# Added 'volatility' to represent how fast conditions change in that zone
ZONE_PROFILES: Dict[str, Dict] = {
    "Velachery":       {"flood": 0.85, "claims": 0.78, "volatility": 0.90},
    "Tambaram":        {"flood": 0.72, "claims": 0.65, "volatility": 0.80},
    "Sholinganallur":  {"flood": 0.68, "claims": 0.60, "volatility": 0.75},
    "Anna Nagar":      {"flood": 0.45, "claims": 0.40, "volatility": 0.30},
    "Adyar":           {"flood": 0.40, "claims": 0.38, "volatility": 0.25},
    "T. Nagar":        {"flood": 0.55, "claims": 0.50, "volatility": 0.60},
    "Porur":           {"flood": 0.60, "claims": 0.52, "volatility": 0.65},
    "Guindy":          {"flood": 0.50, "claims": 0.45, "volatility": 0.40},
}

TIER_BASE: Dict[str, float] = {
    "basic":    29.0,
    "standard": 49.0,
    "pro":      79.0,
}

# Phase 3 Feature Weights (XGBoost Style Importance)
FEATURE_WEIGHTS = {
    "zone_flood":    0.35,  # Increased weight for environmental safety
    "zone_claims":   0.20,
    "seasonal":      0.15,
    "hours_exp":     0.15,
    "tenure_risk":   0.15,
}

ADJUSTMENT_CAP = 0.30   # Increased to ±30% for higher dynamic range

def build_feature_vector(
    zone:          str,
    avg_hours:     float,
    tenure_months: int,
    is_monsoon:    bool,
) -> Dict[str, Dict]:
    zp = ZONE_PROFILES.get(zone, {"flood": 0.50, "claims": 0.45, "volatility": 0.50})

    # Non-linear Tenure scaling (Diminishing returns on risk reduction)
    tenure_val = np.exp(-tenure_months / 12.0) # Decay curve from 1.0 down to ~0.13

    return {
        "zone_flood": {
            "value":  zp["flood"],
            "weight": FEATURE_WEIGHTS["zone_flood"],
            "label":  "Environmental Flood Index",
        },
        "zone_claims": {
            "value":  zp["claims"],
            "weight": FEATURE_WEIGHTS["zone_claims"],
            "label":  "Hyper-local Claim Density",
        },
        "seasonal": {
            "value":  1.0 if is_monsoon else 0.20,
            "weight": FEATURE_WEIGHTS["seasonal"],
            "label":  "Monsoon Seasonality Impact",
        },
        "hours_exp": {
            "value":  min(avg_hours / 10.0, 1.2), # Penalize extreme overtime > 10hrs
            "weight": FEATURE_WEIGHTS["hours_exp"],
            "label":  "Operational Exposure",
        },
        "tenure_risk": {
            "value":  round(float(tenure_val), 3),
            "weight": FEATURE_WEIGHTS["tenure_risk"],
            "label":  "Worker Reliability Score",
        },
    }

def compute_coverage_hours(
    zone:          str,
    tenure_months: int,
    is_monsoon:    bool,
) -> Tuple[int, int, int, int]:
    zp = ZONE_PROFILES.get(zone, {"flood": 0.55})
    
    # Advanced logic: Low flood risk zones grant more "Parametric Buffer" hours
    base = 8
    safe_bonus = 2 if zp["flood"] < 0.45 else (1 if zp["flood"] < 0.60 else 0)
    offseason = 1 if not is_monsoon else 0
    tenure_bonus = min(tenure_months // 6, 3) # Up to 3 hours bonus for long tenure
    
    total = base + safe_bonus + offseason + tenure_bonus
    return int(total), safe_bonus, offseason, tenure_bonus

def predict_premium(
    zone:          str,
    tier:          str,
    avg_hours:     float,
    tenure_months: int,
    is_monsoon:    bool,
) -> dict:
    base = TIER_BASE.get(tier, 49.0)
    features = build_feature_vector(zone, avg_hours, tenure_months, is_monsoon)
    
    # Phase 3 Logic: Compound Risk (If both flood and monsoon are high, add penalty)
    raw_score = sum(f["value"] * f["weight"] for f in features.values())
    compound_penalty = 0.15 if (is_monsoon and ZONE_PROFILES.get(zone, {}).get("flood", 0) > 0.7) else 0.0
    
    final_score = min(raw_score + compound_penalty, 1.0)

    # Multiplier maps [0, 1] to [0.70, 1.30]
    multiplier = 0.70 + (final_score * 0.60)
    
    # Apply Cap Logic
    lo, hi = base * (1 - ADJUSTMENT_CAP), base * (1 + ADJUSTMENT_CAP)
    final_premium = round(max(lo, min(hi, base * multiplier)))

    coverage_hours, safe_bonus, offseason_bonus, tenure_bonus = compute_coverage_hours(
        zone, tenure_months, is_monsoon
    )

    # Generate Intelligent Explanation
    diff = final_premium - base
    if diff > 0:
        reason = "Flood Risk" if features["zone_flood"]["value"] > 0.7 else "Operational Hours"
        explanation = f"Premium adjusted by +₹{diff} due to high {reason} in {zone}."
    elif diff < 0:
        explanation = f"Loyalty discount of ₹{abs(diff)} applied based on your {tenure_months} month tenure."
    else:
        explanation = "Neutral risk profile. Standard tier pricing applied."

    return {
        "base_premium":     float(base),
        "final_premium":    float(final_premium),
        "risk_score":       round(float(final_score), 4),
        "multiplier":       round(float(multiplier), 3),
        "coverage_hours":   coverage_hours,
        "safe_bonus":       safe_bonus,
        "off_season_bonus": offseason_bonus,
        "tenure_bonus":     tenure_bonus,
        "features":         features,
        "explanation":      explanation,
        "confidence":       0.94 # Static for demo, represents model certainty
    }