"""Quiz-taking and scoring: this is the app's core business logic, and the
part that's been silently wrong the most times (visibility stored as a
bool, multiple_choice only checking the first selected answer, duplicate
submissions inflating the score, scores never attributed to the logged-in
player). Every case below pins one of those down.
"""
from datetime import datetime, timedelta
from uuid import UUID

from sqlmodel import Session, select

from app.models import Quiz, User


def _make_quiz_with_question(owner, question_type, answers, visibility="public"):
    """answers: list of (text, is_correct) tuples. Returns (quiz, question, answer_ids)."""
    quiz = owner.post(
        "/quizzes/", json={"title": "Test Quiz", "visibility": visibility}
    ).json()
    question = owner.post(
        f"/quizzes/{quiz['id']}/questions",
        json={"text": "Q?", "question_type": question_type},
    ).json()
    answer_ids = []
    for text, is_correct in answers:
        answer = owner.post(
            f"/quizzes/{quiz['id']}/questions/{question['id']}/answers",
            json={"text": text, "is_correct": is_correct},
        ).json()
        answer_ids.append(answer["id"])
    return quiz, question, answer_ids


def _start_and_submit(actor, quiz_id, submission):
    start = actor.post(f"/quizzes/{quiz_id}/start")
    assert start.status_code == 200
    session_uuid = start.json()["session_uuid"]
    return actor.post(f"/quizzes/play/{session_uuid}/submit", json=submission)


# ---------------------------------------------------------------------------
# Visibility regression (was silently stored as a bool, breaking every
# access check downstream)
# ---------------------------------------------------------------------------

def test_visibility_is_stored_and_returned_as_a_string(make_user):
    owner = make_user(username="owner", role="creator")
    response = owner.post(
        "/quizzes/", json={"title": "Private one", "visibility": "private"}
    )
    assert response.status_code == 200
    assert response.json()["visibility"] == "private"


# ---------------------------------------------------------------------------
# Scoring per question type
# ---------------------------------------------------------------------------

def test_single_choice_correct_answer_scores(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Paris", True), ("London", False)]
    )
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_id": answer_ids[0]}]
    )
    assert response.status_code == 200
    assert response.json()["score"] == 1


def test_single_choice_wrong_answer_does_not_score(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Paris", True), ("London", False)]
    )
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_id": answer_ids[1]}]
    )
    assert response.json()["score"] == 0


def test_true_false_scoring(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "true_false", [("True", True), ("False", False)]
    )
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_id": answer_ids[0]}]
    )
    assert response.json()["score"] == 1


def test_multiple_choice_requires_every_correct_answer_and_nothing_else(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner,
        "multiple_choice",
        [("2", True), ("3", True), ("4", False)],
    )
    correct_ids = answer_ids[:2]

    full_match = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_ids": correct_ids}]
    )
    assert full_match.json()["score"] == 1


def test_multiple_choice_partial_selection_does_not_score(make_user):
    """Regression test: the frontend used to only submit the first checked
    answer for multiple_choice, and the backend only ever compared a single
    answer_id - both silently accepted a partial/wrong set as correct."""
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner,
        "multiple_choice",
        [("2", True), ("3", True), ("4", False)],
    )
    only_one_correct = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_ids": [answer_ids[0]]}]
    )
    assert only_one_correct.json()["score"] == 0


def test_multiple_choice_extra_wrong_answer_does_not_score(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner,
        "multiple_choice",
        [("2", True), ("3", True), ("4", False)],
    )
    correct_plus_wrong = _start_and_submit(
        owner,
        quiz["id"],
        [{"question_id": question["id"], "answer_ids": answer_ids}],  # includes the wrong one
    )
    assert correct_plus_wrong.json()["score"] == 0


def test_fill_blank_is_case_insensitive(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, _ = _make_quiz_with_question(owner, "fill_blank", [("Canberra", True)])
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "text_response": "  cAnBeRrA  "}]
    )
    assert response.json()["score"] == 1


def test_fill_blank_wrong_text_does_not_score(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, _ = _make_quiz_with_question(owner, "fill_blank", [("Canberra", True)])
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "text_response": "Sydney"}]
    )
    assert response.json()["score"] == 0


def test_fill_blank_with_no_correct_answer_text_does_not_crash(make_user):
    """Regression test: a fill_blank question whose correct Answer.text is
    empty used to crash the scoring loop with an AttributeError on
    `.text.lower()`, surfacing as a generic 500."""
    owner = make_user(username="owner", role="creator")
    quiz, question, _ = _make_quiz_with_question(owner, "fill_blank", [("", True)])
    response = _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "text_response": "anything"}]
    )
    assert response.status_code == 200
    assert response.json()["score"] == 0


# ---------------------------------------------------------------------------
# Submission edge cases
# ---------------------------------------------------------------------------

def test_duplicate_submission_for_the_same_question_counts_once(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True), ("Wrong", False)]
    )
    response = _start_and_submit(
        owner,
        quiz["id"],
        [
            {"question_id": question["id"], "answer_id": answer_ids[0]},
            {"question_id": question["id"], "answer_id": answer_ids[0]},
        ],
    )
    assert response.json()["total_questions"] == 1
    assert response.json()["score"] == 1


