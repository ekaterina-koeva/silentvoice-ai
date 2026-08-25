"""Tests for the contact form on the public page.

The form exists so that a therapist, a carer or an adviser can ask for access
without the email address being printed on the page for robots to collect.

What a visitor writes is passed straight on as an email. Nothing is written to
disk here, and there is no mailing list.
"""

import pytest
from fastapi.testclient import TestClient

import main
from main import CONTACT_TO_ENV, SMTP_HOST_ENV, app

client = TestClient(app)

FORM = {"name": "A Therapist", "email": "someone@example.org", "message": "May I see it?"}


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    monkeypatch.delenv(SMTP_HOST_ENV, raising=False)
    monkeypatch.delenv(CONTACT_TO_ENV, raising=False)
    main._messages_sent.clear()
    yield
    main._messages_sent.clear()


@pytest.fixture
def outbox(monkeypatch):
    """Replaces the sender, so no test ever sends a real email."""
    sent: list[tuple[str, str, str]] = []
    monkeypatch.setenv(SMTP_HOST_ENV, "smtp.example.org")
    monkeypatch.setenv(CONTACT_TO_ENV, "someone@example.org")
    monkeypatch.setattr(main, "_send_message", lambda n, e, m: sent.append((n, e, m)))
    return sent


def test_the_page_carries_a_form_and_not_an_address():
    """The address is never printed, so it cannot be harvested from the page."""
    text = client.get("/contact").text

    assert 'action="/contact"' in text
    assert "ekoeva714@gmail.com" not in text
    assert "mailto:" not in text


def test_the_page_says_what_happens_to_a_message():
    text = " ".join(client.get("/contact").text.split())

    assert "not stored on this server" in text


def test_a_message_is_passed_on(outbox):
    response = client.post("/contact", data=FORM)

    assert response.status_code == 200
    assert "has been sent" in response.text
    assert outbox == [("A Therapist", "someone@example.org", "May I see it?")]


def test_an_empty_form_is_refused(outbox):
    response = client.post("/contact", data={"name": "", "email": "", "message": ""})

    assert "Please fill in" in response.text
    assert outbox == []


def test_the_form_says_so_when_it_is_not_configured():
    response = client.post("/contact", data=FORM)

    assert "not available" in response.text


def test_the_honeypot_swallows_a_robot(outbox):
    """A robot fills the hidden field, and is answered like anyone else.

    Telling it that it was caught would only teach it to stop filling the field.
    """
    response = client.post("/contact", data={**FORM, "website": "http://spam.example"})

    assert "has been sent" in response.text
    assert outbox == []


def test_too_many_messages_from_one_place_are_slowed_down(outbox):
    for _ in range(main.MAX_MESSAGES):
        assert "has been sent" in client.post("/contact", data=FORM).text

    blocked = client.post("/contact", data=FORM)

    assert "Please wait an hour" in blocked.text
    assert len(outbox) == main.MAX_MESSAGES


def test_a_failure_to_send_does_not_pretend_otherwise(monkeypatch):
    monkeypatch.setenv(SMTP_HOST_ENV, "smtp.example.org")
    monkeypatch.setenv(CONTACT_TO_ENV, "someone@example.org")

    def explode(name, email, message):
        raise OSError("the mail server refused the connection")

    monkeypatch.setattr(main, "_send_message", explode)

    response = client.post("/contact", data=FORM)

    assert "could not be sent" in response.text
    # And the reason stays on the server, where it belongs.
    assert "refused the connection" not in response.text
