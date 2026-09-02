from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.auth import create_access_token, verify_password, hash_password, COOKIE_NAME
from app.core.config import settings
from app.models import User
from app.schemas import UserCreate
from sqlmodel import Session, select
from app.core.database import get_session
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_session)):
    user_exists = db.exec(select(User).where(User.email == user_data.email)).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    # `role` is never taken from the client: every new account starts as
    # "player". Promoting to creator/admin is a separate admin-only action
    # (PATCH /users/{user_id}/role).
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="player",
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"User {new_user.username} registered successfully")
    return {"message": "User registered successfully"}


@router.post("/login")
@limiter.limit("10/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session),
):
    user = db.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.email})
    _set_auth_cookie(response, access_token)
    logger.info(f"User {user.username} logged successfully")

    return {
        "user_role": user.role,
        "username": user.username,
        "score": user.global_score,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"message": "Logged out"}
