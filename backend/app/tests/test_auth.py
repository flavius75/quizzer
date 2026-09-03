"""Registration, login, logout, and session cookie behavior.

This module exists because a role-escalation bug at registration and a
never-expiring, non-invalidating session were both shipped and only caught
by manual/agent review - see the fixes in app/routes/auth.py and
app/core/auth.py. These tests pin that behavior down.
"""
import jwt

from app.core.config import settings


def test_register_ignores_client_supplied_role(client):
    """A client claiming `"role": "admin"` at registration must still end
    up as a plain "player" - this was a real, shipped privilege-escalation
    bug (any signup could self-promote to admin)."""
    response = client.post(
        "/auth/register",
        json={
            "username": "attacker",
            "email": "attacker@test.com",
            "password": "pw123456",
            "role": "admin",
        },
    )
    assert response.status_code == 200

    login = client.post(
        "/auth/login", data={"username": "attacker@test.com", "password": "pw123456"}
    )
    assert login.status_code == 200
    assert login.json()["user_role"] == "player"


def test_register_duplicate_email_rejected(client):
    client.post(
        "/auth/register",
        json={"username": "alice", "email": "dup@test.com", "password": "pw123456"},
    )
    response = client.post(
        "/auth/register",
        json={"username": "alice2", "email": "dup@test.com", "password": "pw123456"},
    )
    assert response.status_code == 400


def test_login_wrong_password_rejected(client):
    client.post(
        "/auth/register",
        json={"username": "bob", "email": "bob@test.com", "password": "correct-password"},
    )
    response = client.post(
        "/auth/login", data={"username": "bob@test.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_login_unknown_email_rejected(client):
    response = client.post(
        "/auth/login", data={"username": "nobody@test.com", "password": "whatever"}
    )
    assert response.status_code == 401


def test_login_sets_httponly_session_cookie_and_readable_csrf_cookie(client):
    client.post(
        "/auth/register",
        json={"username": "carol", "email": "carol@test.com", "password": "pw123456"},
    )
    response = client.post(
        "/auth/login", data={"username": "carol@test.com", "password": "pw123456"}
    )
    set_cookie_headers = response.headers.get_list("set-cookie")
    access_token_header = next(h for h in set_cookie_headers if h.startswith("access_token="))
    csrf_header = next(h for h in set_cookie_headers if h.startswith("csrf_token="))

    assert "httponly" in access_token_header.lower()
    assert "httponly" not in csrf_header.lower(), (
        "csrf_token must be JS-readable, or the frontend can't echo it back in a header"
    )


def test_login_response_body_never_contains_the_token(client):
    """The token must live only in the cookie - putting it in the JSON body
    too would defeat the point of using an httpOnly cookie in the first
    place (anything with page-script access could read it)."""
    client.post(
        "/auth/register",
        json={"username": "dave", "email": "dave@test.com", "password": "pw123456"},
    )
    response = client.post(
        "/auth/login", data={"username": "dave@test.com", "password": "pw123456"}
    )
    body = response.json()
    assert "access_token" not in body
    assert set(body.keys()) == {"user_role", "username", "score"}


def test_access_token_has_an_expiration_claim(client):
    """Regression test: expiration was once commented out, so a stolen
    token would stay valid forever."""
    client.post(
        "/auth/register",
        json={"username": "erin", "email": "erin@test.com", "password": "pw123456"},
    )
    response = client.post(
        "/auth/login", data={"username": "erin@test.com", "password": "pw123456"}
    )
    token = response.cookies["access_token"]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "exp" in payload


def test_me_requires_authentication(client):
    response = client.get("/users/me")
    assert response.status_code == 401


def test_me_returns_current_user(make_user):
    user = make_user(username="frank")
    response = user.get("/users/me")
    assert response.status_code == 200
    assert response.json()["username"] == "frank"


def test_logout_invalidates_the_session_server_side(make_user):
    """Clearing local/client state isn't enough - the cookie itself must
    stop working. This was a real bug: the admin panel's logout only
    cleared local state and left the server-side session valid."""
    user = make_user(username="grace")
    assert user.get("/users/me").status_code == 200

    logout = user.post("/auth/logout")
    assert logout.status_code == 200

    # Still sending the (now-revoked) cookie the client held onto.
    still_authenticated = user.get("/users/me")
    assert still_authenticated.status_code == 401
