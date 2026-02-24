import logging
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client

from src.config import settings
from src.users.models import Profile
from src.users.schemas import ProfileCreate
from src.pages.models import PagePermission

logger = logging.getLogger(__name__)


def _get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def create_user(db: AsyncSession, data: ProfileCreate) -> Profile:
    supabase = _get_supabase_admin()
    auth_response = supabase.auth.admin.create_user(
        {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        }
    )
    user_id = auth_response.user.id

    profile = Profile(id=user_id, username=data.username, email=data.email, role=data.role)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info("Created user %s (%s)", data.username, user_id)
    return profile


async def list_users(db: AsyncSession) -> list[Profile]:
    result = await db.execute(select(Profile).order_by(Profile.created_at))
    return list(result.scalars().all())


async def delete_user(db: AsyncSession, user_id: UUID) -> None:
    supabase = _get_supabase_admin()
    supabase.auth.admin.delete_user(str(user_id))

    await db.execute(delete(Profile).where(Profile.id == user_id))
    await db.commit()
    logger.info("Deleted user %s", user_id)


async def grant_page_access(db: AsyncSession, user_id: UUID, page_id: int) -> PagePermission:
    perm = PagePermission(user_id=user_id, page_id=page_id)
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return perm


async def revoke_page_access(db: AsyncSession, user_id: UUID, page_id: int) -> None:
    await db.execute(
        delete(PagePermission).where(
            PagePermission.user_id == user_id,
            PagePermission.page_id == page_id,
        )
    )
    await db.commit()


async def get_user_pages(db: AsyncSession, user_id: UUID):
    from src.pages.models import Page

    result = await db.execute(
        select(Page)
        .join(PagePermission, PagePermission.page_id == Page.id)
        .where(PagePermission.user_id == user_id)
    )
    return list(result.scalars().all())
