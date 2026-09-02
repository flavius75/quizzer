from sqlmodel import SQLModel
from datetime import datetime
from typing import Optional


# ---------------------------
# User Schemas
# ---------------------------
class UserBase(SQLModel):
    username: str
    email: Optional[str] = None


class UserCreate(UserBase):
    """Public registration payload. Deliberately has no `role` field: a new
    account is always created as "player" (see routes/auth.py). Promoting a
    user to creator/admin is an explicit admin-only action, never something
    the registering client can request for itself."""

    password: str  # plain password, will be hashed before storing


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
