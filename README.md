# SilentVoice AI

**AI-powered assistive communication platform for people without a reliable voice.**

> Communication is not a privilege. It is a right.

---

## What is SilentVoice AI?

SilentVoice AI uses a camera, artificial intelligence, and computer vision to detect eye movement, facial expressions, head movement, and communication cues — and transforms them into text or spoken voice, in real time.

The system is designed for people with:
- Autism
- Cerebral Palsy
- Stroke Recovery
- Voice Loss (throat cancer, vocal cord damage)
- Speech Impairments
- Any communication difficulty

---

## What SilentVoice AI does NOT do

- It does not read minds
- It does not provide medical diagnosis
- It is not a medical device
- It is not NHS-certified

It is a communication support tool.

---

## Features (MVP)

- Eye tracking (left / right / center)
- Blink detection (long blink = SELECT)
- Head movement (nod = YES, shake = NO)
- Communication cards with predefined phrases
- AI-assisted sentence generation (soft language)
- Real-time text-to-speech output
- Carer Mode with communication history
- Accessibility profiles (Autism, Cerebral Palsy, Stroke, Voice Loss)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI |
| Vision | OpenCV + MediaPipe |
| AI | Anthropic Claude API |
| TTS | pyttsx3 / gTTS |
| Frontend | HTML + CSS + JavaScript |
| Database | SQLite |
| Hosting | Railway / Render |

---

## Project Structure

```
silentvoice/
├── main.py
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
├── static/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── requirements.txt
```

---

## Setup

```bash
git clone https://github.com/yourusername/silentvoice-ai
cd silentvoice
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Roadmap

- [x] Face tracking
- [x] Eye tracking
- [x] Blink detection
- [x] Head movement
- [x] Communication cards
- [x] AI phrase generation
- [x] Text-to-speech
- [ ] Mobile version (Flutter)
- [ ] arXiv research preprint
- [ ] NHS pilot feedback

---

## Mission

SilentVoice AI is built by an independent AI accessibility founder with one goal:

**To make communication more accessible, more human, and more independent — through AI and accessible technology.**

---

## Contributing

This is an open project. Feedback from carers, therapists, accessibility professionals, and people with communication needs is welcome.

Open an issue or reach out via LinkedIn.

---

## License

MIT License
