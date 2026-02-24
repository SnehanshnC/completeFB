import base64
import logging

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


async def upload_photo(file_bytes: bytes) -> str:
    encoded = base64.b64encode(file_bytes).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.imgbb.com/1/upload",
            data={"key": settings.IMGBB_API_KEY, "image": encoded},
        )
    resp.raise_for_status()
    url = resp.json()["data"]["display_url"]
    logger.info("Uploaded photo to imgBB: %s", url)
    return url
