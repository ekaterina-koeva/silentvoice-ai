# SilentVoice AI

**AI-powered assistive communication platform for people without a reliable voice.**

> Communication is not a privilege. It is a right.

---

## What is SilentVoice AI?

SilentVoice AI uses a standard camera, computer vision, and a large language model to detect eye gaze and turn it into text and spoken output. It runs in the browser and requires no specialist hardware.

The system is designed for people with:

- Autism
- Cerebral palsy
- Stroke recovery
- Voice loss (throat cancer, vocal cord damage)
- Speech impairments
- Any communication difficulty

---

## What SilentVoice AI does NOT do

- It does not read minds
- It does not provide medical diagnosis
- It does not detect emotion or pain
- It is not a medical device

It is a communication support tool.

---

## Features

- Gaze tracking (centre, left, up)
- Dwell-based selection, hold a gaze towards the left edge of the screen for 2 seconds
- Communication cards with predefined phrases
- AI-assisted sentence generation using soft, non-alarming language
- Browser-based text-to-speech, with automatic language detection (Bulgarian / English)
- Carer Mode with communication history
- Emergency communication button with spoken alert and emergency history flag
- Accessibility profiles (General, Autism, Cerebral Palsy, Stroke, Voice Loss)

Selection was originally blink-based, then a held centre gaze. Both caused unintended
activations, because any user reading the screen triggered a card. Selection now
requires a deliberate gaze away from the screen content.

Gaze selection is not yet reliable. Measurement on 23 August 2026 with one user showed
that a rightward gaze cannot be separated from a centred one on a standard webcam, and
that a fixed threshold does not hold between sessions for the same user. Per user
calibration is required before gaze selection can be described as working. Until then
the interface is operated by pointer or touch.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI |
| Vision | MediaPipe Face Mesh (browser) |
| AI | Anthropic Claude API |
| TTS | Web Speech API (browser), pyttsx3 (server) |
| Frontend | HTML + CSS + JavaScript |
| Hosting | Render |

---

## Project Structure

```
silentvoice-ai/
├── main.py
├── requirements.txt              runtime
├── requirements-prototype.txt    local prototype extras
├── requirements-dev.txt          test and audit tooling
├── LICENSE
├── ai/
│   ├── phrase_gen.py
│   └── prompts.py
├── cards/
│   └── phrases.py
├── tts/
│   └── speaker.py
├── vision/
│   ├── face_tracker.py
│   ├── eye_tracker.py         legacy, not used by the browser pipeline
│   ├── blink.py               legacy, not used by the browser pipeline
│   └── head_movement.py       legacy, not loaded by main.py
├── tests/
│   ├── conftest.py
│   └── test_emergency.py
├── docs/
│   └── security/
└── static/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── tracking.js            MediaPipe gaze tracking
    ├── navigation.js          scanning and gaze selection
    └── icons.js               not loaded by index.html
```

---

## Setup

```bash
git clone https://github.com/ekaterina-koeva/silentvoice-ai
cd silentvoice-ai
python -m venv venv
source venv/bin/activate  # macOS / Linux
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

An Anthropic API key is required for AI phrase generation. Set it as an
environment variable before starting the server:

```bash
export ANTHROPIC_API_KEY=your-key-here   # macOS / Linux
# $env:ANTHROPIC_API_KEY="your-key-here" # Windows PowerShell
```

---

## Status

This is an early-stage prototype. It has not undergone clinical validation or
formal usability testing, and should not be used as a primary communication
device in a clinical setting without evaluation by a qualified speech and
language therapist.

---

## Roadmap

- [x] Face tracking
- [x] Gaze tracking
- [x] Communication cards
- [x] AI phrase generation
- [x] Text-to-speech
- [x] Emergency alert button
- [x] Automated tests for the emergency path
- [ ] Per user gaze calibration
- [ ] Icon and colour mode for non-readers
- [ ] Rate limiting on the phrase generation endpoint
- [ ] Continuous integration
- [ ] Offline phrase cache
- [ ] Persistent storage (SQLite)
- [ ] Multi-language support
- [ ] Mobile application
- [ ] Research preprint
- [ ] Clinical and user feedback

---

## Author

Ekaterina Koeva, creator and developer of SilentVoice AI, Sofia, Bulgaria.

---

## Contributing

This is an open project. Feedback from carers, therapists, accessibility
professionals, and people with communication needs is welcome.

Please open an issue on GitHub:
https://github.com/ekaterina-koeva/silentvoice-ai/issues

---

## Licence

Released under the MIT Licence. See [LICENSE](LICENSE) for the full text.
