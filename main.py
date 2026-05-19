from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime

from cards.phrases import COMMUNICATION_CARDS, PROFILE_NAMES
from ai.phrase_gen import generate_phrase
from tts.speaker import Speaker

app = FastAPI(
    title="SilentVoice AI",
    description="AI-powered assistive communication platform",
    version="0.1.0"
)

speaker = Speaker()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Communication history for Carer Mode
communication_history = []


# --- Models ---

class PhraseRequest(BaseModel):
    keywords: list[str]
    profile: str = "general"

class SpeakRequest(BaseModel):
    phrase: str


# --- Routes ---

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
def generate(request: PhraseRequest):
    phrase = generate_phrase(request.keywords)
    _save_to_history(phrase, request.profile)
    return {"phrase": phrase, "profile": request.profile}

@app.post("/speak")
def speak(request: SpeakRequest):
    speaker.speak(request.phrase)
    return {"spoken": True, "phrase": request.phrase}

@app.get("/history")
def get_history():
    return {"history": communication_history}

@app.delete("/history")
def clear_history():
    communication_history.clear()
    return {"cleared": True}


# --- Helpers ---

def _save_to_history(phrase: str, profile: str):
    communication_history.append({
        "phrase": phrase,
        "profile": profile,
        "timestamp": datetime.now().isoformat()
    })
    # Keep last 50 entries
    if len(communication_history) > 50:
        communication_history.pop(0)

