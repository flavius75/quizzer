from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import Json

# Role Enum
class UserRole(str, Enum):
    player = "player"
    creator = "creator"
    admin = "admin"

# Quiz Type Enum
class QuizType(str, Enum):
    single_choice = "single_choice"
    multi_choice = "multi_choice"
    blank_space = "blank_space"
    poll = "poll"
    true_false = "true_false"

class UserRead(SQLModel):
    id: Optional[int]
    username: str
    email: str
    role: UserRole
    score: int

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, nullable=False)
    email: str = Field(unique=True, index=True, nullable=False)
    password: str = Field(nullable=False)
    role: UserRole = Field(default=UserRole.player)
    score: int = Field(default=0)

    quizzes: List["Quiz"] = Relationship(back_populates="creator")

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tag: int = Field(nullable=False, index=True)
    title: str = Field(index=True, nullable=False)
    category: str = Field(nullable=False)  # Use predefined category values in frontend
    type: QuizType = Field(nullable=False)
    questions: Json = Field(nullable=False, sa_type=JSONB)  # Store as JSONB in PostgreSQL
    creator_id: int = Field(foreign_key="user.id")
    creation_date: datetime = Field(default_factory=datetime.utcnow)

    creator: Optional[User] = Relationship(back_populates="quizzes")

    class Config:
        arbitrary_types_allowed = True


class QuizPreview(SQLModel):
    id: Optional[int]
    tag: int
    title: str 
    category: str
    image: Optional[str]
