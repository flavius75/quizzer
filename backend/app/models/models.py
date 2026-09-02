from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import Json, EmailStr, BaseModel
from uuid import UUID, uuid4




# ---------------------------
# User
# ---------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, nullable=False, max_length=50)
    email: Optional[str] = Field(default=None, unique=True, index=True, max_length=100)
    password_hash: str
    role: str = Field(default="player")  # player | creator | admin
    global_score: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    quizzes: List["Quiz"] = Relationship(back_populates="creator")
    plays: List["Play"] = Relationship(back_populates="user")





# ---------------------------
# Quiz
# ---------------------------
class Quiz(SQLModel, table=True):
    __tablename__ = "quizzes"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: UUID = Field(default_factory=uuid4, index=True, unique=True, nullable=False)
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    visibility: str = Field(default="public")  # public | private
    sharing_link: Optional[str] = Field(default=None, unique=True)  # For private quiz sharing
    time_limit: Optional[int] = None  # seconds
    creator_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    creator: Optional[User] = Relationship(back_populates="quizzes")

    questions: List["Question"] = Relationship(back_populates="quiz")
    plays: List["Play"] = Relationship(back_populates="quiz")




# ---------------------------
# Question
# ---------------------------
class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: Optional[int] = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quizzes.id", nullable=False)
    text: str
    image: Optional[str] = None
    question_type: str  # single_choice | multiple_choice | fill_blank | true_false
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    quiz: Quiz = Relationship(back_populates="questions")
    answers: List["Answer"] = Relationship(back_populates="question")


# ---------------------------
# Answer
# ---------------------------
class Answer(SQLModel, table=True):
    __tablename__ = "answers"

    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="questions.id", nullable=False)
    text: Optional[str] = None
    image: Optional[str] = None
    is_correct: bool = Field(default=False)

    question: Question = Relationship(back_populates="answers")


# ---------------------------
# Play (game session)
# ---------------------------
class Play(SQLModel, table=True):
    __tablename__ = "plays"

    id: Optional[int] = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quizzes.id", nullable=False, index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")  # null = anonymous
    session_uuid: UUID = Field(default_factory=uuid4, index=True, nullable=False)
    score: int = Field(default=0)
    started_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    finished_at:  Optional[datetime] = Field(default=None, index=True)

    user: Optional[User] = Relationship(back_populates="plays")
    quiz: Quiz = Relationship(back_populates="plays")
    play_answers: List["PlayAnswer"] = Relationship(back_populates="play")


# ---------------------------
# PlayAnswer (answers given in a play)
# ---------------------------
class PlayAnswer(SQLModel, table=True):
    __tablename__ = "play_answers"

    id: Optional[int] = Field(default=None, primary_key=True)
    play_id: int = Field(foreign_key="plays.id", nullable=False)
    question_id: int = Field(foreign_key="questions.id", nullable=False)
    answer_id: Optional[int] = Field(default=None, foreign_key="answers.id")
    text_response: Optional[str] = None  # for fill_blank
    is_correct: Optional[bool] = None

    play: Play = Relationship(back_populates="play_answers")
