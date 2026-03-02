import asyncio
import logging
from typing import Literal

import httpx
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


def _call_gemini(image_bytes: bytes, mime_type: str, mode: AiMode = "normal") -> bytes:
    """Synchronous Gemini call — run via asyncio.to_thread."""
    cfg = MODE_CONFIG[mode]
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    if mode in ("normal", "niche"):
        config_kwargs["image_config"] = types.ImageConfig(image_size="512px")
    else:
        config_kwargs["response_modalities"] = ["IMAGE", "TEXT"]

    response = client.models.generate_content(
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
    # Guard against Gemini refusing to generate (content policy / safety block).
    # The API returns HTTP 200 but candidates[0].content or .parts can be None.
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
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(image_url, follow_redirects=True)
        resp.raise_for_status()
    image_bytes = resp.content
    mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]

    logger.info("Calling Gemini [%s] mode (%s) for AI image generation", mode, MODE_CONFIG[mode]["model"])
    generated_bytes = await asyncio.to_thread(_call_gemini, image_bytes, mime_type, mode)

    url = await upload_photo(generated_bytes)
    logger.info("AI-generated image uploaded to imgBB: %s", url)
    return url
