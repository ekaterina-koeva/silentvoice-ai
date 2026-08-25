"""Tests for the restricted access introduced on 25 August 2026.

The working interface is closed while the product is under regulatory
assessment. The landing page stays public. Two properties matter most: the
default is closed, and the browser is never challenged with its own grey
dialog, because a person invited to look at an assistive communication tool
should meet a page, not a browser prompt.
"""

import base64

import pytest
from fastapi.testclient import TestClient

import main
from main import DEV_OPEN_ENV, INVITE_ENV, PASSWORD_ENV, SESSION_COOKIE, app

CODE = "a-real-invitation-code"
PASSWORD = "a-real-password-for-tests"

PROTECTED_GETS = ["/profiles", "/cards/general"]
PROTECTED_POSTS = ["/generate", "/speak", "/emergency"]


def _client() -> TestClient:
    """A fresh client, so a cookie from one test cannot help another."""
    return TestClient(app)


def _basic(code: str, password: str) -> dict[str, str]:
    raw = f"{code}:{password}".encode()
    return {"Authorization": "Basic " + base64.b64encode(raw).decode()}


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch):
    """Every test states its own environment, and none leaks into the next."""
    monkeypatch.delenv(INVITE_ENV, raising=False)
    monkeypatch.delenv("SV_INVITATION_CODE", raising=False)
    monkeypatch.delenv(PASSWORD_ENV, raising=False)
    monkeypatch.delenv(DEV_OPEN_ENV, raising=False)
    main._auth_failures.clear()
    main._generate_calls.clear()
    yield
    main._auth_failures.clear()


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setenv(INVITE_ENV, CODE)
    monkeypatch.setenv(PASSWORD_ENV, PASSWORD)


# ---- what stays public --------------------------------------------------


def test_landing_page_is_public():
    response = _client().get("/")

    assert response.status_code == 200
    assert "SilentVoice AI" in response.text


def test_landing_page_offers_a_way_in_for_invited_people():
    """A restricted product still has to tell an invited person where to go.

    The first version of the page said access was by invitation and then gave
    no route to it.
    """
    text = _client().get("/").text

    assert 'href="/sign-in"' in text
    assert "Invited access" in text


def test_health_is_public():
    response = _client().get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_robots_is_public_and_disallows_the_application():
    response = _client().get("/robots.txt")

    assert response.status_code == 200
    assert "Disallow: /app" in response.text


def test_the_sign_in_page_is_public_and_asks_for_both(configured):
    response = _client().get("/sign-in")

    assert response.status_code == 200
    assert 'name="code"' in response.text
    assert 'name="password"' in response.text


# ---- what is closed -----------------------------------------------------


