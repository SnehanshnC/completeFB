import uuid
from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
