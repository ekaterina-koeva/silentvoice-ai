"""Optional Partner-Aware reply candidates.

Kept apart from ai/phrase_gen.py on purpose. That module turns cues the person
chose themselves into one phrase. This one takes the words of somebody else,
who has consented to nothing, and proposes replies the person may take or
ignore. Two different tasks with different risks, so they share neither a
function nor a prompt nor a provider.

Partner transcript text is sent to an external processor. The provider, its
retention, the training position and what has to be told to the partner are
recorded in docs/PARTNER_AWARE_DATA_FLOW.md and not repeated here, so the two
cannot drift apart.

Nothing in this module speaks. It returns candidates. The interface decides,
and only after a deliberate selection by the person.
"""

import json
import os
import re

from openai import OpenAI

from ai.prompts import (
    PARTNER_REPLY_SYSTEM_PROMPT,
    PARTNER_REPLY_USER_TEMPLATE,
    PARTNER_ROUTE_SYSTEM_PROMPT,
)

MODEL = "gpt-4o-mini"
MAX_TRANSCRIPT_CHARS = 400
MAX_SUGGESTIONS = 3
MAX_SUGGESTION_CHARS = 120
MAX_OUTPUT_TOKENS = 300

# Structured Outputs guarantees the shape. It does not guarantee the product
# rules, so the cap of three, the length limit and the duplicate check are
# still applied here. maxItems is deliberately absent from the schema: sources
# disagree on whether strict mode accepts it, the cap is enforced below either
# way, and a rejected request would cost more than the keyword is worth.
_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "partner_reply_suggestions",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "items": {"type": "string"},
                }
            },
            "required": ["suggestions"],
            "additionalProperties": False,
        },
    },
}

# Which language the partner used. Decided by the alphabet rather than by a
# model, because the fixed replies below have to be in the right language and a
# model cannot be the thing that decides whether a model is trusted.
CYRILLIC = set("абвгдежзийклмнопрстуфхцчшщъьюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ")

# Letters that exist in Macedonian and Serbian but not in Bulgarian. Repeated
# testing on 11 September 2026 produced Macedonian forms for a Bulgarian
# question in four runs out of five, so a candidate carrying one of these is
# not Bulgarian and is dropped. This gate checks characters, not meaning, which
# is exactly why it can be relied on.
NOT_BULGARIAN = set("јќѓљњџћђЈЌЃЉЊЏЋЂ")

# Used when the partner asks for a value the product cannot know. Written here
# rather than generated, because a generated answer to an unknown fact is a
# guess however it is phrased.
FIXED_REPLIES = {
    "bg": ["Не знам.", "Трябва да проверя.", "Може ли да ми напомниш?"],
    "en": ["I don't know.", "I need to check.", "Can you remind me?"],
}


# Used when the router is unsure. The doubt is ours, not the person's, so
# these do not say that they failed to understand. A neutral acknowledgement
# fits a statement, and the third fits an unclear question.
UNCERTAIN_REPLIES = {
    "bg": ["Добре.", "Благодаря.", "Може ли да повториш?"],
    "en": ["All right.", "Thank you.", "Could you say that again?"],
}


LANGUAGE_NAMES = {"bg": "Bulgarian", "en": "English"}


def detect_language(text: str) -> str:
    """bg when the text carries Cyrillic, en otherwise."""
    for ch in text:
        if ch in CYRILLIC or ch in NOT_BULGARIAN:
            return "bg"
    return "en"


def _mixed_script(reply: str) -> bool:
    """True when one uninterrupted letter sequence mixes Cyrillic and Latin.

    Testing on 11 September 2026 produced "смятasz", a single lexical token
    written partly in each alphabet. That is not valid output for either
    supported language mode.

    Punctuation and hyphens separate letter sequences, so ordinary forms such
    as "COVID-тест" and "NHS-документ" remain valid.
    """
    for token in re.findall(r"[A-Za-z\u0400-\u04ff]+", reply):
        has_cyr = any("\u0400" <= ch <= "\u04ff" for ch in token)
        has_lat = any(("a" <= ch <= "z") or ("A" <= ch <= "Z") for ch in token)
        if has_cyr and has_lat:
            return True
    return False


