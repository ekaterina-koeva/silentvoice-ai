"""Tests for the limits on the AI phrase generation endpoint.

/generate spends the Anthropic API key, so the route must reject oversized
input and too many requests.

Since 25 August 2026 the route is also behind the password, so the tests
authenticate. The password is not the limit: an invited person can still exhaust
the key, which is why these limits stay.

The validation and rate-limit tests stop before the provider is called. Provider
failure tests use local test doubles and never make a network request.
"""

import time

from fastapi.testclient import TestClient

import ai.phrase_gen as phrase_gen
import main
from main import MAX_KEYWORDS, MAX_KEYWORD_LENGTH, RATE_LIMIT_REQUESTS, app

client = TestClient(app)


def setup_function():
    main._generate_calls.clear()


def test_empty_keywords_are_rejected(auth_headers):
    response = client.post("/generate", json={"keywords": []}, headers=auth_headers)

    assert response.status_code == 400


def test_too_many_keywords_are_rejected(auth_headers):
    keywords = ["help"] * (MAX_KEYWORDS + 1)

    response = client.post("/generate", json={"keywords": keywords}, headers=auth_headers)

    assert response.status_code == 400


def test_overlong_keyword_is_rejected(auth_headers):
    keyword = "x" * (MAX_KEYWORD_LENGTH + 1)

    response = client.post("/generate", json={"keywords": [keyword]}, headers=auth_headers)

    assert response.status_code == 400


def test_requests_above_the_rate_limit_are_rejected(auth_headers):
    now = time.monotonic()
    main._generate_calls["testclient"] = [now] * RATE_LIMIT_REQUESTS

    response = client.post("/generate", json={"keywords": ["help"]}, headers=auth_headers)

    assert response.status_code == 429


def test_input_is_validated_before_the_rate_limit(auth_headers):
    now = time.monotonic()
    main._generate_calls["testclient"] = [now] * RATE_LIMIT_REQUESTS

    response = client.post("/generate", json={"keywords": []}, headers=auth_headers)

    assert response.status_code == 400


def test_generation_is_not_reachable_without_the_password():
    """The limits and the password are two different controls.

    This test fails if the route is ever opened up again by accident.
    """
    response = client.post("/generate", json={"keywords": ["help"]})

    assert response.status_code == 401


def test_missing_provider_key_is_reported_without_a_server_error(
    auth_headers,
    monkeypatch,
):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(phrase_gen, "_client", None)

    response = client.post(
        "/generate",
        json={"keywords": ["help"]},
        headers=auth_headers,
    )

    assert response.status_code == 503
    assert response.json() == {
        "phrase": None,
        "profile": "general",
        "generation_available": False,
        "message": (
            "Phrase generation is unavailable right now. "
            "Communication cards still work."
        ),
    }


def test_provider_failure_is_reported_without_a_server_error(
    auth_headers,
    monkeypatch,
):
    class FailingMessages:
        def create(self, **kwargs):
            raise RuntimeError("provider unavailable")

    class FailingClient:
        messages = FailingMessages()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-used")
    monkeypatch.setattr(phrase_gen, "_client", FailingClient())

    response = client.post(
        "/generate",
        json={"keywords": ["help"]},
        headers=auth_headers,
    )

    assert response.status_code == 503
    assert response.json()["generation_available"] is False
    assert response.json()["phrase"] is None
