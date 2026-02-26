import asyncio
import logging

import httpx
from google import genai
from google.genai import types

from src.config import settings
from src.storage.client import upload_photo

logger = logging.getLogger(__name__)

PROMPT = (
    "AVOID BLUR\n\n"
    "A highly realistic accidental iPhone candid photograph.\n\n"
    "Same type of real-world incident and emotional tone as the reference image.\n\n"
    "Do not recreate this specific scene.\n"
    "Generate another real-world occurrence of this incident archetype.\n\n"
    "Different capture circumstances, arrangement, and progression stage."
)


def _call_gemini(image_bytes: bytes, mime_type: str) -> bytes:
    """Synchronous Gemini call — run via asyncio.to_thread."""
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[
            types.Content(
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=PROMPT),
                ],
            ),
        ],
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            return part.inline_data.data
    raise RuntimeError("Gemini returned no image data")


async def generate_ai_image(image_url: str) -> str:
    """Download image from URL, generate AI variant via Gemini, upload to imgBB."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(image_url, follow_redirects=True)
        resp.raise_for_status()
    image_bytes = resp.content
    mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]

    logger.info("Calling Gemini 2.5 Flash for AI image generation")
    generated_bytes = await asyncio.to_thread(_call_gemini, image_bytes, mime_type)

    url = await upload_photo(generated_bytes)
    logger.info("AI-generated image uploaded to imgBB: %s", url)
    return url
