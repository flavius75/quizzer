import base64
import binascii

from pydantic import field_validator
from sqlmodel import SQLModel
from typing import Literal, Optional, List
from datetime import datetime
from uuid import UUID

Visibility = Literal["public", "private"]
QuestionType = Literal["single_choice", "multiple_choice", "fill_blank", "true_false"]

# The frontend already rejects anything over 5MB / not png/jpeg/webp before
# it ever leaves the browser, but a client-side check is only a UX nicety:
# it's trivial to bypass by calling the API directly, so the backend has to
# independently enforce the same limits by inspecting the actual bytes
# (magic numbers), not just trusting the declared data: URL mime type.
_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_IMAGE_MAGIC_BYTES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


def _looks_like_webp(raw: bytes) -> bool:
    return raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"


def validate_image_data_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    if "," not in value or not value.startswith("data:image/"):
        raise ValueError("image must be a data:image/... URL")

    _header, _, b64data = value.partition(",")
    try:
        raw = base64.b64decode(b64data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("image data is not valid base64") from exc

    if len(raw) > _MAX_IMAGE_BYTES:
        raise ValueError("image must be under 5MB")

    if not any(raw.startswith(magic) for magic in _IMAGE_MAGIC_BYTES) and not _looks_like_webp(raw):
        raise ValueError("image must be a PNG, JPEG, or WEBP file")

    return value


# ---------------------------
# Quiz Schemas
# ---------------------------
class QuizBase(SQLModel):
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: Visibility = "public"
    time_limit: Optional[int] = None  # seconds

    _validate_image = field_validator("image")(validate_image_data_url)


class QuizCreate(QuizBase):
    pass


class QuizUpdate(SQLModel):
    title: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: Optional[Visibility] = None
    time_limit: Optional[int] = None

    _validate_image = field_validator("image")(validate_image_data_url)


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
    question_type: QuestionType

    _validate_image = field_validator("image")(validate_image_data_url)


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

    _validate_image = field_validator("image")(validate_image_data_url)


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
    question_type: QuestionType
    quiz_id: int
    created_at: datetime
    answers: List[AnswerReadNested] = []


class QuizReadWithQuestions(SQLModel):
    id: int
    uuid: UUID
    title: str
    category: Optional[str] = None
    image: Optional[str] = None
    visibility: Visibility
    time_limit: Optional[int] = None
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionReadWithAnswers] = []
