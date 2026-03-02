import io
import logging
from typing import Literal

import httpx
from PIL import Image
from google import genai
from google.genai import types

from src.config import settings
from src.storage.client import upload_photo

logger = logging.getLogger(__name__)

AiMode = Literal["simple", "normal", "niche"]

MODE_CONFIG: dict[str, dict[str, str]] = {
    "simple": {
        "model": "gemini-2.5-flash-image",
        "prompt": (
                "AVOID BLUR\n\n"
                "A highly realistic accidental iPhone candid photograph.\n\n"
                "Same type of real-world incident and emotional tone as the reference image.\n\n"
                "Do not recreate this specific scene.\n"
                "Generate another real-world occurrence of this incident archetype.\n\n"
                "Different capture circumstances, arrangement, and progression stage."
        ),
    },
    "normal": {
        "model": "gemini-3.1-flash-image-preview",
        "prompt": (
            "AVOID BLUR\n\n"
            "A highly realistic iPhone candid photograph.\n\n"
            "Same type of real-world incident and emotional tone as the reference image.\n"
            "Do not recreate this specific scene.\n\n"
            "Generate another real-world occurrence of this incident archetype.\n"
            "Different capture circumstances, arrangement, and progression stage."
        ),
    },
    "niche": {
        "model": "gemini-3.1-flash-image-preview",
        "prompt": (
            "AVOID BLUR\n"
            "An iPhone candid photograph.\n"
            "Do not recreate this specific scene... "
            "Generate another real-world occurrence of this incident archetype without blur\n"
            "Same type of real-world incident and emotional tone as the reference image.\n"
            "Different capture circumstances, arrangement, and progression stage.\n"
            "no logos from the input image should be portrayed on the output image"
        ),
    },
}

# Singleton client — created once at first use, reused for all requests
_gemini_client: genai.Client | None = None

# Persistent HTTP client — SSL handshake happens once, connections are reused
_http_client = httpx.AsyncClient(timeout=60.0)


def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _downscale_for_gemini(image_bytes: bytes, mime_type: str, max_px: int = 1024) -> tuple[bytes, str]:
    """Downscale image to max_px on the longest side before sending to Gemini.
    Gemini doesn't need full resolution to understand the scene — smaller input
    means less data uploaded to Google and faster processing time.
    """
    img = Image.open(io.BytesIO(image_bytes))
    if max(img.size) <= max_px:
        return image_bytes, mime_type
    img.thumbnail((max_px, max_px), Image.LANCZOS)
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    logger.info("Downscaled input image to %dx%d for Gemini", img.size[0], img.size[1])
    return buf.getvalue(), "image/jpeg"


async def _call_gemini_async(image_bytes: bytes, mime_type: str, mode: AiMode = "normal") -> bytes:
    """Async Gemini call using the native async SDK — no thread pool needed."""
    cfg = MODE_CONFIG[mode]
    client = _get_gemini_client()

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    if mode in ("normal", "niche"):
        config_kwargs["image_config"] = types.ImageConfig(image_size="512px")
    else:
        config_kwargs["response_modalities"] = ["IMAGE", "TEXT"]

    response = await client.aio.models.generate_content(
        model=cfg["model"],
        contents=[
            types.Content(
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=cfg["prompt"]),
                ],
            ),
        ],
        config=types.GenerateContentConfig(**config_kwargs),
    )

    candidates = response.candidates
    if not candidates:
        raise RuntimeError("Gemini returned no candidates — image generation was blocked")

    candidate = candidates[0]
    content = getattr(candidate, "content", None)
    parts = getattr(content, "parts", None) if content else None

    if not parts:
        reason = getattr(candidate, "finish_reason", None) or "unknown"
        raise RuntimeError(f"Gemini refused to generate this image (reason: {reason})")

    for part in parts:
        if part.inline_data is not None:
            return part.inline_data.data
        if part.text:
            logger.warning("Gemini returned text instead of image: %s", part.text)
    raise RuntimeError("Gemini returned no image data")


async def generate_ai_image(image_url: str, mode: AiMode = "normal") -> str:
    """Download image from URL, generate AI variant via Gemini, upload to imgBB."""
    resp = await _http_client.get(image_url, follow_redirects=True)
    resp.raise_for_status()
    image_bytes = resp.content
    mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]

    image_bytes, mime_type = _downscale_for_gemini(image_bytes, mime_type)

    logger.info("Calling Gemini [%s] mode (%s) for AI image generation", mode, MODE_CONFIG[mode]["model"])
    generated_bytes = await _call_gemini_async(image_bytes, mime_type, mode)

    url = await upload_photo(generated_bytes)
    logger.info("AI-generated image uploaded to imgBB: %s", url)
    return url
