"""Tests for the public pages.

The site was one long page until 25 August 2026. It is now eight pages with a
shared header and footer, so the navigation exists in one place and a reader can
be sent to the part that answers their question.
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

PAGES = [
    ("/", "Say what you need"),
    ("/how-it-works", "How it works"),
    ("/who-it-is-for", "Who it is for"),
    ("/status", "Current status"),
    ("/roadmap", "Roadmap"),
    ("/about", "Ekaterina Koeva"),
    ("/questions", "Questions"),
    ("/contact", "Contact"),
]


@pytest.mark.parametrize("path,heading", PAGES)
def test_every_page_is_public_and_carries_its_heading(path, heading):
    response = client.get(path)

    assert response.status_code == 200
    assert heading in response.text


@pytest.mark.parametrize("path,_heading", PAGES)
def test_every_page_carries_the_navigation_and_the_way_in(path, _heading):
    text = client.get(path).text

    assert 'href="/about"' in text
    assert 'href="/sign-in"' in text
    assert "Invited access" in text


def test_the_current_page_is_marked_in_the_navigation():
    """A reader should be able to tell where they are without the address bar."""
    text = client.get("/about").text

    assert 'data-page="about" aria-current="page"' in text
    assert 'data-page="status" aria-current="page"' not in text


def test_the_home_page_states_the_regulatory_position():
    text = " ".join(client.get("/").text.split())

    assert "undergoing regulatory assessment" in text
    assert "does not contact emergency services" in text
    assert "not registered or clinically validated" in text


def test_the_status_page_says_the_help_button_notifies_nobody():
    text = " ".join(client.get("/status").text.split())

    assert "does not notify anyone" in text


def test_the_about_page_carries_the_portrait():
    text = client.get("/about").text

    assert "/static/ekaterina-koeva.png" in text
    assert 'alt="Portrait of Ekaterina Koeva"' in text


def test_no_page_carries_an_email_address():
    """The address is never printed, so it cannot be harvested."""
    for path, _ in PAGES:
        text = client.get(path).text
        assert "ekoeva714" not in text
        assert "mailto:" not in text


def test_the_pages_say_they_store_nothing():
    text = " ".join(client.get("/").text.split())

    assert "sets no cookies and stores nothing on your device" in text
