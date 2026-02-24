import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.pages.models import Page
from src.pages.schemas import PageCreate

logger = logging.getLogger(__name__)


async def upsert_page(db: AsyncSession, data: PageCreate) -> Page:
    stmt = (
        pg_insert(Page)
        .values(
            page_id=data.page_id,
            page_name=data.page_name,
            access_token=data.access_token,
        )
        .on_conflict_do_update(
            index_elements=["page_id"],
            set_={"page_name": data.page_name, "access_token": data.access_token},
        )
        .returning(Page)
    )
    result = await db.execute(stmt)
    await db.commit()
    page = result.scalar_one()
    logger.info("Upserted page %s (%s)", data.page_name, data.page_id)
    return page


async def list_pages(db: AsyncSession) -> list[Page]:
    result = await db.execute(select(Page).order_by(Page.page_name))
    return list(result.scalars().all())


async def get_page(db: AsyncSession, page_id: int) -> Optional[Page]:
    result = await db.execute(select(Page).where(Page.id == page_id))
    return result.scalar_one_or_none()


async def delete_page(db: AsyncSession, page_id: int) -> None:
    page = await get_page(db, page_id)
    if page:
        await db.delete(page)
        await db.commit()
        logger.info("Deleted page %s", page_id)


async def update_token(db: AsyncSession, page_id: int, token: str) -> Optional[Page]:
    page = await get_page(db, page_id)
    if not page:
        return None
    page.access_token = token
    await db.commit()
    await db.refresh(page)
    return page
