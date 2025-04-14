from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, oauth2_scheme, verify_token
from models import User, UserRead  # Assuming you have a User model
from sqlmodel import Session, select
from db.database import get_session  # Database session dependency
from typing import List


router = APIRouter()


@router.get("/", response_model=List[UserRead])
def get_users(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    users = session.exec(select(User)).all()
    return users


@router.get("/leaderboard", response_model=List[UserRead])
def get_leaderboard(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    users = session.exec(select(User).order_by(User.score.desc())).all()
    return users


@router.get("/{user_id}", response_model=UserRead)
def get_single_user(user_id: int, session: Session = Depends(get_session)):
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")

    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()
    return {"success": True, "message": "User deleted"}


@router.get("/me")
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_session)
):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.exec(select(User).where(User.email == payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user  # Return user data
