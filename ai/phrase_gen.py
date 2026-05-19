import anthropic
from ai.prompts import PHRASE_GENERATION_PROMPT

client = anthropic.Anthropic()


def generate_phrase(keywords: list[str]) -> str:
    """
    Takes a list of selected keywords and generates
    a soft, human assistive communication phrase.
    """
    if not keywords:
        return "I need help."

    keywords_str = ", ".join(keywords)
    prompt = PHRASE_GENERATION_PROMPT.format(keywords=keywords_str)

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

    return message.content[0].text.strip()
