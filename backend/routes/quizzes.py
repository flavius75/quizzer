from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, oauth2_scheme, verify_token
from models import Quiz, QuizPreview
from sqlmodel import Session, select
from db.database import get_session  # Database session dependency
from typing import List


router = APIRouter()

# Register new user

@router.get("/", response_model=List[QuizPreview])
def get_quizzes(session: Session = Depends(get_session)):
    quizzes = session.exec(select(Quiz)).all()
    return quizzes


@router.get("/{quiz_id}", response_model=QuizPreview)
def get_single_quiz(user_id: int , session: Session = Depends(get_session)):
    statement = select(Quiz).where(Quiz.id == user_id)
    quiz = session.exec(statement).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="User not found")
    return quiz

@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int , session: Session = Depends(get_session)):
    statement = select(Quiz).where(Quiz.id == quiz_id)
    quiz = session.exec(statement).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="User not found")
    
    session.delete(quiz)  
    session.commit() 
    return {"success": True, "message":"Quiz deleted"}

