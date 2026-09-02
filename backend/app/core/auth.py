from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from app.models import User
from app.core.database import get_session
from app.core.config import settings
import logging
import secrets

logger = logging.getLogger(__name__)

COOKIE_NAME = "access_token"
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"

# Requests carrying the access_token cookie use SameSite=Lax, which already
# blocks the classic cross-site <form> CSRF (the cookie isn't sent on a
# cross-site POST). This is a second, independent layer: the CSRF token is
# bound into the JWT itself (not stored server-side) and mirrored into a
# separate, JS-readable cookie; every unsafe request must echo it back in a
# header, which a cross-site page cannot read even if it can trigger the
# request. See main.py's CSRFMiddleware for enforcement.

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Kept so Swagger's "Authorize" button and API clients using a bare Bearer
# token still work; the primary flow for the frontend is the httpOnly cookie.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)
oauth2_scheme_optional = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def _extract_token(request: Request, bearer_token: Optional[str]) -> Optional[str]:
    """Cookie first (browser/frontend flow), Bearer header as a fallback (docs, API clients)."""
    return request.cookies.get(COOKIE_NAME) or bearer_token


def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_session),
) -> User:
    token = _extract_token(request, bearer_token)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.exec(select(User).where(User.email == payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def get_current_user_optional_bearer(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_session),
) -> Optional[User]:
    """Same as get_current_user but returns None instead of raising (guest access)."""
    token = _extract_token(request, bearer_token)
    if not token:
        return None

    payload = verify_token(token)
    if not payload:
        return None

    return db.exec(select(User).where(User.email == payload.get("sub"))).first()


def require_role(*roles: str):
    """Dependency factory: raise 403 unless the current user's role is in `roles`."""

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user

    return _dependency
