"""Tests for the emergency help-request flow (T51).

The emergency feature sends a request for help. It must never state,
imply or infer a medical condition, diagnosis, symptom or prognosis.
"""

from fastapi.testclient import TestClient

from main import EMERGENCY_PHRASE, app

client = TestClient(app)

# Terms that would turn a help request into a medical claim.
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


def test_emergency_endpoint_responds_successfully():
    response = client.post("/emergency")

    assert response.status_code == 200
    assert response.json()["emergency"] is True


def test_emergency_returns_the_configured_phrase():
    response = client.post("/emergency")

    assert response.json()["phrase"] == EMERGENCY_PHRASE


def test_emergency_phrase_asks_for_help():
    phrase = EMERGENCY_PHRASE.lower()

    assert "emergency" in phrase
    assert "come" in phrase or "assistance" in phrase or "help" in phrase


def test_emergency_phrase_makes_no_medical_claim():
    phrase = EMERGENCY_PHRASE.lower()

    for term in MEDICAL_TERMS:
        assert term not in phrase, f"Emergency phrase must not contain '{term}'"


def test_repeated_emergency_requests_all_succeed():
    for _ in range(3):
        response = client.post("/emergency")

        assert response.status_code == 200
        assert response.json()["emergency"] is True


def test_no_server_side_history_is_exposed():
    """Session history belongs to the browser.

    A shared server side list returned one persons communication to every
    other visitor on a public deployment, and the interface never read it.
    """
    assert client.get("/history").status_code == 404
