from uuid import UUID

from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: UUID
    email: str
    role: str  # "admin" or "va"
    username: str
