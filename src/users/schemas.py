from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class ProfileCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    role: str = "va"


class ProfileRead(BaseModel):
    id: UUID
    username: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
