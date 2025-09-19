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



# ---------------------------
# User Schemas
# ---------------------------
class UserBase(SQLModel):
    username: str
    email: Optional[str] = None
    role: str = "player"


class UserCreate(UserBase):
    password: str  # plain password, will be hashed before storing


class UserRead(UserBase):
    id: int
    global_score: int
    created_at: datetime


class UserReadPublic(SQLModel):
    id: int
    username: str
    global_score: int


# ---------------------------
# Quiz Schemas
# ---------------------------
class QuizBase(SQLModel):
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: str = "public"  # public | private


class QuizCreate(QuizBase):
    pass


class QuizUpdate(SQLModel):
    title: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: Optional[str] = None


class QuizRead(QuizBase):
    id: int
    uuid: UUID
    creator_id: Optional[int]
    created_at: datetime
    updated_at: datetime


# ---------------------------
# Question Schemas
# ---------------------------
class QuestionBase(SQLModel):
    text: str
    image: Optional[str] = None
    question_type: str  # single_choice | multiple_choice | fill_blank | true_false


class QuestionCreate(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    id: int
    quiz_id: int
    created_at: datetime


# ---------------------------
# Answer Schemas
# ---------------------------
class AnswerBase(SQLModel):
    text: Optional[str] = None
    image: Optional[str] = None
    is_correct: bool = False


class AnswerCreate(AnswerBase):
    pass


class AnswerRead(AnswerBase):
    id: int
    question_id: int


# ---------------------------
# Play (game session) Schemas
# ---------------------------
class PlayBase(SQLModel):
    score: int = 0


class PlayCreate(SQLModel):
    quiz_id: int


class PlayRead(PlayBase):
    id: int
    quiz_id: int
    user_id: Optional[int]
    session_uuid: UUID
    started_at: datetime
    finished_at: Optional[datetime] = None


# ---------------------------
# PlayAnswer Schemas
# ---------------------------
class PlayAnswerBase(SQLModel):
    text_response: Optional[str] = None
    is_correct: Optional[bool] = None


class PlayAnswerCreate(PlayAnswerBase):
    play_id: int
    question_id: int
    answer_id: Optional[int] = None


class PlayAnswerRead(PlayAnswerBase):
    id: int
    play_id: int
    question_id: int
    answer_id: Optional[int] = None


# ---------------------------
# Answer (nested)
# ---------------------------
class AnswerRead(SQLModel):
    id: int
    text: Optional[str] = None
    image: Optional[str] = None
    is_correct: bool = False
    question_id: int


# ---------------------------
# Question with answers
# ---------------------------
class QuestionRead(SQLModel):
    id: int
    text: str
    image: Optional[str] = None
    question_type: str
    quiz_id: int
    created_at: datetime
    answers: List[AnswerRead] = []


# ---------------------------
# Quiz with questions + answers
# ---------------------------
class QuizReadWithQuestions(SQLModel):
    id: int
    uuid: UUID
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: str
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionRead] = []