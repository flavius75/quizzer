from sqlmodel import SQLModel
from datetime import datetime
from typing import Optional
from pydantic import EmailStr, field_validator


# ---------------------------
# User Schemas
# ---------------------------
class UserBase(SQLModel):
    username: str
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    """Public registration payload. Deliberately has no `role` field: a new
    account is always created as "player" (see routes/auth.py). Promoting a
    user to creator/admin is an explicit admin-only action, never something
    the registering client can request for itself."""

    password: str  # plain password, will be hashed before storing

    @field_validator("password")
    @classmethod
    def _password_min_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value


class UserRoleUpdate(SQLModel):
    role: str  # player | creator | admin


class UserRead(UserBase):
    id: int
    role: str
    global_score: int
    created_at: datetime


class UserReadPublic(SQLModel):
    id: int
    username: str
    global_score: int
