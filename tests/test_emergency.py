"""Tests for the assistance alert (T51).

The alert sends a request for help. It must never state, imply or infer a
diagnosis, a symptom or a prognosis, in the phrase or in the message that goes
out, because the wording is what a recipient reads and it is what a reviewer
would read too.

Since 25 August 2026 the route is behind the password, because the whole
application is closed while the product is under regulatory assessment. The
tests therefore authenticate.

What changed on 26 August 2026. The route used to return a phrase and notify
nobody. It now sends a message to the addresses in SV_ALERT_TO and reports
honestly whether that succeeded, so that the interface can say so on screen.
Three outcomes are covered here: no recipient configured, sending failed, and
sending succeeded. None of them is allowed to claim that somebody was told when
nobody was.

What these tests still do not prove. Nobody has confirmed receipt. There is no
acknowledgement, because there is no database yet to hold one, and an alert that
forgets it was acknowledged is worse than one that never promised to remember.
"""

import smtplib

import pytest
from fastapi.testclient import TestClient

import main
from main import EMERGENCY_PHRASE, app

client = TestClient(app)

# Terms that would turn a request for help into a claim about a person's health.
MEDICAL_TERMS = [
    "pain",
    "hurt",
    "diagnos",
    "symptom",
    "condition",
    "medical",
    "sick",
    "ill",
    "injur",
    "bleed",
    "attack",
    "stroke",
    "seizure",
    "breath",
    "heart",
]


@pytest.fixture
def alert_configured(monkeypatch):
    """Configures a recipient and captures what would have been sent."""
    sent = []

    monkeypatch.setenv(main.ALERT_TO_ENV, "carer@example.com, second@example.com")
    monkeypatch.setenv(main.SMTP_HOST_ENV, "smtp.example.com")
    monkeypatch.setattr(main, "_deliver", lambda note: sent.append(note))
    return sent


@pytest.fixture
def alert_unconfigured(monkeypatch):
    monkeypatch.delenv(main.ALERT_TO_ENV, raising=False)
    monkeypatch.delenv(main.SMTP_HOST_ENV, raising=False)


# ---- the phrase -----------------------------------------------------------


def test_the_phrase_asks_for_help():
    phrase = EMERGENCY_PHRASE.lower()

    assert "emergency" in phrase
    assert "come" in phrase or "assistance" in phrase or "help" in phrase


def test_the_phrase_makes_no_claim_about_health():
    phrase = EMERGENCY_PHRASE.lower()

    for term in MEDICAL_TERMS:
        assert term not in phrase, f"The phrase must not contain '{term}'"


def test_the_message_body_makes_no_claim_about_health():
    """The recipient reads this text, so it is held to the same rule."""
    body = main._alert_body("14:32 on 26 August 2026").lower()

    for term in MEDICAL_TERMS:
        assert term not in body, f"The message must not contain '{term}'"


def test_the_message_says_it_is_not_an_emergency_service():
    body = main._alert_body("14:32 on 26 August 2026").lower()

    assert "not an emergency service" in body


# ---- nobody configured ----------------------------------------------------


def test_it_says_plainly_when_nobody_is_configured(auth_headers, alert_unconfigured):
    response = client.post("/emergency", headers=auth_headers)
    body = response.json()

    assert response.status_code == 200
    assert body["delivered"] is False
    assert body["recipients"] == 0
    assert body["reason"] == "not_configured"


def test_the_phrase_comes_back_even_when_nothing_can_be_sent(auth_headers, alert_unconfigured):
    """Speaking aloud on the device is the part that does not need a network."""
    response = client.post("/emergency", headers=auth_headers)

    assert response.json()["phrase"] == EMERGENCY_PHRASE


# ---- sending fails --------------------------------------------------------


def test_a_failure_to_send_is_reported_as_a_failure(auth_headers, monkeypatch):
    monkeypatch.setenv(main.ALERT_TO_ENV, "carer@example.com")
    monkeypatch.setenv(main.SMTP_HOST_ENV, "smtp.example.com")

    def refuse(note):
        raise smtplib.SMTPException("the server refused it")

    monkeypatch.setattr(main, "_deliver", refuse)

    response = client.post("/emergency", headers=auth_headers)
    body = response.json()

    assert response.status_code == 200
    assert body["delivered"] is False
    assert body["reason"] == "send_failed"
    assert body["phrase"] == EMERGENCY_PHRASE


# ---- sending succeeds -----------------------------------------------------


def test_it_reports_delivery_and_counts_the_recipients(auth_headers, alert_configured):
    response = client.post("/emergency", headers=auth_headers)
    body = response.json()

    assert response.status_code == 200
    assert body["delivered"] is True
    assert body["recipients"] == 2
    assert body["reason"] is None
    assert len(alert_configured) == 1


def test_the_message_goes_to_every_configured_address(auth_headers, alert_configured):
    client.post("/emergency", headers=auth_headers)
    note = alert_configured[0]

    assert "carer@example.com" in note["To"]
    assert "second@example.com" in note["To"]


def test_the_message_carries_the_phrase_the_person_chose(auth_headers, alert_configured):
    client.post("/emergency", headers=auth_headers)
    note = alert_configured[0]

    assert EMERGENCY_PHRASE in note.get_content()


def test_repeated_requests_all_succeed(auth_headers, alert_configured):
    """An alert is never rate limited. A second call for help is not abuse."""
    for _ in range(3):
        response = client.post("/emergency", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["delivered"] is True

    assert len(alert_configured) == 3


# ---- what is not stored ---------------------------------------------------


def test_nothing_about_the_alert_is_kept_on_the_server(auth_headers, alert_configured):
    """The server passes the request on and keeps no record of it."""
    client.post("/emergency", headers=auth_headers)

    assert not hasattr(main, "_alerts")


def test_no_server_side_history_is_exposed():
    """Session history belongs to the browser.

    A shared server side list returned one persons communication to every
    other visitor on a public deployment, and the interface never read it.
    """
    assert client.get("/history").status_code == 404
