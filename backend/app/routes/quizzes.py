from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user, oauth2_scheme, get_current_user_optional_bearer
from app.models import (
    Quiz, Question, User, Answer, AnswerCreate, Play, PlayAnswer,
    QuizCreate, QuizRead, QuizReadWithQuestions, 
    QuestionCreate, PlayAnswerCreate, QuestionRead, AnswerRead
)
from sqlmodel import Session, select
from app.db.database import get_session
from typing import List, Optional
from uuid import uuid4
import logging
from datetime import datetime
from typing import Dict
from uuid import UUID
from sqlalchemy import func, desc
from app.auth import get_current_user, get_current_user_optional_bearer
from sqlalchemy import or_  # Add this for the OR condition

logger = logging.getLogger(__name__)
router = APIRouter()

def get_current_user_optional(token: str = Depends(oauth2_scheme)):
    """Get current user or None if not authenticated (for guest access)"""
    try:
        from auth import verify_token
        payload = verify_token(token)
        if payload:
            # Import here to avoid circular import
            from auth import get_current_user
            return get_current_user(token)
    except:
        pass
    return None

# Get all public quizzes
@router.get("/", response_model=List[QuizRead])
def get_quizzes(
    skip: int = 0, 
    limit: int = 10, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional_bearer)  # Optional auth
):
    """
    Get quizzes based on user permissions:
    - No user (guest): Only public quizzes
    - Admin: All quizzes
    - Creator: Public quizzes + their own private quizzes
    - Player: Only public quizzes
    """
    
    # Base query
    query = select(Quiz)
    
    if not current_user:
        # Guest user - only public quizzes
        query = query.where(Quiz.visibility == 'public')
        logger.info("Guest user requesting quizzes - returning public only")
        
    elif current_user.role == "admin":
        # Admin - all quizzes (no additional filter needed)
        logger.info(f"Admin {current_user.username} requesting all quizzes")
        
    elif current_user.role == "creator":
        # Creator - public quizzes OR their own private quizzes
        from sqlalchemy import or_
        query = query.where(
            or_(
                Quiz.visibility == 'public',
                Quiz.creator_id == current_user.id
            )
        )
        logger.info(f"Creator {current_user.username} requesting public + own private quizzes")
        
    else:
        # Regular player - only public quizzes
        query = query.where(Quiz.visibility == 'public')
        logger.info(f"Player {current_user.username} requesting public quizzes only")
    
    # Apply pagination and execute
    quizzes = session.exec(query.offset(skip).limit(limit)).all()
    
    return quizzes

# Get quiz by ID with questions (for playing)
@router.get("/{quiz_id}", response_model=QuizReadWithQuestions)
def get_quiz_with_questions(quiz_id: int, session: Session = Depends(get_session)):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

