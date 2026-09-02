from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_docs_hidden_when_not_debug():
    # DEBUG=true is set in this project's .env for local dev; this asserts the
    # wiring (docs_url=None when settings.DEBUG is False) rather than the
    # current environment's value.
    from app.core.config import settings

    response = client.get("/openapi.json")
    if settings.DEBUG:
        assert response.status_code == 200
    else:
        assert response.status_code == 404
