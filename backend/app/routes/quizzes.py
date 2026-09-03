from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, get_current_user_optional_bearer, require_role
from app.core.database import get_session
from app.models import Quiz, Question, User, Answer, Play, PlayAnswer
from app.schemas import (
    AnswerCreate, QuizCreate, QuizUpdate, QuizRead, QuizReadWithQuestions,
    QuestionCreate, PlayAnswerCreate, QuestionRead, AnswerRead,
)
from sqlmodel import Session, select
from typing import Dict, List, Optional
from uuid import uuid4, UUID
import logging
from datetime import datetime
from sqlalchemy import func, or_

logger = logging.getLogger(__name__)
router = APIRouter()


def _ensure_play_ownership(play: Play, current_user: Optional[User]) -> None:
    """A play started while logged out (play.user_id is None) has no owner
    to check - the session_uuid is the only credential, same as before.
    A play started while logged in is only accessible to that same user (or
    an admin): otherwise, a leaked session_uuid (logs, browser history,
    Referer header) would let anyone submit answers or read results as if
    they were that player."""
    if play.user_id is None:
        return
    if not current_user or (current_user.id != play.user_id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="You do not have access to this play session")


# Get all public quizzes
@router.get("/", response_model=List[QuizRead])
def get_quizzes(
    skip: int = 0,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional_bearer),
):
    """
    Get quizzes based on user permissions:
    - No user (guest): Only public quizzes
    - Admin: All quizzes
    - Creator: Public quizzes + their own private quizzes
    - Player: Only public quizzes
    """
    query = select(Quiz)

    if not current_user:
        query = query.where(Quiz.visibility == "public")
        logger.info("Guest user requesting quizzes - returning public only")

    elif current_user.role == "admin":
        logger.info(f"Admin {current_user.username} requesting all quizzes")

    elif current_user.role == "creator":
        query = query.where(
            or_(
                Quiz.visibility == "public",
                Quiz.creator_id == current_user.id,
            )
        )
        logger.info(f"Creator {current_user.username} requesting public + own private quizzes")

    else:
        query = query.where(Quiz.visibility == "public")
        logger.info(f"Player {current_user.username} requesting public quizzes only")

    quizzes = session.exec(query.offset(skip).limit(limit)).all()
    return quizzes


