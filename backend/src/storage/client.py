import asyncio
import io
import logging
import uuid

from PIL import Image
from supabase import create_client

from src.config import settings

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 15 * 1024 * 1024  # 15MB

_BUCKET = "post-images"
_COMPRESS_LIMIT = 3 * 1024 * 1024  # 3MB

_supabase = None


def _get_client():
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase


def _get_content_type(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _compress_for_upload(file_bytes: bytes) -> bytes:
    """Compress image only if it exceeds the upload limit."""
    if len(file_bytes) <= _COMPRESS_LIMIT:
        return file_bytes

    img = Image.open(io.BytesIO(file_bytes))
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    for quality in [85, 70, 55, 40]:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        if buf.tell() <= _COMPRESS_LIMIT:
            logger.info("Compressed image to %dKB (quality=%d)", buf.tell() // 1024, quality)
            return buf.getvalue()

    scale = 0.75
    while scale > 0.1:
        w, h = img.size
        resized = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="JPEG", quality=55, optimize=True)
        if buf.tell() <= _COMPRESS_LIMIT:
            logger.info("Compressed image to %dKB (scale=%.2f)", buf.tell() // 1024, scale)
            return buf.getvalue()
        scale *= 0.75

    raise ValueError("Image could not be compressed to an acceptable size")


async def upload_photo(file_bytes: bytes) -> str:
    file_bytes = _compress_for_upload(file_bytes)
    content_type = _get_content_type(file_bytes)
    ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp"}.get(
        content_type, ".jpg"
    )
    path = f"{uuid.uuid4().hex}{ext}"

    def _do_upload() -> str:
        client = _get_client()
        client.storage.from_(_BUCKET).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )
        return client.storage.from_(_BUCKET).get_public_url(path)

    url = await asyncio.to_thread(_do_upload)
    logger.info("Uploaded photo to Supabase Storage: %s", url)
    return url


async def delete_photo(photo_url: str) -> None:
    """Delete a photo from Supabase Storage given its public URL.

    Silently ignores non-Supabase URLs so it's safe to call on any URL.
    """
    marker = f"/object/public/{_BUCKET}/"
    idx = photo_url.find(marker)
    if idx == -1:
        logger.debug("delete_photo: skipping non-Supabase URL: %s", photo_url)
        return
    path = photo_url[idx + len(marker):]

    def _do_delete() -> None:
        _get_client().storage.from_(_BUCKET).remove([path])

    try:
        await asyncio.to_thread(_do_delete)
        logger.info("Deleted photo from Supabase Storage: %s", path)
    except Exception as e:
        logger.warning("delete_photo failed for %s: %s", photo_url, e)
