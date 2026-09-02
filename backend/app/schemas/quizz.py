from sqlmodel import SQLModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ---------------------------
# Quiz Schemas
# ---------------------------
class QuizBase(SQLModel):
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: str = "public"  # public | private
    time_limit: Optional[int] = None  # seconds


class QuizCreate(QuizBase):
    pass


class QuizUpdate(SQLModel):
    title: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: Optional[str] = None
    time_limit: Optional[int] = None


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
    question_id: int
    answer_id: Optional[int] = None  # single_choice / true_false / fill_blank
    answer_ids: Optional[List[int]] = None  # multiple_choice: every answer the player checked
    play_id: Optional[int] = None  # unused server-side (play is resolved from the session_uuid path param); kept for backward compatibility with existing clients


class PlayAnswerRead(PlayAnswerBase):
    id: int
    play_id: int
    question_id: int
    answer_id: Optional[int] = None


# ---------------------------
# Nested read models: quiz + its questions + their answers
# (kept as distinct classes from the flat QuestionRead/AnswerRead above -
# reusing the same names for a different shape was a source of silent bugs).
# ---------------------------
class AnswerReadNested(SQLModel):
    id: int
    text: Optional[str] = None
    image: Optional[str] = None
    is_correct: bool = False


class QuestionReadWithAnswers(SQLModel):
    id: int
    text: str
    image: Optional[str] = None
    question_type: str
    quiz_id: int
    created_at: datetime
    answers: List[AnswerReadNested] = []


class QuizReadWithQuestions(SQLModel):
    id: int
    uuid: UUID
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: str
    time_limit: Optional[int] = None
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionReadWithAnswers] = []
