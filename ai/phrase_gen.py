import os

from openai import OpenAI

from ai.prompts import PHRASE_GENERATION_PROMPT


MODEL = "gpt-4o-mini"
_client = None


def _get_client():
    """Build the provider client only when phrase generation is requested."""
    global _client
    if not os.environ.get("OPENAI_API_KEY"):
        return None
    if _client is None:
        _client = OpenAI()
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

        completion = client.chat.completions.create(
            model=MODEL,
            max_tokens=100,
            store=False,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )
        phrase = (completion.choices[0].message.content or "").strip()
    except Exception:
        return None

    return phrase or None
