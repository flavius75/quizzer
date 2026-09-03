"""Authorization / IDOR coverage.

Every one of these pins down a real bug that was shipped at some point:
unauthenticated user enumeration on GET /users/{id}, any logged-in user
(not just the owner) able to start or read a private quiz, and role checks
on admin-only routes. See app/core/auth.py (require_role) and
app/routes/users.py / app/routes/quizzes.py for the fixes.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


# ---------------------------------------------------------------------------
# GET /users/{id} - full profile is owner-or-admin only
# ---------------------------------------------------------------------------

def test_user_can_read_own_profile(make_user):
    user = make_user(username="alice")
    response = user.get(f"/users/{user.user_id}")
    assert response.status_code == 200
    assert response.json()["email"] == user.email


def test_user_cannot_read_another_users_profile(make_user):
    """Regression test: this endpoint used to have no auth dependency at
    all, letting anyone enumerate every user's email and role."""
    alice = make_user(username="alice")
    bob = make_user(username="bob")

    response = bob.get(f"/users/{alice.user_id}")
    assert response.status_code == 403


def test_admin_can_read_any_users_profile(make_user):
    alice = make_user(username="alice")
    admin = make_user(username="root", role="admin")

    response = admin.get(f"/users/{alice.user_id}")
    assert response.status_code == 200


def test_anonymous_cannot_read_a_profile(client, make_user):
    alice = make_user(username="alice")
    response = client.get(f"/users/{alice.user_id}")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Admin-only user management routes
# ---------------------------------------------------------------------------

def test_list_users_requires_admin(make_user):
    player = make_user(username="alice")
    response = player.get("/users/")
    assert response.status_code == 403


def test_list_users_allowed_for_admin(make_user):
    admin = make_user(username="root", role="admin")
    response = admin.get("/users/")
    assert response.status_code == 200


def test_update_role_requires_admin(make_user):
    alice = make_user(username="alice")
    bob = make_user(username="bob")

    response = bob.patch(f"/users/{alice.user_id}/role", json={"role": "admin"})
    assert response.status_code == 403


def test_update_role_allowed_for_admin(make_user):
    alice = make_user(username="alice")
    admin = make_user(username="root", role="admin")

    response = admin.patch(f"/users/{alice.user_id}/role", json={"role": "creator"})
    assert response.status_code == 200
    assert response.json()["role"] == "creator"


def test_update_role_rejects_unknown_role(make_user):
    alice = make_user(username="alice")
    admin = make_user(username="root", role="admin")

    response = admin.patch(f"/users/{alice.user_id}/role", json={"role": "superuser"})
    assert response.status_code == 400


def test_delete_user_requires_admin(make_user):
    alice = make_user(username="alice")
    bob = make_user(username="bob")

    response = bob.delete(f"/users/{alice.user_id}")
    assert response.status_code == 403


def test_admin_can_delete_a_user(make_user):
    alice = make_user(username="alice")
    admin = make_user(username="root", role="admin")

    response = admin.delete(f"/users/{alice.user_id}")
    assert response.status_code == 200

    # Actually gone, not just reporting success.
    still_there = admin.get(f"/users/{alice.user_id}")
    assert still_there.status_code == 404


def test_get_or_role_update_or_delete_on_unknown_user_404s(make_user):
    admin = make_user(username="root", role="admin")
    missing_id = 999999

    assert admin.get(f"/users/{missing_id}").status_code == 404
    assert admin.patch(f"/users/{missing_id}/role", json={"role": "creator"}).status_code == 404
    assert admin.delete(f"/users/{missing_id}").status_code == 404


def test_leaderboard_is_public_and_lists_only_username_and_score(client, make_user):
    """No auth required (it's meant to be shown to guests too), and it must
    not leak email/role - only what UserReadPublic promises."""
    make_user(username="alice")
    response = client.get("/users/leaderboard")
    assert response.status_code == 200
    entry = response.json()[0]
    assert set(entry.keys()) == {"id", "username", "global_score"}


# ---------------------------------------------------------------------------
# Quiz creation requires creator/admin role
# ---------------------------------------------------------------------------

