from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from supabase import create_client

from src.auth.dependencies import CurrentUserDep
from src.auth.schemas import CurrentUser, LoginRequest, LoginResponse
from src.config import settings
from src.dependencies import DbSession
from src.pages.models import Page, PagePermission
from src.users.models import Profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: DbSession):
    """
    Exchange email/password for a JWT. The Supabase anon key never
    leaves the server — the client only ever sends credentials here
    and receives a token back.
    """
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    session = auth_response.session
    sb_user = auth_response.user
    if not session or not sb_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    result = await db.execute(select(Profile).where(Profile.id == sb_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return LoginResponse(
        access_token=session.access_token,
        expires_in=session.expires_in,
        user=CurrentUser(
            id=profile.id,
            email=sb_user.email,
            role=profile.role,
            username=profile.username,
        ),
    )


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
