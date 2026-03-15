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
StoryTheme = Literal["ungrateful", "delusional", "sympathetic"]

STORY_THEME_CONFIG: dict[str, dict[str, str]] = {
    "ungrateful": {
        "model": "gemini-3.1-flash-lite-preview",
        "prompt": (
            'You are a viral story generator where the input is an image and the output is a two to five sentence action of a story. '
            'This is for the "ungrateful" theme. Basically, you\'re going to infer the image and then create a story that has virality potential, '
            "where you are just ungrateful in the story that you generate. The story must make logical sense and should be depictable by the image, "
            "in a sense. The story must include the setting and the people in the story. Ideally, it should be personable, so it would be something "
            'like, "My something," or "I was delivering to something," etc., etc. You should try to be very creative with the story, but it should '
            "again make logical sense. The story should make you look like an absolute douchebag, dick, or super ungrateful in that sense."
        ),
    },
    "delusional": {
        "model": "gemini-3.1-flash-lite-preview",
        "prompt": (
            "You are generating a 2-5 sentence first-person rant based on an image.\n\n"
            "Rules:\n\n"
            "The most obvious thing in the image is the result of a situation where I was clearly at fault.\n"
            "I confidently reinterpret the rules of the situation to prove I was right.\n"
            "I escalate the situation because I believe I'm justified.\n"
            "Someone reacts negatively in real time.\n"
            "There is a realistic consequence.\n"
            "The final sentence must strongly defend my version of events.\n\n"
            "Write casually like I'm venting immediately after it happened. I should introduce the setting and the people involved properly. "
            'Ideally, it should be personable, so it would be something like, "My xyz," or "I was doing xyz," etc.\n'
            "No technical language.\n"
            "No moral commentary.\n"
            "Keep it realistic."
        ),
    },
    "sympathetic": {
        "model": "gemini-3.1-flash-lite-preview",
        "prompt": (
            "You are a viral short-form story generator.\n\n"
            "Input: An image.\n\n"
            "Output: 2-5 sentences in first person.\n\n"
            "Theme: Self-centered cruelty that creates moral tension.\n\n"
            "Requirements:\n\n"
            "Start immediately in the moment. No slow buildup or background in the first sentence.\n\n"
            "The narrator is in a shared or personal space and reacts harshly toward someone or something more vulnerable.\n\n"
            "The narrator must clearly state their relationship to the person or animals.\n\n"
            "Their reaction must prioritize their own comfort, money, time, or authority.\n\n"
            "The narrator must take a concrete action that harms, removes, or punishes the vulnerable party. Not just threaten it, they actually do it.\n\n"
            "Zero guilt. Zero empathy.\n\n"
            "The reaction and consequence must remain focused on the vulnerable party. Do not introduce unrelated escalation.\n\n"
            "Use casual, everyday phrasing. Avoid dramatic or clever insults. Write it like someone venting quickly on Facebook.\n\n"
            "It must sound like a real Facebook rant written in frustration, not scripted dialogue.\n\n"
            "Restrictions:\n\n"
            "No poetic language.\n"
            "No moral speeches.\n"
            "No audience questions.\n\n"
            "Goal:\n\n"
            "Make the audience feel something in sort of way, making them feel bad about the animals, portray narrator as terrible human, "
            "heartless and disrespectful verbally or physically to someone they hold more power over"
        ),
    },
}

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
        config_kwargs["image_config"] = types.ImageConfig(image_size="1K", aspect_ratio="1:1")
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


async def generate_story(image_url: str, theme: StoryTheme) -> str:
    """Download image from URL, send to Gemini for text generation, return story string."""
    resp = await _http_client.get(image_url, follow_redirects=True)
    resp.raise_for_status()
    image_bytes = resp.content
    mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]

    image_bytes, mime_type = _downscale_for_gemini(image_bytes, mime_type)

    cfg = STORY_THEME_CONFIG[theme]
    client = _get_gemini_client()

    logger.info("Calling Gemini [%s] theme (%s) for story generation", theme, cfg["model"])
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
        config=types.GenerateContentConfig(response_modalities=["TEXT"]),
    )

    candidates = response.candidates
    if not candidates:
        raise RuntimeError("Gemini returned no candidates — story generation was blocked")

    parts = getattr(getattr(candidates[0], "content", None), "parts", None)
    if not parts:
        raise RuntimeError("Gemini returned no content for story generation")

    for part in parts:
        if part.text:
            return part.text.strip()

    raise RuntimeError("Gemini returned no text data")


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
