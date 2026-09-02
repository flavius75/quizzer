"""CSRF middleware (app/main.py's csrf_protection): every unsafe request on
an authenticated session must echo back the per-session CSRF token in a
header, or it's rejected - independent of the SameSite=Lax cookie
protection already in place.
"""


def test_unsafe_request_without_csrf_header_is_rejected(make_user):
    user = make_user(username="alice", role="creator")
    response = user._raw.post(  # bypass AuthedClient's auto-attached header
        "/quizzes/", json={"title": "No CSRF header", "visibility": "public"}
    )
    assert response.status_code == 403


def test_unsafe_request_with_wrong_csrf_header_is_rejected(make_user):
    user = make_user(username="bob", role="creator")
    response = user._raw.post(
        "/quizzes/",
        json={"title": "Wrong CSRF", "visibility": "public"},
        headers={"x-csrf-token": "not-the-real-token"},
    )
    assert response.status_code == 403


def test_unsafe_request_with_correct_csrf_header_succeeds(make_user):
    user = make_user(username="carol", role="creator")
    response = user.post(
        "/quizzes/", json={"title": "Correct CSRF", "visibility": "public"}
    )
    assert response.status_code == 200


def test_safe_get_request_does_not_require_csrf_header(make_user):
    user = make_user(username="dave")
    response = user._raw.get("/quizzes/")  # no CSRF header at all
    assert response.status_code == 200


def test_login_and_register_are_exempt_from_csrf(client):
    """These happen before a session cookie exists, so there's nothing to
    forge a token for; they must never be blocked by the CSRF check."""
    register = client.post(
        "/auth/register",
        json={"username": "erin", "email": "erin@test.com", "password": "pw123456"},
    )
    assert register.status_code == 200

    login = client.post(
        "/auth/login", data={"username": "erin@test.com", "password": "pw123456"}
    )
    assert login.status_code == 200


def test_unauthenticated_unsafe_request_is_not_blocked_by_csrf_but_by_auth(client):
    """With no session cookie at all, the CSRF middleware has nothing to
    check and lets the request through to the route, which then rejects it
    on its own terms (401/403) - the two layers shouldn't be conflated."""
    response = client.post(
        "/quizzes/", json={"title": "No session", "visibility": "public"}
    )
    assert response.status_code in (401, 403)