def _language_ok(reply: str, language: str) -> bool:
    """A candidate has to be in the language the partner used.

    Not a judgement about quality. A Bulgarian reply written in Macedonian, or
    an English reply to a Bulgarian question, is unusable whatever it says,
    and the person choosing it cannot tell.
    """
    if _mixed_script(reply):
        return False
    if any(ch in NOT_BULGARIAN for ch in reply):
        return False
    has_cyrillic = any(ch in CYRILLIC for ch in reply)
    if language == "bg":
        return has_cyrillic
    return not has_cyrillic


_client = None


def _get_client():
    """Built on first use, not at import, so the application still starts
    without a key and the ordinary card interface keeps working."""
    global _client
    if _client is None:
        if not os.environ.get("OPENAI_API_KEY"):
            return None
        _client = OpenAI()
    return _client


def _clean(items) -> list:
    """Whatever came back, reduced to what the interface may show."""
    out = []
    if not isinstance(items, list):
        return out
    for item in items:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text or len(text) > MAX_SUGGESTION_CHARS:
            continue
        if text in out:
            continue
        out.append(text)
        if len(out) >= MAX_SUGGESTIONS:
            break
    return out


def _route(client, text: str) -> str:
    """Which path this transcript takes. Never writes a reply.

    Returns UNCERTAIN on any failure, so a router that is down or confused
    costs a duller suggestion rather than a confident invention.
    """
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=10,
            store=False,
            messages=[
                {"role": "system", "content": PARTNER_ROUTE_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
        label = (completion.choices[0].message.content or "").strip().upper()
    except Exception:
        return "UNCERTAIN"
    if label in ("UNKNOWN_OPEN_FACT", "OPEN_REPLY", "UNCERTAIN"):
        return label
    return "UNCERTAIN"


def generate_partner_replies(transcript: str) -> list:
    """Up to three short replies to what the partner said.

    Returns an empty list rather than raising. A person who cannot speak must
    not lose their communication cards because a remote service is down, so
    every failure here is a quiet empty result that the interface reports as a
    failure to suggest, never as a failure of the product.

    A transcript longer than the limit is refused rather than truncated.
    Cutting it would send half a sentence and propose replies to something the
    partner did not finish saying.
    """
    if not isinstance(transcript, str):
        return []
    text = transcript.strip()
    if not text:
        return []
    if len(text) > MAX_TRANSCRIPT_CHARS:
        return []

    language = detect_language(text)

    client = _get_client()
    if client is None:
        return []

    # Where a reply would need a value the product cannot know, the
    # generator is not asked at all. Repeated testing on 11 September 2026
    # showed that asking it not to invent such values reduces the behaviour
    # without removing it, so fixed replies are used instead. UNCERTAIN
    # takes a fixed path too: doubt costs a duller suggestion rather than a
    # confident invention. Neither path makes a second API call.
    route = _route(client, text)
    if route == "UNKNOWN_OPEN_FACT":
        return list(FIXED_REPLIES[language])
    if route != "OPEN_REPLY":
        return list(UNCERTAIN_REPLIES[language])

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_OUTPUT_TOKENS,
            store=False,
            response_format=_SCHEMA,
            messages=[
                {
                    "role": "system",
                    "content": PARTNER_REPLY_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": PARTNER_REPLY_USER_TEMPLATE.format(
                        language=LANGUAGE_NAMES[language],
                        transcript=text,
                    ),
                },
            ],
        )
        raw = (completion.choices[0].message.content or "").strip()
    except Exception:
        return []

    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        return []

    items = parsed.get("suggestions") if isinstance(parsed, dict) else parsed
    kept = [s for s in _clean(items) if _language_ok(s, language)]

    # A suggestion in the wrong language is one the person cannot check
    # before speaking it, so the fixed replies are better than a fluent
    # sentence in a language that is not theirs.
    if not kept:
        return list(UNCERTAIN_REPLIES[language])
    return kept