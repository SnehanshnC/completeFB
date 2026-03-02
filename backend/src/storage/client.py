import base64
import io
import logging

import httpx
from PIL import Image

from src.config import settings

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 15 * 1024 * 1024  # 5MB — reject truly massive files early

_IMGBB_RAW_LIMIT = 3 * 1024 * 1024  # 3MB raw → ~4MB base64, safely under imgBB's 5MB cap


def _compress_for_upload(file_bytes: bytes) -> bytes:
    """Compress image only if it exceeds imgBB's effective upload limit."""
    if len(file_bytes) <= _IMGBB_RAW_LIMIT:
        return file_bytes

    img = Image.open(io.BytesIO(file_bytes))
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Try progressive quality reduction first (minimal visual impact)
    for quality in [85, 70, 55, 40]:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        if buf.tell() <= _IMGBB_RAW_LIMIT:
            logger.info("Compressed image to %dKB (quality=%d)", buf.tell() // 1024, quality)
            return buf.getvalue()

    # If still too large, shrink dimensions progressively
    scale = 0.75
    while scale > 0.1:
        w, h = img.size
        resized = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="JPEG", quality=55, optimize=True)
        if buf.tell() <= _IMGBB_RAW_LIMIT:
            logger.info("Compressed image to %dKB (scale=%.2f)", buf.tell() // 1024, scale)
            return buf.getvalue()
        scale *= 0.75

    raise ValueError("Image could not be compressed to an acceptable size")


async def upload_photo(file_bytes: bytes) -> str:
    file_bytes = _compress_for_upload(file_bytes)
    encoded = base64.b64encode(file_bytes).decode()
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            "https://api.imgbb.com/1/upload",
            data={"key": settings.IMGBB_API_KEY, "image": encoded},
        )
    resp.raise_for_status()
    url = resp.json()["data"]["image"]["url"]
    logger.info("Uploaded photo to imgBB: %s", url)
    return url
