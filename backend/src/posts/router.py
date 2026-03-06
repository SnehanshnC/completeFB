import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, UploadFile, status

from src.auth.dependencies import CurrentUserDep
from src.dependencies import DbSession
from src.facebook.client import post_photo_to_page, post_to_page
from src.pages import service as page_service
from src.pages.models import PagePermission
from src.posts import service
from src.posts.schemas import (
    GenerateAiImageRequest,
    GenerateAiImageResponse,
    GenerateStoryRequest,
    GenerateStoryResponse,
    ImmediatePostResponse,
    PostCreate,
    ScheduledPostCreate,
    ScheduledPostUpdate,
    serialize_post,
    serialize_posts,
)
from src.storage.client import ALLOWED_TYPES, MAX_SIZE, delete_photo, upload_photo

router = APIRouter(prefix="/posts", tags=["posts"])


async def _check_page_access(db, user, page_db_id: int):
    """Verify user has access to the given page (admin or assigned)."""
    page = await page_service.get_page(db, page_db_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if user.role != "admin":
        from sqlalchemy import select

        result = await db.execute(
            select(PagePermission).where(
                PagePermission.user_id == user.id,
                PagePermission.page_id == page_db_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="No access to this page")
    return page


@router.post("/immediate", response_model=ImmediatePostResponse)
async def post_immediate(data: PostCreate, user: CurrentUserDep, db: DbSession):
    page = await _check_page_access(db, user, data.page_id)
    try:
        if data.photo_url:
            result = await post_photo_to_page(
                page.page_id, page.access_token, data.photo_url, data.message
            )
        else:
            result = await post_to_page(page.page_id, page.access_token, data.message)
    except Exception as e:
        if user.role == "admin":
            raise HTTPException(status_code=502, detail=f"Facebook API error: {e}")
        import logging
        logging.getLogger(__name__).error(f"Facebook API error for user {user.id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to publish to Facebook. Please try again or contact an admin.")
    if data.photo_url:
        asyncio.ensure_future(delete_photo(data.photo_url))
    return ImmediatePostResponse(fb_post_id=result["id"], message="Posted successfully")


@router.post("/upload-photo")
async def upload_photo_endpoint(file: UploadFile, user: CurrentUserDep):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpeg, png, webp, gif")
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    url = await upload_photo(contents)
    return {"url": url}


@router.post("/generate-story", response_model=GenerateStoryResponse)
async def generate_story_endpoint(
    data: GenerateStoryRequest, user: CurrentUserDep
):
    from src.storage.gemini import generate_story

    try:
        story = await generate_story(data.image_url, data.theme)
    except Exception as e:
        import logging

        logging.getLogger(__name__).error("Story generation failed: %s", repr(e))
        raise HTTPException(
            status_code=502,
            detail="Story generation failed. Please try again.",
        )
    return GenerateStoryResponse(story=story)


@router.post("/generate-ai-image", response_model=GenerateAiImageResponse)
async def generate_ai_image_endpoint(
    data: GenerateAiImageRequest, user: CurrentUserDep
):
    from src.storage.gemini import generate_ai_image

    try:
        url = await generate_ai_image(data.image_url, data.mode)
    except Exception as e:
        import logging

        logging.getLogger(__name__).error("AI image generation failed: %s", repr(e))
        raise HTTPException(
            status_code=502,
            detail="AI image generation failed. Please try again.",
        )
    return GenerateAiImageResponse(url=url)


@router.get("/scheduled")
async def list_scheduled(user: CurrentUserDep, db: DbSession):
    posts = await service.list_scheduled_posts(db, user.id, user.role)
    return serialize_posts(posts, user.role)


@router.post("/scheduled", status_code=status.HTTP_201_CREATED)
async def create_scheduled(data: ScheduledPostCreate, user: CurrentUserDep, db: DbSession):
    await _check_page_access(db, user, data.page_id)
    post = await service.create_scheduled_post(db, user.id, data)
    return serialize_post(post, user.role)


@router.get("/scheduled/{post_id}")
async def get_scheduled(post_id: int, user: CurrentUserDep, db: DbSession):
    post = await service.get_scheduled_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if user.role != "admin" and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return serialize_post(post, user.role)


@router.put("/scheduled/{post_id}")
async def update_scheduled(
    post_id: int, data: ScheduledPostUpdate, user: CurrentUserDep, db: DbSession
):
    post = await service.get_scheduled_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if user.role != "admin" and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if post.status not in ("pending", "failed"):
        raise HTTPException(status_code=400, detail="Can only update pending or failed posts")
    if data.scheduled_at and data.scheduled_at < datetime.now(timezone.utc) + timedelta(seconds=30):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    updated = await service.update_scheduled_post(db, post, data)
    return serialize_post(updated, user.role)


@router.put("/scheduled/{post_id}/requeue")
async def requeue_scheduled(post_id: int, user: CurrentUserDep, db: DbSession):
    post = await service.get_scheduled_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if user.role != "admin" and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if post.status != "failed":
        raise HTTPException(status_code=400, detail="Can only requeue failed posts")
    updated = await service.requeue_post(db, post)
    return serialize_post(updated, user.role)


@router.delete("/delete-photo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo_endpoint(url: str, user: CurrentUserDep):
    await delete_photo(url)


@router.delete("/scheduled/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled(post_id: int, user: CurrentUserDep, db: DbSession):
    post = await service.get_scheduled_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if user.role != "admin" and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    photo_url = post.photo_url
    await service.delete_scheduled_post(db, post_id)
    if photo_url:
        asyncio.ensure_future(delete_photo(photo_url))
