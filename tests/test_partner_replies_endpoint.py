"""The /partner-aware/replies route.

The module behind it is covered in tests/test_partner_aware.py. These tests are
about the transport: what the route refuses, what it allows, and what it does
when the suggestion path has nothing to give.

No API key, no network and no model. generate_partner_replies is patched on
main, not on ai.partner_aware, because main imports the name directly and holds
its own reference to it.
"""

from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def setup_function():
    main._partner_calls.clear()
    main._generate_calls.clear()


def test_empty_transcript_is_refused(auth_headers):
    response = client.post(
        "/partner-aware/replies",
        json={"transcript": ""},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_whitespace_only_transcript_is_refused(auth_headers):
    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "   "},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_transcript_over_the_limit_is_refused(auth_headers):
    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "x" * (main.MAX_TRANSCRIPT_CHARS + 1)},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_valid_transcript_returns_suggestions(auth_headers, monkeypatch):
    monkeypatch.setattr(
        main,
        "generate_partner_replies",
        lambda transcript: ["Да.", "Не.", "Може би."],
    )

    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "Искате ли чай?"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {"suggestions": ["Да.", "Не.", "Може би."]}


def test_no_suggestions_is_a_result_not_an_error(auth_headers, monkeypatch):
    """The suggestion path can fail for reasons the person cannot act on.

    When it does, the route says so with an empty list rather than a server
    error, because the interface has to report that it could not suggest
    without implying that the product is broken.
    """
    monkeypatch.setattr(main, "generate_partner_replies", lambda transcript: [])

    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "Искате ли чай?"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {"suggestions": []}


def test_route_is_closed_without_access():
    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "Искате ли чай?"},
    )
    assert response.status_code == 401


def test_rate_limit_applies(auth_headers, monkeypatch):
    monkeypatch.setattr(main, "generate_partner_replies", lambda transcript: [])

    main._partner_calls["testclient"] = [
        __import__("time").monotonic()
    ] * main.RATE_LIMIT_REQUESTS

    response = client.post(
        "/partner-aware/replies",
        json={"transcript": "Искате ли чай?"},
        headers=auth_headers,
    )

    assert response.status_code == 429


def test_the_two_budgets_are_separate(auth_headers, monkeypatch):
    """Each route has its own allowance, in both directions.

    A shared counter would mean that using ordinary phrase generation stops a
    person asking their partner a question, or the reverse, and neither would
    be explained on screen.
    """
    import time

    monkeypatch.setattr(main, "generate_partner_replies", lambda transcript: [])
    monkeypatch.setattr(main, "generate_phrase", lambda keywords: "I would like water.")

    # The ordinary generator is exhausted. Partner-Aware still answers.
    main._generate_calls["testclient"] = [time.monotonic()] * main.RATE_LIMIT_REQUESTS
    assert (
        client.post(
            "/generate",
            json={"keywords": ["water"]},
            headers=auth_headers,
        ).status_code
        == 429
    )
    assert (
        client.post(
            "/partner-aware/replies",
            json={"transcript": "Искате ли чай?"},
            headers=auth_headers,
        ).status_code
        == 200
    )

    # And the other way round.
    main._generate_calls.clear()
    main._partner_calls["testclient"] = [time.monotonic()] * main.RATE_LIMIT_REQUESTS
    assert (
        client.post(
            "/partner-aware/replies",
            json={"transcript": "Искате ли чай?"},
            headers=auth_headers,
        ).status_code
        == 429
    )
    assert (
        client.post(
            "/generate",
            json={"keywords": ["water"]},
            headers=auth_headers,
        ).status_code
        == 200
    )
