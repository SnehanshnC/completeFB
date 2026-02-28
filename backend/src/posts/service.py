import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.posts.models import ScheduledPost
from src.posts.schemas import ScheduledPostCreate, ScheduledPostUpdate

logger = logging.getLogger(__name__)


async def create_scheduled_post(
    db: AsyncSession, user_id: UUID, data: ScheduledPostCreate
) -> ScheduledPost:
    post = ScheduledPost(
        user_id=user_id,
        page_id=data.page_id,
        message=data.message,
        photo_url=data.photo_url,
        scheduled_at=data.scheduled_at,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def list_scheduled_posts(
    db: AsyncSession, user_id: UUID, role: str
) -> list[ScheduledPost]:
    stmt = select(ScheduledPost).order_by(ScheduledPost.scheduled_at.desc())
    if role != "admin":
        stmt = stmt.where(ScheduledPost.user_id == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_scheduled_post(db: AsyncSession, post_id: int) -> Optional[ScheduledPost]:
    result = await db.execute(select(ScheduledPost).where(ScheduledPost.id == post_id))
    return result.scalar_one_or_none()


async def update_scheduled_post(
    db: AsyncSession, post: ScheduledPost, data: ScheduledPostUpdate
) -> ScheduledPost:
    if data.message is not None:
        post.message = data.message
    if data.photo_url is not None:
        post.photo_url = data.photo_url
    if data.scheduled_at is not None:
        post.scheduled_at = data.scheduled_at
    await db.commit()
    await db.refresh(post)
    return post


async def requeue_post(db: AsyncSession, post: ScheduledPost) -> ScheduledPost:
    post.status = "pending"
    post.error_message = None
    post.scheduled_at = datetime.now(timezone.utc) + timedelta(minutes=2)
    await db.commit()
    await db.refresh(post)
    return post


async def delete_scheduled_post(db: AsyncSession, post_id: int) -> None:
    await db.execute(delete(ScheduledPost).where(ScheduledPost.id == post_id))
    await db.commit()
