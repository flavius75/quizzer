from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from datetime import timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from app.models import User
from app.db.database import get_session
import os
from dotenv import load_dotenv
from fastapi.security import HTTPBearer
import logging

logger = logging.getLogger(__name__)


load_dotenv()


# Secret key for signing tokens (keep it safe!)
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES")

# Password hashing utility
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Hash password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# Verify password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# Create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # Disable token expiration during developpement stage
    # expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    # to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Verify JWT token
def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # Returns decoded token data
    except JWTError:
        return None  # Invalid token


# Dependency to get current user
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_session)
) -> User:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.exec(select(User).where(User.email == payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# Create optional auth scheme  
oauth2_scheme_optional = HTTPBearer(auto_error=False)

def get_current_user_optional_bearer(
    credentials = Depends(oauth2_scheme_optional), 
    db: Session = Depends(get_session)
) -> Optional[User]:
    """Get current user from Bearer token or None if not authenticated"""
    try:
        if not credentials:
            return None
            
        token = credentials.credentials
        payload = verify_token(token)
        if not payload:
            return None

        user = db.exec(select(User).where(User.email == payload["sub"])).first()
        return user
    except Exception as e:
        # Log the error but don't raise it (optional auth)
        logger.debug(f"Optional auth failed: {e}")
        return None