def test_player_cannot_create_a_quiz(make_user):
    player = make_user(username="alice")
    response = player.post("/quizzes/", json={"title": "Nope", "visibility": "public"})
    assert response.status_code == 403


@pytest.mark.parametrize("role", ["creator", "admin"])
def test_creator_and_admin_can_create_a_quiz(make_user, role):
    user = make_user(username="alice", role=role)
    response = user.post("/quizzes/", json={"title": "Ok", "visibility": "public"})
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Private quiz access: owner/admin only, not "any logged-in user"
# ---------------------------------------------------------------------------

@pytest.fixture
def private_quiz(make_user):
    """An owner (creator role) with one private quiz containing a single
    answerable question, plus a stranger and an admin for access checks."""
    owner = make_user(username="owner", role="creator")
    stranger = make_user(username="stranger")
    admin = make_user(username="root", role="admin")

    quiz = owner.post(
        "/quizzes/", json={"title": "Secret Quiz", "visibility": "private"}
    ).json()
    question = owner.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "2+2?", "question_type": "single_choice"},
    ).json()
    owner.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
        json={"text": "4", "is_correct": True},
    )
    return {"owner": owner, "stranger": stranger, "admin": admin, "quiz": quiz}


def test_owner_can_start_own_private_quiz(private_quiz):
    response = private_quiz["owner"].post(f"/quizzes/{private_quiz['quiz']['id']}/start")
    assert response.status_code == 200


def test_admin_can_start_any_private_quiz(private_quiz):
    response = private_quiz["admin"].post(f"/quizzes/{private_quiz['quiz']['id']}/start")
    assert response.status_code == 200


def test_stranger_cannot_start_someone_elses_private_quiz(private_quiz):
    """Regression test: any logged-in user (not just the owner) used to be
    able to start a session on someone else's private quiz."""
    response = private_quiz["stranger"].post(f"/quizzes/{private_quiz['quiz']['id']}/start")
    assert response.status_code == 403


def test_anonymous_cannot_start_a_private_quiz(client, private_quiz):
    response = client.post(f"/quizzes/{private_quiz['quiz']['id']}/start")
    assert response.status_code == 403


def test_stranger_cannot_read_private_quiz_answers(private_quiz):
    """Regression test: GET /quizzes/{id} (which includes is_correct) had
    no access control at all - anyone could read any private quiz's
    correct answers by guessing its numeric id."""
    response = private_quiz["stranger"].get(f"/quizzes/{private_quiz['quiz']['id']}")
    assert response.status_code == 403


def test_owner_can_read_own_private_quiz_with_answers(private_quiz):
    response = private_quiz["owner"].get(f"/quizzes/{private_quiz['quiz']['id']}")
    assert response.status_code == 200
    assert response.json()["questions"][0]["answers"][0]["is_correct"] is True


def test_anonymous_cannot_read_a_private_quiz(client, private_quiz):
    response = client.get(f"/quizzes/{private_quiz['quiz']['id']}")
    assert response.status_code == 401


def test_anyone_can_start_a_public_quiz(client, make_user):
    owner = make_user(username="owner", role="creator")
    quiz = owner.post(
        "/quizzes/", json={"title": "Public Quiz", "visibility": "public"}
    ).json()
    question = owner.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "True or false?", "question_type": "true_false"},
    ).json()
    owner.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
        json={"text": "True", "is_correct": True},
    )

    response = client.post(f"/quizzes/{quiz['id']}/start")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Quiz edit/delete: owner or admin only
# ---------------------------------------------------------------------------

def test_stranger_cannot_update_someone_elses_quiz(private_quiz):
    response = private_quiz["stranger"].patch(
        f"/quizzes/{private_quiz['quiz']['id']}", json={"title": "Hijacked"}
    )
    assert response.status_code == 403