def test_the_interface_sends_a_visitor_to_the_sign_in_page(configured):
    """No browser dialog. A person meets a page written for them."""
    response = _client().get("/app", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/sign-in"


@pytest.mark.parametrize("path", PROTECTED_GETS)
def test_protected_get_refuses_without_credentials(configured, path):
    response = _client().get(path)

    assert response.status_code == 401
    # The browser must not be invited to show its own password dialog.
    assert "WWW-Authenticate" not in response.headers


@pytest.mark.parametrize("path", PROTECTED_POSTS)
def test_protected_post_refuses_without_credentials(configured, path):
    response = _client().post(path, json={"keywords": ["water"], "phrase": "hello"})

    assert response.status_code == 401


def test_the_code_alone_is_not_enough(configured):
    assert _client().get("/profiles", headers=_basic(CODE, "wrong")).status_code == 401


def test_the_password_alone_is_not_enough(configured):
    assert _client().get("/profiles", headers=_basic("wrong", PASSWORD)).status_code == 401


def test_a_missing_configuration_closes_the_application(monkeypatch):
    """The default is closed.

    A deployment that loses its environment variables must not quietly open the
    interface to everybody, so the refusal happens before any comparison.
    """
    response = _client().get("/profiles", headers=_basic(CODE, PASSWORD))

    assert response.status_code == 503
    assert "restricted" in response.json()["detail"].lower()


def test_a_code_without_a_password_configured_lets_nobody_in(monkeypatch):
    monkeypatch.setenv(INVITE_ENV, CODE)

    assert _client().get("/profiles", headers=_basic(CODE, PASSWORD)).status_code == 503


# ---- signing in ----------------------------------------------------------


def test_signing_in_with_both_opens_the_interface(configured):
    client = _client()

    response = client.post("/sign-in", data={"code": CODE, "password": PASSWORD}, follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/app"
    assert SESSION_COOKIE in response.cookies

    assert client.get("/app").status_code == 200
    assert client.get("/profiles").status_code == 200


def test_signing_in_with_the_wrong_code_says_so_without_saying_which_half(configured):
    client = _client()

    response = client.post("/sign-in", data={"code": "wrong", "password": PASSWORD})

    assert response.status_code == 200
    assert "not recognised" in response.text
    assert SESSION_COOKIE not in response.cookies
    # Telling a guesser that the password was right would halve their work.
    assert "password was correct" not in response.text


def test_signing_out_ends_the_session(configured):
    client = _client()
    client.post("/sign-in", data={"code": CODE, "password": PASSWORD})

    assert client.get("/app").status_code == 200

    client.get("/sign-out")

    assert client.get("/app", follow_redirects=False).status_code == 303


def test_a_session_signed_with_other_credentials_is_refused(configured, monkeypatch):
    """Withdrawing a code ends the sessions opened with it."""
    client = _client()
    client.post("/sign-in", data={"code": CODE, "password": PASSWORD})
    assert client.get("/app").status_code == 200

    monkeypatch.setenv(INVITE_ENV, "a-different-code")

    assert client.get("/app", follow_redirects=False).status_code == 303


def test_the_sign_in_page_says_so_when_nothing_is_configured():
    response = _client().get("/sign-in")

    assert response.status_code == 200
    assert "not available" in response.text


# ---- what an invited script can do ----------------------------------------


def test_cards_open_with_the_code_and_the_password(configured):
    response = _client().get("/cards/general", headers=_basic(CODE, PASSWORD))

    assert response.status_code == 200
    assert response.json()["profile"] == "general"


def test_help_request_states_that_it_notifies_nobody(configured):
    response = _client().post("/emergency", headers=_basic(CODE, PASSWORD))

    assert response.status_code == 200
    assert response.json()["notifies_anyone"] is False


def test_the_development_switch_opens_the_application(monkeypatch):
    monkeypatch.setenv(DEV_OPEN_ENV, "1")

    assert _client().get("/profiles").status_code == 200
    assert _client().get("/app").status_code == 200


# ---- the back door that a code on a route does not close -------------------


def test_the_interface_is_not_reachable_through_the_static_mount():
    """A mounted directory is public by definition.

    While index.html sat in static/ anyone could fetch it directly and the
    protection on the route meant nothing. The file was moved out of the mount.
    """
    assert _client().get("/static/index.html").status_code == 404


# ---- guessing --------------------------------------------------------------


def test_repeated_wrong_attempts_are_slowed_down(configured):
    client = _client()

    for _ in range(main.MAX_AUTH_FAILURES):
        client.post("/sign-in", data={"code": "wrong", "password": "wrong"})

    blocked = client.post("/sign-in", data={"code": CODE, "password": PASSWORD})

    assert "Too many attempts" in blocked.text
    assert SESSION_COOKIE not in blocked.cookies


# ---- the API documentation ------------------------------------------------


def test_api_documentation_is_not_exposed():
    """The docs describe every route to anyone who asks.

    They are enabled only by the development switch, which is read when the
    application starts and is never set on the deployment.
    """
    assert _client().get("/docs").status_code == 404
    assert _client().get("/openapi.json").status_code == 404
