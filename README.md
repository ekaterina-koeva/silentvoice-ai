# SilentVoice AI

**AI-powered assistive communication platform for people without a reliable voice.**

> Communication is not a privilege. It is a right.

---

## What is SilentVoice AI?

SilentVoice AI uses a standard camera, computer vision, and a large language model to detect eye gaze, blinks, and head movement — and turns them into text and spoken output, in real time. It runs in the browser and requires no specialist hardware.

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
- It is not NHS-certified

It is a communication support tool.

---

## Features

- Gaze tracking (left / right / centre / up)
- Dwell-based selection — hold a steady centre gaze for 2 seconds to select
- Blink detection (available, not used for selection)
- Head movement (nod = YES, shake = NO)
- Communication cards with predefined phrases
- AI-assisted sentence generation using soft, non-alarming language
- Browser-based text-to-speech, with automatic language detection (Bulgarian / English)
- Carer Mode with communication history
- Accessibility profiles (General, Autism, Cerebral Palsy, Stroke, Voice Loss)

Selection was originally blink-based. It was replaced with dwell-based selection because
blinks caused too many unintended activations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI |
| Vision | MediaPipe Face Mesh (browser) |
| AI | Anthropic Claude API |
| TTS | Web Speech API (browser), pyttsx3 / gTTS (server) |
| Frontend | HTML + CSS + JavaScript |
| Hosting | Render |

---

## Project Structure

```
silentvoice/
├── main.py
├── requirements.txt
├── vision/
│   ├── face_tracker.py
│   ├── eye_tracker.py
│   ├── blink.py
│   └── head_movement.py
├── ai/
│   ├── phrase_gen.py
│   └── prompts.py
├── tts/
│   └── speaker.py
├── cards/
│   └── phrases.py
└── static/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── tracking.js
    ├── navigation.js
    └── icons.js
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
- [x] Blink detection
- [x] Head movement
- [x] Communication cards
- [x] AI phrase generation
- [x] Text-to-speech
- [x] Dwell-based selection
- [ ] Emergency alert button
- [ ] Icon and colour mode for non-readers
- [ ] Offline phrase cache
- [ ] Per-user gaze calibration
- [ ] Persistent storage (SQLite)
- [ ] Multi-language support
- [ ] Mobile application
- [ ] Research preprint
- [ ] Clinical and user feedback

---

## Author

Ekaterina Koeva — independent AI accessibility developer and founder, Sofia, Bulgaria.

---

## Contributing

This is an open project. Feedback from carers, therapists, accessibility
professionals, and people with communication needs is welcome.

Please open an issue on GitHub:
https://github.com/ekaterina-koeva/silentvoice-ai/issues

---

## Licence

Released under the MIT Licence. See [LICENSE](LICENSE) for the full text.
