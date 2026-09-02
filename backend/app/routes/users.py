from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, require_role
from app.models import User
from app.schemas import UserRead, UserReadPublic, UserRoleUpdate
from sqlmodel import Session, select
from app.core.database import get_session
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[UserRead])
def get_users(
    user: User = Depends(require_role("admin")), session: Session = Depends(get_session)
):
    users = session.exec(select(User)).all()
    return users


@router.get("/leaderboard", response_model=List[UserReadPublic])
def get_leaderboard(session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.global_score.desc())).all()
    return users


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserRead)
def get_single_user(user_id: int, session: Session = Depends(get_session)):
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    """Promote/demote a user. Admin-only: the client can never set its own
    role at registration (see routes/auth.py) - this is the only way in."""
    if role_data.role not in ("player", "creator", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role_data.role
    session.add(user)
    session.commit()
    session.refresh(user)
    logger.info(f"User {user.username} role changed to {user.role} by {current_user.username}")
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()
    return {"success": True, "message": "User deleted"}
