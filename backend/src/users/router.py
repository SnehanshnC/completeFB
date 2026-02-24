from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.auth.dependencies import AdminDep
from src.dependencies import DbSession
from src.users import service
from src.users.schemas import ProfileCreate, ProfileRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def create_user(data: ProfileCreate, _admin: AdminDep, db: DbSession):
    try:
        profile = await service.create_user(db, data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return profile


@router.get("", response_model=list[ProfileRead])
async def list_users(_admin: AdminDep, db: DbSession):
    return await service.list_users(db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID, _admin: AdminDep, db: DbSession):
    await service.delete_user(db, user_id)


@router.post(
    "/{user_id}/pages/{page_id}", status_code=status.HTTP_201_CREATED
)
async def grant_page_access(
    user_id: UUID, page_id: int, _admin: AdminDep, db: DbSession
):
    try:
        await service.grant_page_access(db, user_id, page_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"detail": "Access granted"}


@router.delete(
    "/{user_id}/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def revoke_page_access(
    user_id: UUID, page_id: int, _admin: AdminDep, db: DbSession
):
    await service.revoke_page_access(db, user_id, page_id)


@router.get("/{user_id}/pages")
async def get_user_pages(user_id: UUID, _admin: AdminDep, db: DbSession):
    from src.pages.schemas import PageRead

    pages = await service.get_user_pages(db, user_id)
    return [PageRead.model_validate(p) for p in pages]
