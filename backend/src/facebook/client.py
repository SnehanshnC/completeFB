import logging

import httpx

from src.pages.schemas import PageTokenValidation

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v18.0"


async def validate_token(access_token: str) -> PageTokenValidation:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GRAPH_API}/me",
            params={"fields": "id,name", "access_token": access_token},
        )
    if resp.status_code == 200:
        data = resp.json()
        return PageTokenValidation(
            valid=True, fb_page_id=data["id"], fb_page_name=data["name"]
        )
    return PageTokenValidation(valid=False, error=resp.text)


async def post_to_page(
    page_id: str, access_token: str, message: str
) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_API}/{page_id}/feed",
            data={"message": message, "access_token": access_token},
        )
    resp.raise_for_status()
    return resp.json()


async def post_photo_to_page(
    page_id: str, access_token: str, photo_url: str, caption: str
) -> dict:
    async with httpx.AsyncClient() as client:
        # Step 1: Upload photo as unpublished
        photo_resp = await client.post(
            f"{GRAPH_API}/{page_id}/photos",
            data={
                "url": photo_url,
                "published": "false",
                "access_token": access_token,
            },
        )
        photo_resp.raise_for_status()
        photo_id = photo_resp.json()["id"]

        # Step 2: Create feed post with attached media
        feed_resp = await client.post(
            f"{GRAPH_API}/{page_id}/feed",
            data={
                "message": caption,
                "attached_media[0]": f'{{"media_fbid":"{photo_id}"}}',
                "access_token": access_token,
            },
        )
        feed_resp.raise_for_status()
        return feed_resp.json()
