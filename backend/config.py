from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./scalesaathi.db"      # set to the Neon URL in .env / Render
    jwt_secret: str = "dev-only-change-me"                 # MUST be overridden in production
    jwt_expire_minutes: int = 480
    public_base_url: str = "http://localhost:8000"         # used to build QR verify links
    cors_origins: str = "*"                                # comma-separated list, or *
    max_upload_bytes: int = 5 * 1024 * 1024
    seed_sample_on_startup: bool = True
    demo_password: str = "Demo@1234"


settings = Settings()
