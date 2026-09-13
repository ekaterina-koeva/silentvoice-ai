import os

import anthropic

from ai.prompts import PHRASE_GENERATION_PROMPT


_client = None


def _get_client():
    """Build the provider client only when phrase generation is requested."""
    global _client
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def generate_phrase(keywords: list[str]) -> str | None:
    """
    Takes a list of selected keywords and generates
    a soft, human assistive communication phrase.

    Provider failure returns None rather than escaping into the communication
    interface. Fixed communication cards remain available independently.
    """
    if not keywords:
        return "I need help."

    keywords_str = ", ".join(keywords)
    prompt = PHRASE_GENERATION_PROMPT.format(keywords=keywords_str)

    try:
        client = _get_client()
        if client is None:
            return None

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        phrase = message.content[0].text.strip()
    except Exception:
        return None

    return phrase or None
