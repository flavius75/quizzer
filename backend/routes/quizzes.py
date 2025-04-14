from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from models import Quiz, QuizPreview, User
from sqlmodel import Session, select
from db.database import get_session  # Database session dependency
from typing import List
import logging
logger = logging.getLogger(__name__)


router = APIRouter()

# Register new user


@router.get("/", response_model=List[Quiz])
def get_quizzes(
    skip: int = 0, limit: int = 10, session: Session = Depends(get_session)
):
    return session.exec(select(Quiz).offset(skip).limit(limit)).all()


@router.get("/preview", response_model=List[QuizPreview])
def get_quizzes_preview(session: Session = Depends(get_session)):
    quizzes = session.exec(select(Quiz)).all()
    return quizzes


@router.get("/{quiz_id}", response_model=Quiz)
def get_single_quiz(quiz_id: int, session: Session = Depends(get_session)):
    statement = select(Quiz).where(Quiz.id == quiz_id)
    quiz = session.exec(statement).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="User not found")
    return quiz


@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Vérifier si l'utilisateur est propriétaire ou admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    statement = select(Quiz).where(Quiz.id == quiz_id)
    quiz = session.exec(statement).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(quiz)
    session.commit()

    logger.info(f"Quiz <{quiz.id} - {quiz.title}> was deleted by {current_user.username} ")
    return {"success": True, "message": "Quiz deleted"}
