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


def test_emergency_is_recorded_with_the_emergency_flag():
    client.delete("/history")
    client.post("/emergency")

    history = client.get("/history").json()["history"]

    assert len(history) == 1
    entry = history[0]
    assert entry["emergency"] is True
    assert entry["phrase"] == EMERGENCY_PHRASE
    assert entry["profile"] == "emergency"
    assert entry["timestamp"]


def test_repeated_emergencies_are_each_recorded():
    client.delete("/history")
    client.post("/emergency")
    client.post("/emergency")
    client.post("/emergency")

    history = client.get("/history").json()["history"]

    assert len(history) == 3
    assert all(entry["emergency"] is True for entry in history)


def test_clearing_history_removes_emergency_entries():
    client.post("/emergency")
    client.delete("/history")

    assert client.get("/history").json()["history"] == []