# Get quiz by ID with full questions/answers, including which answer is
# correct. Owner/admin only (used by the quiz editor) - unlike
# /{quiz_id}/start, this deliberately does NOT strip is_correct, so it must
# never be reachable by a player about to take the quiz, and must never leak
# a private quiz's content to a non-owner.
@router.get("/{quiz_id}", response_model=QuizReadWithQuestions)
def get_quiz_with_questions(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if current_user.role != "admin" and quiz.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    return quiz


# Get quiz by UUID (for sharing links)
@router.get("/play/{quiz_uuid}")
def get_quiz_by_uuid(quiz_uuid: str, session: Session = Depends(get_session)):
    quiz = session.exec(select(Quiz).where(Quiz.uuid == quiz_uuid)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


# Create new quiz (creators/admins only)
@router.post("/", response_model=QuizRead)
def create_quiz(
    quiz_data: QuizCreate,
    current_user: User = Depends(require_role("creator", "admin")),
    session: Session = Depends(get_session),
):
    new_quiz = Quiz(
        title=quiz_data.title,
        category=quiz_data.category,
        image=quiz_data.image,
        visibility=quiz_data.visibility,
        time_limit=quiz_data.time_limit,
        creator_id=current_user.id,
        sharing_link=str(uuid4()) if quiz_data.visibility == "private" else None,
    )

    session.add(new_quiz)
    session.commit()
    session.refresh(new_quiz)

    logger.info(f"Quiz '{new_quiz.title}' created by {current_user.username}")
    return new_quiz


# Update quiz metadata (owner or admin)
@router.patch("/{quiz_id}", response_model=QuizRead)
def update_quiz(
    quiz_id: int,
    quiz_data: QuizUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    update_data = quiz_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quiz, field, value)

    if "visibility" in update_data:
        if quiz.visibility == "private" and not quiz.sharing_link:
            quiz.sharing_link = str(uuid4())
        elif quiz.visibility == "public":
            quiz.sharing_link = None

    quiz.updated_at = datetime.utcnow()
    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return quiz


# Delete a quiz (owner or admin)
@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.creator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    # No ON DELETE CASCADE on these foreign keys, so children are removed
    # explicitly, deepest first, to avoid an FK violation on `quiz` delete.
    question_ids = [
        q.id for q in session.exec(select(Question).where(Question.quiz_id == quiz_id)).all()
    ]
    play_ids = [
        p.id for p in session.exec(select(Play).where(Play.quiz_id == quiz_id)).all()
    ]
    for play_id in play_ids:
        for play_answer in session.exec(
            select(PlayAnswer).where(PlayAnswer.play_id == play_id)
        ).all():
            session.delete(play_answer)
    for play in session.exec(select(Play).where(Play.quiz_id == quiz_id)).all():
        session.delete(play)
    for question_id in question_ids:
        for answer in session.exec(
            select(Answer).where(Answer.question_id == question_id)
        ).all():
            session.delete(answer)
    for question in session.exec(select(Question).where(Question.quiz_id == quiz_id)).all():
        session.delete(question)

    session.delete(quiz)
    session.commit()
    return {"success": True, "message": "Quiz deleted"}


# Add questions to quiz
@router.post("/{quiz_id}/questions", response_model=QuestionRead)
def add_question_to_quiz(
    quiz_id: int,
    question_data: QuestionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
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
        question_type=question_data.question_type,
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
    current_user: Optional[User] = Depends(get_current_user_optional_bearer),
):
    """Start a new quiz session"""
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.visibility != "public":
        if not current_user:
            raise HTTPException(status_code=403, detail="Login required for private quizzes")
        if current_user.role != "admin" and quiz.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have access to this quiz")

    questions = session.exec(
        select(Question).where(Question.quiz_id == quiz_id)
    ).all()

    if not questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")

    play = Play(
        quiz_id=quiz_id,
        user_id=current_user.id if current_user else None,
        session_uuid=uuid4(),
        started_at=datetime.utcnow(),
    )

    session.add(play)
    session.commit()
    session.refresh(play)

    quiz_data = {
        "play_session_id": play.id,
        "session_uuid": str(play.session_uuid),
        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "time_limit": quiz.time_limit,
            "questions": [],
        },
    }

    # One query for every answer across all questions instead of one query
    # per question (N+1) - then group them in memory.
    question_ids = [q.id for q in questions]
    all_answers = session.exec(
        select(Answer).where(Answer.question_id.in_(question_ids))
    ).all()
    answers_by_question: Dict[int, List[Answer]] = {}
    for answer in all_answers:
        answers_by_question.setdefault(answer.question_id, []).append(answer)

    for question in questions:
        quiz_data["quiz"]["questions"].append({
            "id": question.id,
            "text": question.text,
            "image": question.image,
            "question_type": question.question_type,
            "answers": [
                {
                    "id": answer.id,
                    "text": answer.text,
                    "image": answer.image,
                    # Don't include is_correct!
                } for answer in answers_by_question.get(question.id, [])
            ],
        })

    logger.info(f"Quiz session started: {play.session_uuid}")
    return quiz_data


# Submit answer for a question
@router.post("/play/{session_uuid}/submit")
async def submit_quiz_answers(
    session_uuid: UUID,
    answers: List[PlayAnswerCreate],
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional_bearer),
):
    """Submit all answers and calculate final score"""

    play = session.exec(
        select(Play).where(Play.session_uuid == session_uuid)
    ).first()

    if not play:
        raise HTTPException(status_code=404, detail="Play session not found")

    _ensure_play_ownership(play, current_user)

    if play.finished_at:
        raise HTTPException(status_code=400, detail="Quiz already completed")

    quiz = session.exec(select(Quiz).where(Quiz.id == play.quiz_id)).first()

    quiz_questions = session.exec(
        select(Question).where(Question.quiz_id == play.quiz_id)
    ).all()
    valid_question_ids = {q.id for q in quiz_questions}
    questions_by_id = {q.id: q for q in quiz_questions}

    # One query for every answer of every question in this quiz, instead of
    # 1-2 queries per submitted answer (N+1) - grouped in memory below.
    all_answers = session.exec(
        select(Answer).where(Answer.question_id.in_(valid_question_ids))
    ).all()
    answers_by_question: Dict[int, List[Answer]] = {}
    for answer in all_answers:
        answers_by_question.setdefault(answer.question_id, []).append(answer)
    answers_by_id = {a.id: a for a in all_answers}

    # A submission past the time limit still closes out the play session
    # (so it doesn't stay orphaned with finished_at=None forever) but scores 0.
    if quiz.time_limit:
        elapsed_time = (datetime.utcnow() - play.started_at).total_seconds()
        if elapsed_time > quiz.time_limit:
            play.score = 0
            play.finished_at = datetime.utcnow()
            session.add(play)
            session.commit()
            return {"error": "Time limit exceeded", "score": 0, "total": len(valid_question_ids)}

    total_questions = 0
    correct_answers = 0
    detailed_results = []
    answered_question_ids = set()

    for answer_data in answers:
        question = questions_by_id.get(answer_data.question_id)

        if not question:
            continue  # Skip invalid questions

        if question.id in answered_question_ids:
            continue  # Ignore duplicate submissions for the same question

        answered_question_ids.add(question.id)
        total_questions += 1
        is_correct = False
        question_answers = answers_by_question.get(question.id, [])

        if question.question_type in ["single_choice", "true_false"]:
            if answer_data.answer_id:
                submitted = answers_by_id.get(answer_data.answer_id)
                is_correct = (
                    submitted is not None
                    and submitted.question_id == question.id
                    and submitted.is_correct
                )

        elif question.question_type == "multiple_choice":
            submitted_ids = set(answer_data.answer_ids or ([answer_data.answer_id] if answer_data.answer_id else []))
            correct_ids = {a.id for a in question_answers if a.is_correct}
            is_correct = bool(submitted_ids) and submitted_ids == correct_ids

        elif question.question_type == "fill_blank":
            if answer_data.text_response:
                correct_answer = next((a for a in question_answers if a.is_correct), None)

                if correct_answer and correct_answer.text:
                    is_correct = (
                        answer_data.text_response.lower().strip()
                        == correct_answer.text.lower().strip()
                    )

        if is_correct:
            correct_answers += 1

        # PlayAnswer only has one `answer_id` column: for multiple_choice, record
        # one row per checked answer (all sharing the same is_correct verdict for
        # the question, since correctness is evaluated as the whole set matching).
        selected_answer_ids = (
            (answer_data.answer_ids or [])
            if question.question_type == "multiple_choice"
            else ([answer_data.answer_id] if answer_data.answer_id else [None])
        )
        for selected_answer_id in selected_answer_ids or [None]:
            session.add(PlayAnswer(
                play_id=play.id,
                question_id=question.id,
                answer_id=selected_answer_id,
                text_response=answer_data.text_response,
                is_correct=is_correct,
            ))

        detailed_results.append({
            "question_id": question.id,
            "question_text": question.text,
            "user_answer": answer_data.text_response or answer_data.answer_ids or answer_data.answer_id,
            "is_correct": is_correct,
        })

    final_score = correct_answers
    play.score = final_score
    play.finished_at = datetime.utcnow()

    if play.user_id:
        user = session.exec(select(User).where(User.id == play.user_id)).first()
        if user:
            user.global_score += final_score
            session.add(user)

    session.add(play)
    session.commit()

    result = {
        "score": final_score,
        "total_questions": total_questions,
        "percentage": round((final_score / total_questions) * 100, 1) if total_questions > 0 else 0,
        "completed_at": play.finished_at,
        "detailed_results": detailed_results,
    }

    logger.info(f"Quiz completed: {session_uuid}, Score: {final_score}/{total_questions}")
    return result


