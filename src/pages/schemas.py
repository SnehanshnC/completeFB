from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PageCreate(BaseModel):
    page_id: str
    page_name: str
    access_token: str


class PageRead(BaseModel):
    id: int
    page_id: str
    page_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PageUpdate(BaseModel):
    access_token: str


class PageTokenValidation(BaseModel):
    valid: bool
    fb_page_id: Optional[str] = None
    fb_page_name: Optional[str] = None
    error: Optional[str] = None
