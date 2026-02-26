from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class PostCreate(BaseModel):
    page_id: int
    message: str
    photo_url: Optional[str] = None


class ScheduledPostCreate(BaseModel):
    page_id: int
    message: str
    photo_url: Optional[str] = None
    scheduled_at: datetime


class ScheduledPostUpdate(BaseModel):
    message: Optional[str] = None
    photo_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class PostRead(BaseModel):
    id: int
    user_id: UUID
    page_id: int
    message: str
    photo_url: Optional[str] = None
    scheduled_at: datetime
    status: str
    fb_post_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostReadSlim(BaseModel):
    """Post response for non-admin users."""
    id: int
    page_id: int
    message: str
    photo_url: Optional[str] = None
    scheduled_at: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImmediatePostResponse(BaseModel):
    fb_post_id: str
    message: str


def serialize_post(post, role: str):
    schema = PostRead if role == "admin" else PostReadSlim
    return schema.model_validate(post)


def serialize_posts(posts, role: str):
    schema = PostRead if role == "admin" else PostReadSlim
    return [schema.model_validate(p) for p in posts]


class GenerateAiImageRequest(BaseModel):
    image_url: str
    mode: Literal["simple", "normal"] = "normal"


class GenerateAiImageResponse(BaseModel):
    url: str
