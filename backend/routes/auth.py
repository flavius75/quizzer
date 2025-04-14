from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from auth import create_access_token, verify_password, hash_password
from models import User  # Assuming you have a User model
from sqlmodel import Session, select
from db.database import get_session  # Database session dependency
import logging
logger = logging.getLogger(__name__)


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# Register new user
@router.post("/register")
def register(user_data: User, db: Session = Depends(get_session)):
    user_exists = db.exec(select(User).where(User.email == user_data.email)).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data.password = hash_password(user_data.password)  # Hash password
    db.add(user_data)
    db.commit()
    db.refresh(user_data)
    logger.info(f"User {user_data.username} registered successfully")
    return {"message": "User registered successfully"}


# Login and get JWT token
@router.post("/login")
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session),
):
    user = db.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=timedelta(minutes=30)
    )
    response.set_cookie(key="token", value=access_token)
    logger.info(f"User {user.username} logged successfully")

    return {
        "access_token": access_token,
        "user_role": user.role,
        "username": user.username,
        "score": user.score,
    }
