import logging
import uuid

from supabase import create_client

from src.config import settings

logger = logging.getLogger(__name__)

BUCKET = "photos"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


async def upload_photo(user_id: str, file_bytes: bytes, content_type: str, ext: str) -> str:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    path = f"{user_id}/{uuid.uuid4()}.{ext}"
    supabase.storage.from_(BUCKET).upload(
        path,
        file_bytes,
        {"content-type": content_type},
    )
    public_url = supabase.storage.from_(BUCKET).get_public_url(path)
    logger.info("Uploaded photo to %s", path)
    return public_url
