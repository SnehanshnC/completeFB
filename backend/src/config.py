from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str
    IMGBB_API_KEY: str
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DEBUG: bool = False

    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False       # True in production
    COOKIE_SAMESITE: str = "lax"
    COOKIE_HTTPONLY: bool = True
    COOKIE_DOMAIN: str | None = None
    COOKIE_PATH: str = "/"


settings = Settings()
