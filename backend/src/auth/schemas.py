from uuid import UUID

from pydantic import BaseModel, EmailStr


class CurrentUser(BaseModel):
    id: UUID
    email: str
    role: str  # "admin" or "va"
    username: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: CurrentUser
