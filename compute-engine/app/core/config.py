from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # API Settings
    APP_NAME: str = "NOVEM Compute Engine"
    VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8001
    
    # Backend API
    BACKEND_API_URL: str = "http://localhost:8000/api"
    COMPUTE_ENGINE_API_KEY: str = os.getenv("COMPUTE_ENGINE_API_KEY", "")
    
    # Storage Paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    METADATA_DIR: Path = BASE_DIR / "metadata"
    TEMP_DIR: Path = BASE_DIR / "temp"
    LOGS_DIR: Path = BASE_DIR / "logs"
    
    # NEW: DuckDB Configuration
    DUCKDB_DIR: Path = DATA_DIR / "duckdb"
    DUCKDB_MEMORY_LIMIT: str = "4GB"
    DUCKDB_THREADS: int = 4
    
    # NEW: Pipeline Configuration
    MELTANO_PROJECT_DIR: Path = BASE_DIR / "meltano"
    MAX_CONCURRENT_PIPELINES: int = 3
    PIPELINE_TIMEOUT_SECONDS: int = 3600
    
    # NEW: Resource Limits
    MAX_MEMORY_PERCENT: float = 80.0  # Don't use more than 80% RAM
    MAX_CPU_PERCENT: float = 90.0
    MAX_STORAGE_GB: float = 50.0
    
    # NEW: WebSocket
    WEBSOCKET_PORT: int = 8002
    
    # NEW: Sync Configuration
    SYNC_INTERVAL_SECONDS: int = 300  # 5 minutes
    OFFLINE_MODE: bool = False
    
    # NEW: Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  


settings = Settings()

# Create directories if they don't exist
for directory in [
    settings.DATA_DIR,
    settings.METADATA_DIR,
    settings.TEMP_DIR,
    settings.LOGS_DIR,
    settings.DUCKDB_DIR,
    settings.MELTANO_PROJECT_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)