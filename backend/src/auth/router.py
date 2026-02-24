from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from supabase import ClientOptions, create_client

from src.auth.dependencies import CurrentUserDep
from src.auth.schemas import CurrentUser, LoginRequest, LoginResponse
from src.config import settings
from src.dependencies import DbSession
from src.pages.models import Page, PagePermission
from src.users.models import Profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, response: Response, db: DbSession):
    """
    Exchange username/password for a JWT. Sets the token as an HttpOnly cookie
    and returns user info (no token in body).
    """
    # Look up the profile by username to get the associated email
    result = await db.execute(
        select(Profile).where(Profile.username == data.username)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
        options=ClientOptions(auto_refresh_token=False),
    )
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": profile.email, "password": data.password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    session = auth_response.session
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=session.access_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=session.expires_in,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
    )

    return LoginResponse(
        expires_in=session.expires_in,
        user=CurrentUser(
            id=profile.id,
            email=profile.email,
            role=profile.role,
            username=profile.username,
        ),
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=settings.COOKIE_PATH,
        domain=settings.COOKIE_DOMAIN,
    )
    return {"detail": "Logged out"}


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
