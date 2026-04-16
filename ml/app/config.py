"""
GigShield — Global Configuration (Phase 3 Optimized)
Handles environment variables, security settings, and model versioning.
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # --- Server Settings ---
    APP_NAME:        str   = "GigShield-ML-Engine"
    PORT:            int   = 8000
    DEBUG:           bool  = True
    APP_ENV:         str   = "development" # development | production
    
    # --- Security & CORS ---
    # In Phase 3, we tighten origins to prevent unauthorized access
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:4000",
        "https://gigshield-prod.com" # Placeholder for your production URL
    ]
    SECRET_KEY:      str   = "highly-secret-ml-key-for-phase-3"

    # --- ML Model Metadata ---
    # Essential for tracking which AI version is currently serving predictions
    MODEL_PATH:      str   = "./models"
    MODEL_VERSION:   str   = "v1.2.5-xgboost-hybrid"
    
    # --- Performance Tuning ---
    # Number of workers for Uvicorn (Phase 3 optimization)
    WORKERS_COUNT:   int   = 1 if os.name == 'nt' else 4 # 1 for Windows dev, 4 for Linux prod
    
    # --- Prometheus Metrics ---
    METRICS_ENABLED: bool  = True

    class Config:
        env_file = ".env"
        case_sensitive = True

# Global instance to be imported by other modules
settings = Settings()