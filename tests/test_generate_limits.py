"""Tests for the limits on the AI phrase generation endpoint.

/generate spends the Anthropic API key and the deployment is public, so the
route must reject oversized input and too many requests.

Every test here stops before the provider is called. The rate limit test fills
the counter directly rather than making real requests.
"""

import time

from fastapi.testclient import TestClient

import main
from main import MAX_KEYWORDS, MAX_KEYWORD_LENGTH, RATE_LIMIT_REQUESTS, app

client = TestClient(app)


def setup_function():
    main._generate_calls.clear()


def test_empty_keywords_are_rejected():
    response = client.post("/generate", json={"keywords": []})

    assert response.status_code == 400


def test_too_many_keywords_are_rejected():
    keywords = ["help"] * (MAX_KEYWORDS + 1)

    response = client.post("/generate", json={"keywords": keywords})

    assert response.status_code == 400


def test_overlong_keyword_is_rejected():
    keyword = "x" * (MAX_KEYWORD_LENGTH + 1)

    response = client.post("/generate", json={"keywords": [keyword]})

    assert response.status_code == 400


def test_requests_above_the_rate_limit_are_rejected():
    now = time.monotonic()
    main._generate_calls["testclient"] = [now] * RATE_LIMIT_REQUESTS

    response = client.post("/generate", json={"keywords": ["help"]})

    assert response.status_code == 429


def test_input_is_validated_before_the_rate_limit():
    now = time.monotonic()
    main._generate_calls["testclient"] = [now] * RATE_LIMIT_REQUESTS

    response = client.post("/generate", json={"keywords": []})

    assert response.status_code == 400