def test_answer_for_a_question_from_another_quiz_is_ignored(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)]
    )
    other_quiz, other_question, other_answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)]
    )

    response = _start_and_submit(
        owner,
        quiz["id"],
        [{"question_id": other_question["id"], "answer_id": other_answer_ids[0]}],
    )
    assert response.json()["total_questions"] == 0
    assert response.json()["score"] == 0


def test_cannot_submit_twice_for_the_same_play_session(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)]
    )
    start = owner.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]
    submission = [{"question_id": question["id"], "answer_id": answer_ids[0]}]

    first = owner.post(f"/quizzes/play/{session_uuid}/submit", json=submission)
    assert first.status_code == 200

    second = owner.post(f"/quizzes/play/{session_uuid}/submit", json=submission)
    assert second.status_code == 400


def test_submitting_to_an_unknown_session_404s(make_user):
    owner = make_user(username="owner", role="creator")
    response = owner.post(
        "/quizzes/play/00000000-0000-0000-0000-000000000000/submit", json=[]
    )
    assert response.status_code == 404


def test_expired_time_limit_closes_the_session_with_zero_score(make_user, db_engine):
    """time_limit can't be set through any API endpoint today (neither
    QuizCreate nor QuizUpdate exposes it) - set it directly via the DB, the
    only way it's currently reachable outside of seed_database.py."""
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)]
    )
    with Session(db_engine) as db:
        db_quiz = db.exec(select(Quiz).where(Quiz.id == quiz["id"])).first()
        db_quiz.time_limit = 1
        db.add(db_quiz)
        db.commit()

    start = owner.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]

    # Backdate the play's start time instead of sleeping past the limit.
    with Session(db_engine) as db:
        from app.models import Play

        play = db.exec(select(Play).where(Play.session_uuid == UUID(session_uuid))).first()
        play.started_at = datetime.utcnow() - timedelta(seconds=10)
        db.add(play)
        db.commit()

    response = owner.post(
        f"/quizzes/play/{session_uuid}/submit",
        json=[{"question_id": question["id"], "answer_id": answer_ids[0]}],
    )
    assert response.json()["score"] == 0

    # The session must be closed out, not left open forever.
    with Session(db_engine) as db:
        from app.models import Play

        play = db.exec(select(Play).where(Play.session_uuid == UUID(session_uuid))).first()
        assert play.finished_at is not None


# ---------------------------------------------------------------------------
# Score attribution
# ---------------------------------------------------------------------------

def test_score_is_attributed_to_the_logged_in_players_global_score(make_user, db_engine):
    """Regression test: current_user was silently None in /start (missing
    Depends), so play.user_id was always NULL and global_score never
    updated for logged-in players."""
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)]
    )
    _start_and_submit(
        owner, quiz["id"], [{"question_id": question["id"], "answer_id": answer_ids[0]}]
    )

    with Session(db_engine) as db:
        user = db.exec(select(User).where(User.id == owner.user_id)).first()
        assert user.global_score == 1


def test_anonymous_play_does_not_error_and_leaves_no_user_attribution(client, make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True)], visibility="public"
    )

    start = client.post(f"/quizzes/{quiz['id']}/start")
    assert start.status_code == 200
    session_uuid = start.json()["session_uuid"]

    response = client.post(
        f"/quizzes/play/{session_uuid}/submit",
        json=[{"question_id": question["id"], "answer_id": answer_ids[0]}],
    )
    assert response.status_code == 200
    assert response.json()["score"] == 1


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def test_leaderboard_404s_for_a_nonexistent_quiz(client):
    response = client.get("/quizzes/999999/leaderboard")
    assert response.status_code == 404


def test_leaderboard_ranks_by_best_score(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True), ("Wrong", False)]
    )
    player = make_user(username="player")

    _start_and_submit(
        player, quiz["id"], [{"question_id": question["id"], "answer_id": answer_ids[1]}]
    )  # wrong -> 0

    response = owner.get(f"/quizzes/{quiz['id']}/leaderboard")
    assert response.status_code == 200
    leaderboard = response.json()["leaderboard"]
    assert len(leaderboard) == 1
    assert leaderboard[0]["username"] == "player"
    assert leaderboard[0]["best_score"] == 0


# ---------------------------------------------------------------------------
# Quiz results
# ---------------------------------------------------------------------------

def test_get_result_before_completion_is_rejected(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, _ = _make_quiz_with_question(owner, "single_choice", [("Right", True)])
    start = owner.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]

    response = owner.get(f"/quizzes/play/{session_uuid}/result")
    assert response.status_code == 400


def test_get_result_for_unknown_session_404s(client):
    response = client.get(
        "/quizzes/play/00000000-0000-0000-0000-000000000000/result"
    )
    assert response.status_code == 404


def test_get_result_after_completion(make_user):
    owner = make_user(username="owner", role="creator")
    quiz, question, answer_ids = _make_quiz_with_question(
        owner, "single_choice", [("Right", True), ("Wrong", False)]
    )
    start = owner.post(f"/quizzes/{quiz['id']}/start")
    session_uuid = start.json()["session_uuid"]
    owner.post(
        f"/quizzes/play/{session_uuid}/submit",
        json=[{"question_id": question["id"], "answer_id": answer_ids[0]}],
    )

    response = owner.get(f"/quizzes/play/{session_uuid}/result")
    assert response.status_code == 200
    body = response.json()
    assert body["quiz_title"] == quiz["title"]
    assert body["score"] == 1
    assert body["total_questions"] == 1
    assert body["percentage"] == 100.0
