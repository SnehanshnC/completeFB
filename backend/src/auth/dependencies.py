from typing import Annotated
from uuid import UUID

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.auth.schemas import CurrentUser
from src.users.models import Profile
from src.pages.models import PagePermission

# Fetches Supabase's public key automatically and caches it.
# Works with both old HS256 projects and new ECC P-256 projects.
_jwks_client = PyJWKClient(
    f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def _extract_token(request: Request) -> str:
    """Extract JWT from HttpOnly cookie first, falling back to Authorization header."""
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        return token

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    token = _extract_token(request)
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "HS256"],
            audience="authenticated",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    email = payload.get("email", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return CurrentUser(
        id=profile.id,
        email=email,
        role=profile.role,
        username=profile.username,
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def require_admin(user: CurrentUserDep) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


AdminDep = Annotated[CurrentUser, Depends(require_admin)]


async def check_page_access(
    page_id: int,
    user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    if user.role == "admin":
        return user
    result = await db.execute(
        select(PagePermission).where(
            PagePermission.user_id == user.id,
            PagePermission.page_id == page_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this page",
        )
    return user


PageAccessDep = Annotated[CurrentUser, Depends(check_page_access)]