# Get quiz by UUID (for sharing links)
@router.get("/play/{quiz_uuid}")
def get_quiz_by_uuid(quiz_uuid: str, session: Session = Depends(get_session)):
    quiz = session.exec(select(Quiz).where(Quiz.uuid == quiz_uuid)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

# Create new quiz (creators only)
@router.post("/", response_model=QuizRead)
def create_quiz(
    quiz_data: QuizCreate,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role not in ["creator", "admin"]:
        raise HTTPException(status_code=403, detail="Only creators can create quizzes")
    
    new_quiz = Quiz(
        title=quiz_data.title,
        category=quiz_data.category,
        image=quiz_data.image,
        visibility=(quiz_data.visibility == "public"),
        creator_id=current_user.id,
        sharing_link=str(uuid4()) if quiz_data.visibility == "private" else None
    )
    
    session.add(new_quiz)
    session.commit()
    session.refresh(new_quiz)
    
    logger.info(f"Quiz '{new_quiz.title}' created by {current_user.username}")
    return new_quiz

# Add questions to quiz
@router.post("/{quiz_id}/questions", response_model=QuestionRead)
def add_question_to_quiz(
    quiz_id: int,
    question_data: QuestionCreate,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if quiz.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    
    new_question = Question(
        quiz_id=quiz_id,
        text=question_data.text,
        image=question_data.image,
        question_type=question_data.question_type
    )
    
    session.add(new_question)
    session.commit()
    session.refresh(new_question)
    return new_question

# Start a new game session
@router.post("/{quiz_id}/start")
async def start_quiz_session(
    quiz_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = None  # We'll handle auth manually
):
    """Start a new quiz session"""
    # 1. Validate quiz exists and is accessible
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # 2. Check if quiz is private (needs sharing link validation later)
    if not quiz.visibility == 'public' and not current_user:
        raise HTTPException(status_code=403, detail="Login required for private quizzes")
    
    # 3. Load questions with answers
    questions = session.exec(
        select(Question).where(Question.quiz_id == quiz_id)
    ).all()
    
    if not questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")
    
    # 4. Create play session
    play = Play(
        quiz_id=quiz_id,
        user_id=current_user.id if current_user else None,
        session_uuid=uuid4(),
        started_at=datetime.utcnow()
    )
    
    session.add(play)
    session.commit()
    session.refresh(play)
    
    # 5. Return quiz data for frontend (without correct answers!)
    quiz_data = {
        "play_session_id": play.id,
        "session_uuid": str(play.session_uuid),
        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "time_limit": quiz.time_limit,
            "questions": []
        }
    }
    
    # 6. Format questions (hide correct answers)
    for question in questions:
        answers = session.exec(
            select(Answer).where(Answer.question_id == question.id)
        ).all()
        
        quiz_data["quiz"]["questions"].append({
            "id": question.id,
            "text": question.text,
            "image": question.image,
            "question_type": question.question_type,
            "answers": [
                {
                    "id": answer.id,
                    "text": answer.text,
                    "image": answer.image
                    # Don't include is_correct!
                } for answer in answers
            ]
        })
    
    logger.info(f"Quiz session started: {play.session_uuid}")
    return quiz_data

# Submit answer for a question
@router.post("/play/{session_uuid}/submit")
async def submit_quiz_answers(
    session_uuid: UUID,
    answers: List[PlayAnswerCreate],
    session: Session = Depends(get_session)
):
    """Submit all answers and calculate final score"""
    
    # 1. Find play session
    play = session.exec(
        select(Play).where(Play.session_uuid == session_uuid)
    ).first()
    
    if not play:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    if play.finished_at:
        raise HTTPException(status_code=400, detail="Quiz already completed")
    
    # 2. Validate time limit (if exists)
    quiz = session.exec(select(Quiz).where(Quiz.id == play.quiz_id)).first()
    if quiz.time_limit:
        elapsed_time = (datetime.utcnow() - play.started_at).total_seconds()
        if elapsed_time > quiz.time_limit:
            return {"error": "Time limit exceeded", "score": 0, "total": 0}
    
    # 3. Calculate score
    total_questions = 0
    correct_answers = 0
    detailed_results = []
    
    for answer_data in answers:
        # Get question
        question = session.exec(
            select(Question).where(Question.id == answer_data.question_id)
        ).first()
        
        if not question or question.quiz_id != play.quiz_id:
            continue  # Skip invalid questions
            
        total_questions += 1
        is_correct = False
        
        # Check answer based on question type
        if question.question_type in ["single_choice", "multiple_choice", "true_false"]:
            if answer_data.answer_id:
                correct_answer = session.exec(
                    select(Answer).where(
                        Answer.id == answer_data.answer_id,
                        Answer.is_correct == True
                    )
                ).first()
                is_correct = correct_answer is not None
        
        elif question.question_type == "fill_blank":
            if answer_data.text_response:
                # Get correct answer text
                correct_answer = session.exec(
                    select(Answer).where(
                        Answer.question_id == question.id,
                        Answer.is_correct == True
                    )
                ).first()
                
                if correct_answer:
                    # Simple text comparison (case-insensitive)
                    is_correct = (
                        answer_data.text_response.lower().strip() == 
                        correct_answer.text.lower().strip()
                    )
        
        if is_correct:
            correct_answers += 1
        
        # Save individual answer
        play_answer = PlayAnswer(
            play_id=play.id,
            question_id=question.id,
            answer_id=answer_data.answer_id,
            text_response=answer_data.text_response,
            is_correct=is_correct
        )
        session.add(play_answer)
        
        detailed_results.append({
            "question_id": question.id,
            "question_text": question.text,
            "user_answer": answer_data.text_response or answer_data.answer_id,
            "is_correct": is_correct
        })
    
    # 4. Update play session
    final_score = correct_answers
    play.score = final_score
    play.finished_at = datetime.utcnow()
    
    # 5. Update user's global score (if logged in)
    if play.user_id:
        user = session.exec(select(User).where(User.id == play.user_id)).first()
        if user:
            user.global_score += final_score
    
    session.commit()
    
    # 6. Return results
    result = {
        "score": final_score,
        "total_questions": total_questions,
        "percentage": round((final_score / total_questions) * 100, 1) if total_questions > 0 else 0,
        "completed_at": play.finished_at,
        "detailed_results": detailed_results
    }
    
    logger.info(f"Quiz completed: {session_uuid}, Score: {final_score}/{total_questions}")
    return result

@router.get("/play/{session_uuid}/result")
async def get_quiz_result(
    session_uuid: UUID,
    session: Session = Depends(get_session)
):
    """Get quiz results"""
    play = session.exec(
        select(Play).where(Play.session_uuid == session_uuid)
    ).first()
    
    if not play:
        raise HTTPException(status_code=404, detail="Play session not found")
    
    if not play.finished_at:
        raise HTTPException(status_code=400, detail="Quiz not completed yet")
    
    # Get quiz info
    quiz = session.exec(select(Quiz).where(Quiz.id == play.quiz_id)).first()
    total_questions = session.exec(
        select(Question).where(Question.quiz_id == play.quiz_id)
    ).all()
    
    return {
        "quiz_title": quiz.title,
        "score": play.score,
        "total_questions": len(total_questions),
        "percentage": round((play.score / len(total_questions)) * 100, 1) if total_questions else 0,
        "completed_at": play.finished_at,
        "user_id": play.user_id
    }


@router.get("/{quiz_id}/leaderboard")
async def get_quiz_leaderboard(
    quiz_id: int,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Get leaderboard for a specific quiz"""
    
    # Get best scores per user for this quiz
    leaderboard_query = (
        session.query(
            Play.user_id,
            User.username,
            func.max(Play.score).label('best_score'),
            func.count(Play.id).label('attempts'),
            func.max(Play.finished_at).label('last_played')
        )
        .join(User, Play.user_id == User.id)
        .where(Play.quiz_id == quiz_id, Play.finished_at.isnot(None))
        .group_by(Play.user_id, User.username)
        .order_by(desc('best_score'))
        .limit(limit)
    )
    
    results = leaderboard_query.all()
    
    leaderboard = []
    for i, result in enumerate(results, 1):
        leaderboard.append({
            "rank": i,
            "username": result.username,
            "best_score": result.best_score,
            "attempts": result.attempts,
            "last_played": result.last_played
        })
    
    return {
        "quiz_id": quiz_id,
        "leaderboard": leaderboard
    }

@router.post("/{quiz_id}/questions/{question_id}/answers", response_model=AnswerRead)
def add_answer_to_question(
    quiz_id: int,
    question_id: int,
    answer_data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify quiz ownership
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz or (quiz.creator_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Verify question belongs to quiz
    question = session.exec(
        select(Question).where(Question.id == question_id, Question.quiz_id == quiz_id)
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    new_answer = Answer(
        question_id=question_id,
        text=answer_data.text,
        image=answer_data.image,
        is_correct=answer_data.is_correct
    )
    
    session.add(new_answer)
    session.commit()
    session.refresh(new_answer)
    return new_answer