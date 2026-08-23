import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime

from cards.phrases import COMMUNICATION_CARDS, PROFILE_NAMES
from ai.phrase_gen import generate_phrase

app = FastAPI(
    title="SilentVoice AI",
    description="AI-powered assistive communication platform",
    version="0.1.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")

communication_history = []
EMERGENCY_PHRASE = "Emergency: please come immediately"

# Limits on the AI phrase generation endpoint. This route spends the Anthropic
# API key and the deployment is public and unauthenticated, so both input size
# and request rate need a ceiling.
#
# The counter lives in process memory. It resets when the server restarts and is
# not shared between workers, so it is a brake on casual abuse rather than a
# security control. Real protection needs authentication and a shared store.
MAX_KEYWORDS = 8
MAX_KEYWORD_LENGTH = 60
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60

_generate_calls: dict[str, list[float]] = {}


def _validate_keywords(keywords: list[str]) -> None:
    if not keywords:
        raise HTTPException(status_code=400, detail="At least one keyword is required.")
    if len(keywords) > MAX_KEYWORDS:
        raise HTTPException(
            status_code=400,
            detail=f"At most {MAX_KEYWORDS} keywords are accepted.",
        )
    for keyword in keywords:
        if len(keyword) > MAX_KEYWORD_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Each keyword must be {MAX_KEYWORD_LENGTH} characters or fewer.",
            )


def _check_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    recent = [t for t in _generate_calls.get(client_ip, []) if t > window_start]
    if len(recent) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many phrase generation requests. Please wait a moment.",
        )
    recent.append(now)
    _generate_calls[client_ip] = recent


class PhraseRequest(BaseModel):
    keywords: list[str]
    profile: str = "general"


class SpeakRequest(BaseModel):
    phrase: str


@app.get("/")
def root():
    return FileResponse("static/index.html")


@app.get("/health")
def health():
    return {"status": "ok", "product": "SilentVoice AI", "version": "0.1.0"}


@app.get("/profiles")
def get_profiles():
    return PROFILE_NAMES


@app.get("/cards/{profile}")
def get_cards(profile: str):
    cards = COMMUNICATION_CARDS.get(profile, COMMUNICATION_CARDS["general"])
    return {"profile": profile, "cards": cards}


@app.post("/generate")
def generate(request: PhraseRequest, http_request: Request):
    _validate_keywords(request.keywords)
    _check_rate_limit(http_request.client.host if http_request.client else "unknown")
    phrase = generate_phrase(request.keywords)
    _save_to_history(phrase, request.profile)
    return {"phrase": phrase, "profile": request.profile}


@app.post("/speak")
def speak(request: SpeakRequest):
    _save_to_history(request.phrase, "speech")
    return {
        "spoken": True,
        "phrase": request.phrase,
        "mode": "browser_speech",
        "note": "Speech output is handled in the browser for cloud deployment."
    }


@app.post("/emergency")
def emergency():
    _save_to_history(EMERGENCY_PHRASE, "emergency", emergency=True)
    return {"phrase": EMERGENCY_PHRASE, "emergency": True}


@app.get("/history")
def get_history():
    return {"history": communication_history}


@app.delete("/history")
def clear_history():
    communication_history.clear()
    return {"cleared": True}


def _save_to_history(phrase: str, profile: str, emergency: bool = False):
    communication_history.append({
        "phrase": phrase,
        "profile": profile,
        "timestamp": datetime.now().isoformat(),
        "emergency": emergency
    })
    if len(communication_history) > 50:
        communication_history.pop(0)
