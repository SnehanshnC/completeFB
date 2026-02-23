from fastapi import APIRouter
from sqlalchemy import select

from src.auth.dependencies import CurrentUserDep
from src.auth.schemas import CurrentUser
from src.dependencies import DbSession
from src.pages.models import Page, PagePermission

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUser)
async def get_me(user: CurrentUserDep):
    return user


@router.get("/me/pages")
async def get_my_pages(user: CurrentUserDep, db: DbSession):
    from src.pages.schemas import PageRead

    if user.role == "admin":
        result = await db.execute(select(Page).order_by(Page.page_name))
    else:
        result = await db.execute(
            select(Page)
            .join(PagePermission, PagePermission.page_id == Page.id)
            .where(PagePermission.user_id == user.id)
            .order_by(Page.page_name)
        )
    pages = result.scalars().all()
    return [PageRead.model_validate(p) for p in pages]
