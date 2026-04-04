from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PORT:            int   = 8000
    DEBUG:           bool  = True
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4000"]
    MODEL_PATH:      str  = "./models"

    class Config:
        env_file = ".env"

settings = Settings()