@router.get("/play/{session_uuid}/result")
async def get_quiz_result(
    session_uuid: UUID,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional_bearer),
):
    """Get quiz results"""
    play = session.exec(
        select(Play).where(Play.session_uuid == session_uuid)
    ).first()

    if not play:
        raise HTTPException(status_code=404, detail="Play session not found")

    _ensure_play_ownership(play, current_user)

    if not play.finished_at:
        raise HTTPException(status_code=400, detail="Quiz not completed yet")

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
        "user_id": play.user_id,
    }


@router.get("/{quiz_id}/leaderboard")
async def get_quiz_leaderboard(
    quiz_id: int,
    limit: int = 10,
    session: Session = Depends(get_session),
):
    """Get leaderboard for a specific quiz"""

    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    statement = (
        select(
            Play.user_id,
            User.username,
            func.max(Play.score).label("best_score"),
            func.count(Play.id).label("attempts"),
            func.max(Play.finished_at).label("last_played"),
        )
        .join(User, Play.user_id == User.id)
        .where(Play.quiz_id == quiz_id, Play.finished_at.isnot(None))
        .group_by(Play.user_id, User.username)
        .order_by(func.max(Play.score).desc())
        .limit(limit)
    )

    results = session.exec(statement).all()

    leaderboard = [
        {
            "rank": i,
            "username": result.username,
            "best_score": result.best_score,
            "attempts": result.attempts,
            "last_played": result.last_played,
        }
        for i, result in enumerate(results, 1)
    ]

    return {
        "quiz_id": quiz_id,
        "leaderboard": leaderboard,
    }


@router.post("/{quiz_id}/questions/{question_id}/answers", response_model=AnswerRead)
def add_answer_to_question(
    quiz_id: int,
    question_id: int,
    answer_data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    quiz = session.exec(select(Quiz).where(Quiz.id == quiz_id)).first()
    if not quiz or (quiz.creator_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Permission denied")

    question = session.exec(
        select(Question).where(Question.id == question_id, Question.quiz_id == quiz_id)
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    new_answer = Answer(
        question_id=question_id,
        text=answer_data.text,
        image=answer_data.image,
        is_correct=answer_data.is_correct,
    )

    session.add(new_answer)
    session.commit()
    session.refresh(new_answer)
    return new_answer
