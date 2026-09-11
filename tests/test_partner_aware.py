import json
from types import SimpleNamespace

import ai.partner_aware as m


class FakeGenerationClient:
    def __init__(self, payload):
        self.payload = payload
        self.calls = 0
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self.create)
        )

    def create(self, *args, **kwargs):
        self.calls += 1
        content = json.dumps(self.payload, ensure_ascii=False)
        message = SimpleNamespace(content=content)
        choice = SimpleNamespace(message=message)
        return SimpleNamespace(choices=[choice])


class NoGenerationClient:
    def __init__(self):
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self.create)
        )

    def create(self, *args, **kwargs):
        raise AssertionError("generation must not be called on a fixed route")


def test_mixed_script_gate_rejects_observed_failure_but_allows_hyphenated_terms():
    assert m._mixed_script("Само ако смятasz, че е нужно.") is True

    assert m._mixed_script("Да, благодаря.") is False
    assert m._mixed_script("Донеси NHS документа.") is False
    assert m._mixed_script("Направих COVID тест.") is False
    assert m._mixed_script("Направих COVID-тест.") is False
    assert m._mixed_script("Виж NHS-документа.") is False


def test_language_gate_keeps_known_valid_cases_and_rejects_known_invalid_cases():
    assert m._language_ok("Да, благодаря.", "bg") is True
    assert m._language_ok("Направих COVID-тест.", "bg") is True
    assert m._language_ok("Виж NHS-документа.", "bg") is True

    assert m._language_ok("Само ако смятasz, че е нужно.", "bg") is False
    assert m._language_ok("Да, повикај ја.", "bg") is False
    assert m._language_ok("Yes, please.", "bg") is False

    assert m._language_ok("Yes, please.", "en") is True


def test_unknown_fact_route_uses_fixed_reply_without_generation(monkeypatch):
    client = NoGenerationClient()

    monkeypatch.setattr(m, "_get_client", lambda: client)
    monkeypatch.setattr(
        m,
        "_route",
        lambda client, text: "UNKNOWN_OPEN_FACT",
    )

    result = m.generate_partner_replies(
        "What time is your appointment tomorrow?"
    )

    assert result == list(m.FIXED_REPLIES["en"])


def test_uncertain_route_uses_fixed_reply_without_generation(monkeypatch):
    client = NoGenerationClient()

    monkeypatch.setattr(m, "_get_client", lambda: client)
    monkeypatch.setattr(
        m,
        "_route",
        lambda client, text: "UNCERTAIN",
    )

    result = m.generate_partner_replies("Неясен текст")

    assert result == list(m.UNCERTAIN_REPLIES["bg"])


def test_open_reply_keeps_only_candidate_that_passes_language_gate(monkeypatch):
    client = FakeGenerationClient(
        {
            "suggestions": [
                "Да, повикай я.",
                "Да, повикај ја.",
                "Yes, please.",
                "Само ако смятasz, че е нужно.",
            ]
        }
    )

    monkeypatch.setattr(m, "_get_client", lambda: client)
    monkeypatch.setattr(
        m,
        "_route",
        lambda client, text: "OPEN_REPLY",
    )

    result = m.generate_partner_replies("Да повикам ли сестрата?")

    assert result == ["Да, повикай я."]
    assert client.calls == 1


def test_open_reply_falls_back_when_every_generated_candidate_is_rejected(
    monkeypatch,
):
    client = FakeGenerationClient(
        {
            "suggestions": [
                "Да, повикај ја.",
                "Yes, please.",
                "Само ако смятasz, че е нужно.",
            ]
        }
    )

    monkeypatch.setattr(m, "_get_client", lambda: client)
    monkeypatch.setattr(
        m,
        "_route",
        lambda client, text: "OPEN_REPLY",
    )

    result = m.generate_partner_replies("Да повикам ли сестрата?")

    assert result == list(m.UNCERTAIN_REPLIES["bg"])
    assert client.calls == 1
