"""Rate limiting on endpoints reachable without an account: guessing a
fill_blank answer or farming play sessions doesn't require logging in, so
/auth/login and /auth/register being the only limited routes left every
other unauthenticated write endpoint open to bruteforcing/spam. See
app/core/rate_limit.py (the shared Limiter) and its @limiter.limit(...)
usages in app/routes/quizzes.py.

slowapi keys by client IP, and TestClient reports every request as coming
from the same synthetic host - so within one test, hammering the same
route N+1 times is a faithful stand-in for "one attacker, N+1 requests"
regardless of which logged-in identity (if any) makes each call.
"""


def _make_public_quiz_with_question(owner):
    quiz = owner.post(
        "/quizzes/", json={"title": "Rate Limit Quiz", "visibility": "public"}
    ).json()
    question = owner.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "2+2?", "question_type": "fill_blank"},
    ).json()
    owner.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
        json={"text": "4", "is_correct": True},
    )
    return quiz, question


def test_submit_endpoint_is_rate_limited(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question = _make_public_quiz_with_question(owner)

    start = owner.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]
    submission = [{"question_id": question["id"], "text_response": "guess"}]

    # The limit is 20/minute; the first call actually completes the
    # session, the rest 400 ("already completed") - but every one of them
    # still counts against the limiter, which is what's under test here.
    statuses = [
        owner.post(f"/quizzes/play/{session_uuid}/submit", json=submission).status_code
        for _ in range(20)
    ]
    assert 429 not in statuses

    blocked = owner.post(f"/quizzes/play/{session_uuid}/submit", json=submission)
    assert blocked.status_code == 429


def test_start_endpoint_is_rate_limited(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, _question = _make_public_quiz_with_question(owner)

    statuses = [
        owner.post(f"/quizzes/{quiz['id']}/start").status_code for _ in range(30)
    ]
    assert 429 not in statuses

    blocked = owner.post(f"/quizzes/{quiz['id']}/start")
    assert blocked.status_code == 429


def test_rate_limit_is_scoped_per_route_not_global(make_user):
    """Exhausting /start's limit must not affect an unrelated route like
    quiz creation - each @limiter.limit(...) tracks its own endpoint."""
    owner = make_user(username="owner", role="creator")
    quiz, _question = _make_public_quiz_with_question(owner)

    for _ in range(31):
        owner.post(f"/quizzes/{quiz['id']}/start")

    still_works = owner.post(
        "/quizzes/", json={"title": "Unrelated quiz", "visibility": "public"}
    )
    assert still_works.status_code == 200
