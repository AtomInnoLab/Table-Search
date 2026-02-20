"""应用配置"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置"""

    # 应用基础配置
    APP_ENV: str = "development"
    APP_NAME: str = "Dynamic Literature Matrix"
    LOG_LEVEL: str = "INFO"

    # CORS配置
    CORS_ORIGINS: str = "http://localhost:3000"

    # Mock配置
    USE_MOCK_SEARCH: bool = True
    USE_MOCK_EXTRACTION: bool = True

    # Wispaper API配置
    WISPAPER_API_URL: str = "https://gateway.dev.wispaper.ai/api/v1/search/completions"
    WISPAPER_AUTH_TOKEN: str = ""

    # MiniMax LLM配置
    MINIMAX_API_KEY: str = ""
    MINIMAX_BASE_URL: str = "https://api.minimax.chat/v1"
    MINIMAX_MODEL: str = "MiniMax-M2.5"
    EXTRACTION_CONCURRENCY: int = 10

    @property
    def cors_origins_list(self) -> List[str]:
        """解析CORS origins为列表"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
