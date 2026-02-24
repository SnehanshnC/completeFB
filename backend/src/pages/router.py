from fastapi import APIRouter, HTTPException, status

from src.auth.dependencies import AdminDep, PageAccessDep
from src.dependencies import DbSession
from src.facebook.client import validate_token
from src.pages import service
from src.pages.schemas import PageCreate, PageRead, PageTokenValidation, PageUpdate

router = APIRouter(prefix="/pages", tags=["pages"])


@router.post("", response_model=PageRead, status_code=status.HTTP_201_CREATED)
async def create_page(data: PageCreate, _admin: AdminDep, db: DbSession):
    page = await service.upsert_page(db, data)
    return page


@router.get("", response_model=list[PageRead])
async def list_pages(_admin: AdminDep, db: DbSession):
    return await service.list_pages(db)


@router.get("/{page_id}", response_model=PageRead)
async def get_page(page_id: int, _user: PageAccessDep, db: DbSession):
    page = await service.get_page(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(page_id: int, _admin: AdminDep, db: DbSession):
    page = await service.get_page(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await service.delete_page(db, page_id)


@router.patch("/{page_id}/token", response_model=PageRead)
async def update_page_token(
    page_id: int, data: PageUpdate, _admin: AdminDep, db: DbSession
):
    page = await service.update_token(db, page_id, data.access_token)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.post("/{page_id}/validate", response_model=PageTokenValidation)
async def validate_page_token(page_id: int, _user: PageAccessDep, db: DbSession):
    page = await service.get_page(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    result = await validate_token(page.access_token)
    return result
