# SilentVoice AI

**A browser based communication support tool for people who cannot speak and cannot
reliably use their hands.**

---

## What SilentVoice AI is

SilentVoice AI runs in an ordinary web browser and uses a standard webcam. It tracks a
person's gaze and lets them select and speak everyday phrases. It needs no specialist
hardware.

Camera frames are processed on the person's own device. They are not uploaded and they
are not stored.

It is a communication support tool. It helps a person say something they have chosen.

---

## Current status

This is an early stage prototype under active development.

The working interface is not publicly reachable. It sits behind an invitation code and a
password while regulatory preparation continues. Only the public information pages are
open. See Access below.

What is true today:

- Gaze is measured on one shared horizontal axis and classified after per user
  calibration.
- Calibration refuses to enable gaze selection when the measured signal is not clearly
  separable, and there is no threshold inherited from another person.
- A reading that falls between two directions is reported as uncertain and selects
  nothing.
- The calibration profile records the seating position. If the person moves so that it no
  longer describes them, selection pauses and the interface says the position has changed.
- Cards are presented in an automatic scan and selected by a held gaze.
- An assistance control is fixed across the top of the screen, outside the scan, reachable
  by held gaze, by press and hold, and by keyboard or switch. It always asks for
  confirmation and never sends because time ran out.

What has not been established:

- There is no formal usability study, and no recorded accuracy figure for gaze selection.
- The system has not been shown to work for people other than the developer. No
  measurement with another person exists.
- There are no users and no pilot.
- The regulatory classification is not settled. A paid regulatory opinion is pending.

It should not be relied on as a primary communication route, and it should not be used in
a clinical setting without evaluation by a qualified speech and language therapist.

---

## Features

- Gaze tracking on one horizontal axis, calibrated per person
- Per user calibration with quality checks that refuse a poor profile
- Automatic scanning of communication cards, with selection by held gaze
- Selection by pointer or touch, which does not require calibration
- Assistance control reachable by gaze, by press and hold, and by keyboard or switch
- AI assisted phrase generation
- Browser text to speech, with voice selection and a preview
- Session history and export

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python and FastAPI |
| Vision | MediaPipe Face Mesh, in the browser |
| AI | Anthropic Claude API |
| Speech | Web Speech API, in the browser |
| Frontend | HTML, CSS and JavaScript |
| Hosting | Render |
| Tests | pytest, run on every change through GitHub Actions |

---

## Access

The working interface is at `/app` and is closed. Reaching it needs both an invitation
code and a password, supplied as environment variables:

```
SV_INVITATION_CODES     one or more codes, separated by commas
SV_APP_PASSWORD         the password that goes with them
```

Both are required. Several codes may be set so that one can be withdrawn without
affecting the others; withdrawing a code also ends the sessions opened with it. If either
variable is missing, the application closes rather than opening.

The public information pages stay reachable without a code.

---

## Setup

```bash
git clone https://github.com/ekaterina-koeva/silentvoice-ai
cd silentvoice-ai
python -m venv venv
source venv/bin/activate   # macOS and Linux
# venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

An Anthropic API key is needed for phrase generation:

```bash
export ANTHROPIC_API_KEY=your-key-here     # macOS and Linux
# $env:ANTHROPIC_API_KEY="your-key-here"   # Windows PowerShell
```

Set `SV_INVITATION_CODES` and `SV_APP_PASSWORD` in the same way before starting the
server, or the interface will stay closed.

Running the tests:

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

---

## Measuring the gaze axis on a different camera

The interface calibrates itself for each person, so no manual measurement is needed for
ordinary use. The diagnostic pages exist for checking a camera or investigating a defect:

- `/static/axis_measure.html` reports the horizontal axis and records a value for the
  centre and for each side, with no browser console needed.
- `/static/gaze_diag.html` is the fuller diagnostic used to find the axis defect in August
  2026.

Values measured on one camera do not carry over to another. Anyone repeating this work
should measure on their own camera.

---

## Author

Ekaterina Koeva, creator and developer of SilentVoice AI.

---

## Contributing

This is an open project. Feedback from carers, therapists, accessibility professionals and
people with communication needs is welcome.

Please open an issue: https://github.com/ekaterina-koeva/silentvoice-ai/issues

---

## Licence

Released under the MIT Licence. See [LICENSE](LICENSE) for the full text.
