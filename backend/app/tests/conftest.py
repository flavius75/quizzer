"""Shared test fixtures.

Env vars are set here, before anything imports app.core.config, because
Settings validates them at import time (fail-fast) - see that module's
docstring. DATABASE_URL points at an in-memory SQLite DB shared across
connections via StaticPool, so it behaves like a single persistent DB for
the lifetime of the test process without ever touching Postgres.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
# DEBUG=true keeps cookies non-Secure so TestClient's plain-http requests
# still carry them, and exercises the same code path local dev runs under.
os.environ.setdefault("DEBUG", "true")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.core import database as db_module

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
db_module.engine = engine

from app.main import app  # noqa: E402  (must follow the engine patch above)
from app.core.database import get_session  # noqa: E402
from app.models import User  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402


def _get_session_override():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = _get_session_override


@pytest.fixture(autouse=True)
def _fresh_database():
    """A clean schema for every test, and a reset rate-limit counter so one
    test's logins/registrations can't exhaust another's quota."""
    SQLModel.metadata.create_all(engine)
    limiter.reset()
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client():
    # A fresh TestClient per test = a fresh (empty) cookie jar per test.
    return TestClient(app)


@pytest.fixture
def db_engine():
    """Exposes the shared test engine to tests that need to reach into the
    DB directly (seeding state the API can't set, like Play.started_at, or
    asserting on state the API doesn't expose). Go through this fixture
    rather than `from app.tests.conftest import engine`: pytest imports
    conftest.py through its own plugin machinery, and a plain `import
    app.tests.conftest` from a test module re-triggers this whole file as a
    second, distinct module - a second engine, a second (losing) dependency
    override - which is a fun way to chase a phantom "no such table" error."""
    return engine


_UNSAFE_METHODS = {"post", "put", "patch", "delete"}


class AuthedClient:
    """A TestClient bound to one logged-in identity, with its own private
    cookie jar (each `make_user()` call gets a fresh underlying TestClient),
    so a test can hold several independent identities - e.g. an owner and a
    stranger - without them clobbering each other's session.

    Deliberately does NOT resend a fixed cookie snapshot on every call: it
    lets the underlying client's own jar evolve (e.g. drop the session
    cookie after /auth/logout, exactly like a real browser would), and only
    adds the one thing a browser can't do on its own - the CSRF header for
    unsafe requests."""

    def __init__(self, raw_client: TestClient, csrf_token, user_id, email, username):
        self._raw = raw_client
        self.csrf_token = csrf_token
        self.user_id = user_id
        self.email = email
        self.username = username

    def request(self, method: str, url: str, **kwargs):
        if method.lower() in _UNSAFE_METHODS and self.csrf_token:
            headers = dict(kwargs.get("headers") or {})
            headers.setdefault("x-csrf-token", self.csrf_token)
            kwargs["headers"] = headers
        return self._raw.request(method, url, **kwargs)

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def patch(self, url, **kwargs):
        return self.request("PATCH", url, **kwargs)

    def delete(self, url, **kwargs):
        return self.request("DELETE", url, **kwargs)


@pytest.fixture
def make_user():
    """Register + log in a user, optionally promoted to a given role.

    Each call gets its own TestClient (own cookie jar), so a test can hold
    several independent identities at once - e.g. an owner and a stranger -
    without them clobbering each other's session cookies.
    """

    def _make(username="user", email=None, password="pw123456", role="player"):
        email = email or f"{username}@test.com"
        raw_client = TestClient(app)

        register_response = raw_client.post(
            "/auth/register",
            json={"username": username, "email": email, "password": password},
        )
        assert register_response.status_code == 200, register_response.text

        if role != "player":
            with Session(engine) as db:
                user = db.exec(select(User).where(User.email == email)).first()
                user.role = role
                db.add(user)
                db.commit()

        login_response = raw_client.post(
            "/auth/login", data={"username": email, "password": password}
        )
        assert login_response.status_code == 200, login_response.text

        with Session(engine) as db:
            user = db.exec(select(User).where(User.email == email)).first()
            user_id = user.id

        return AuthedClient(
            raw_client=raw_client,
            csrf_token=login_response.cookies.get("csrf_token"),
            user_id=user_id,
            email=email,
            username=username,
        )

    return _make