def test_owner_can_update_own_quiz(private_quiz):
    response = private_quiz["owner"].patch(
        f"/quizzes/{private_quiz['quiz']['id']}", json={"title": "Renamed"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Renamed"


def test_stranger_cannot_delete_someone_elses_quiz(private_quiz):
    response = private_quiz["stranger"].delete(f"/quizzes/{private_quiz['quiz']['id']}")
    assert response.status_code == 403


def test_owner_can_delete_own_quiz(private_quiz):
    response = private_quiz["owner"].delete(f"/quizzes/{private_quiz['quiz']['id']}")
    assert response.status_code == 200


def test_stranger_cannot_add_questions_to_someone_elses_quiz(private_quiz):
    response = private_quiz["stranger"].post(
        f"/quizzes/{private_quiz['quiz']['id']}/questions",
        json={"text": "Injected?", "question_type": "true_false"},
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Play session ownership: submit/result only for whoever started the play
# (or an admin) - not "anyone who has the session_uuid". A play started
# while logged out has no owner to enforce, same as before.
# ---------------------------------------------------------------------------

@pytest.fixture
def logged_in_play(make_user):
    """A public quiz started by a logged-in player, session_uuid included -
    a stranger who somehow obtains that uuid (logs, browser history,
    Referer) must not be able to act as that player."""
    creator = make_user(username="creator", role="creator")
    player = make_user(username="player")
    stranger = make_user(username="stranger")
    admin = make_user(username="root", role="admin")

    quiz = creator.post(
        "/quizzes/", json={"title": "Public Quiz", "visibility": "public"}
    ).json()
    question = creator.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "2+2?", "question_type": "single_choice"},
    ).json()
    answer = creator.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
        json={"text": "4", "is_correct": True},
    ).json()

    start = player.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]

    return {
        "player": player,
        "stranger": stranger,
        "admin": admin,
        "session_uuid": session_uuid,
        "question_id": question["id"],
        "answer_id": answer["id"],
    }


def test_stranger_cannot_submit_to_someone_elses_play_session(client, logged_in_play):
    """Regression test: submit/result had no owner check at all - the
    session_uuid alone (leakable via logs/history/Referer) was enough to
    submit answers or read results as another logged-in player."""
    response = logged_in_play["stranger"].post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    assert response.status_code == 403


def test_anonymous_cannot_submit_to_someone_elses_play_session(client, logged_in_play):
    response = client.post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    assert response.status_code == 403


def test_owner_can_submit_to_their_own_play_session(logged_in_play):
    response = logged_in_play["player"].post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    assert response.status_code == 200


def test_admin_can_submit_to_anyones_play_session(logged_in_play):
    response = logged_in_play["admin"].post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    assert response.status_code == 200


def test_stranger_cannot_read_someone_elses_play_result(logged_in_play):
    logged_in_play["player"].post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    response = logged_in_play["stranger"].get(
        f"/quizzes/play/{logged_in_play['session_uuid']}/result"
    )
    assert response.status_code == 403


def test_owner_can_read_their_own_play_result(logged_in_play):
    logged_in_play["player"].post(
        f"/quizzes/play/{logged_in_play['session_uuid']}/submit",
        json=[{
            "question_id": logged_in_play["question_id"],
            "answer_id": logged_in_play["answer_id"],
        }],
    )
    response = logged_in_play["player"].get(
        f"/quizzes/play/{logged_in_play['session_uuid']}/result"
    )
    assert response.status_code == 200


def test_anonymous_play_has_no_owner_so_anyone_with_the_uuid_can_act(client, make_user):
    """Unchanged behavior: a guest play has no user_id to protect, so the
    session_uuid remains the only credential - same as before this fix."""
    creator = make_user(username="creator", role="creator")
    quiz = creator.post(
        "/quizzes/", json={"title": "Guest-playable Quiz", "visibility": "public"}
    ).json()
    question = creator.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "2+2?", "question_type": "single_choice"},
    ).json()
    answer = creator.post(
        f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
        json={"text": "4", "is_correct": True},
    ).json()

    start = client.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]

    another_anonymous_client = TestClient(app)
    response = another_anonymous_client.post(
        f"/quizzes/play/{session_uuid}/submit",
        json=[{"question_id": question["id"], "answer_id": answer["id"]}],
    )
    assert response.status_code == 200
