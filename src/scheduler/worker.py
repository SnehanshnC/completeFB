import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, delete

from src.database import async_session
from src.facebook.client import post_photo_to_page, post_to_page
from src.pages.models import Page
from src.posts.models import ScheduledPost

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5  # seconds
_running = False


async def _process_post(post: ScheduledPost, page: Page) -> None:
    try:
        if post.photo_url:
            result = await post_photo_to_page(
                page.page_id, page.access_token, post.photo_url, post.message
            )
        else:
            result = await post_to_page(page.page_id, page.access_token, post.message)

        # On success, delete the row
        async with async_session() as db:
            await db.execute(delete(ScheduledPost).where(ScheduledPost.id == post.id))
            await db.commit()
        logger.info("Posted and deleted scheduled post %d (fb_id=%s)", post.id, result.get("id"))

    except Exception as e:
        logger.error("Failed to post scheduled post %d: %s", post.id, e)
        async with async_session() as db:
            result = await db.execute(
                select(ScheduledPost).where(ScheduledPost.id == post.id)
            )
            p = result.scalar_one_or_none()
            if p:
                p.status = "failed"
                p.error_message = str(e)
                await db.commit()


async def _poll_and_execute() -> None:
    global _running
    if _running:
        return
    _running = True
    try:
        async with async_session() as db:
            now = datetime.now(timezone.utc)
            result = await db.execute(
                select(ScheduledPost)
                .where(
                    ScheduledPost.status == "pending",
                    ScheduledPost.scheduled_at <= now,
                )
            )
            due_posts = list(result.scalars().all())

            if not due_posts:
                return

            # Fetch pages for all due posts
            page_ids = {p.page_id for p in due_posts}
            page_result = await db.execute(select(Page).where(Page.id.in_(page_ids)))
            pages_by_id = {p.id: p for p in page_result.scalars().all()}

        tasks = []
        for post in due_posts:
            page = pages_by_id.get(post.page_id)
            if not page:
                logger.warning("Page %d not found for post %d", post.page_id, post.id)
                continue
            tasks.append(_process_post(post, page))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    finally:
        _running = False


async def run_scheduler() -> None:
    logger.info("Scheduler started (poll every %ds)", POLL_INTERVAL)
    while True:
        try:
            await _poll_and_execute()
        except Exception as e:
            logger.error("Scheduler error: %s", e)
        await asyncio.sleep(POLL_INTERVAL)
