import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.auth import verify_token, COOKIE_NAME, CSRF_HEADER_NAME
from app.core.rate_limit import limiter
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.quizzes import router as quizzes_router
from app.helpers.logger import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    # API docs/schema are only exposed when DEBUG=true (local dev). In
    # production they must not be reachable, publicly or through nginx.
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
# No session cookie exists yet on these, so there's nothing to forge a token
# for; login/register are also already rate-limited and password-gated.
_CSRF_EXEMPT_PATHS = {"/auth/login", "/auth/register"}


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    """Second, independent layer on top of SameSite=Lax cookies (see
    core/auth.py for why both exist): every unsafe request whose session
    cookie carries a CSRF claim must echo it back in a header that a
    cross-site page has no way to read."""
    if request.method not in _CSRF_SAFE_METHODS and request.url.path not in _CSRF_EXEMPT_PATHS:
        session_token = request.cookies.get(COOKIE_NAME)
        if session_token:
            payload = verify_token(session_token)
            expected_csrf = payload.get("csrf") if payload else None
            if expected_csrf and request.headers.get(CSRF_HEADER_NAME) != expected_csrf:
                return JSONResponse(status_code=403, content={"detail": "Missing or invalid CSRF token"})

    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces / internals to the client - log them server-side instead.
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(quizzes_router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
