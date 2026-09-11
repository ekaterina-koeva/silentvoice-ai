# Partner-Aware Mode, data flow

**Status: design, written before any audio capture code exists.**
**Date: 11 September 2026.**
**Branch: `partner-aware-mode`. Nothing here has been implemented yet.**

This document is written first on purpose. Partner-Aware Mode is the only part of
SilentVoice AI that captures a person other than the one using it, and that person has
not asked for anything. Where a decision has not been taken, this document says so
rather than guessing. Nothing marked TO SELECT, TO VERIFY or TO CONFIRM may be written
as settled anywhere else until it is settled here.

---

## 1. Activation

Partner-Aware is OFF by default.

Listening starts only after an explicit action by the communicator or the assistant.

The browser does not request microphone access on page load.

A visible indicator remains on screen for the whole time the microphone is active.

Listening can be stopped immediately, by the same input methods used everywhere else.

Listening stops by itself after the prompt has been processed. It does not stay open
waiting for more speech.

## 2. The partner has not consented, and that is the central problem

Everything else in SilentVoice AI happens with and for the person using it. This
feature records the voice of somebody else, who may not know it is happening, and who
has given nothing.

That person is a data subject. A visible indicator on a screen they may not be looking
at is not information, and it is not consent.

**What has to exist before real audio is captured from anyone:**

- A short spoken or written notice the assistant gives the partner before the first
  session, saying that speech is captured, transcribed, and sent for processing, and
  by whom.
- A way to use the product with Partner-Aware off, so a partner who declines does not
  take communication away from the person who needs it.
- A statement in the privacy notice covering the partner, not only the communicator.

**Decision needed.** Whether the partner's agreement is recorded, and how. For testing
rounds the partner is a participant like any other and is covered by the participant
information sheet and consent text. For ordinary use later, this is unresolved.

## 3. Audio

Partner speech is held only for the current transcription request.

The application does not add audio to communication history, does not write it to
localStorage, does not write it to a database, and does not intentionally log it.

**Application retention after processing: none.**

**External processor retention: TO BE VERIFIED BEFORE ANY REAL AUDIO IS SENT.**

That second line is not a formality. A claim of zero retention can be designed into
this application. It cannot be asserted about somebody else's service without reading
their terms.

## 4. Transcription

**Speech-to-text provider: NOT YET SELECTED.**

Before integration, each of these is recorded in this document with a source:

- processor name
- processing location
- retention period
- whether content is used for model training
- applicable processor or data terms
- international transfer position

No participant name, profile name, session identifier, communication history or
unrelated phrase is included with the audio.

**On the browser Web Speech API specifically.** Using it is not a neutral or local
choice. In Chrome the audio is sent to the browser vendor's servers, the vendor is the
processor, and the terms are not negotiated. That may still be the right choice for a
prototype, but it is a choice about where a third party's voice goes, and it is
recorded here as one rather than arrived at by default.

## 5. Reply generation

Only the resulting transcript is supplied for reply generation.

**The transcript also leaves the device.** This is a second external transfer, to a
different processor, under different terms from the transcription step. The partner's
words are sent to the reply generation provider. Anywhere this feature is described,
both transfers are named, not just the first.

**Reply generation provider: OpenAI, model `gpt-4o-mini`.**

The application uses the Chat Completions API with `store=False`. The Responses API
was not selected for this path because its application state is retained for thirty
days by default unless a different eligible retention configuration applies.

OpenAI states that API data is not used to train or improve its models by default
unless the customer explicitly opts in. This project has not opted in.

This does not mean zero retention. Under the standard API configuration, abuse
monitoring logs may contain prompts and responses and may be retained for up to
thirty days, subject to OpenAI's applicable legal, safety and service terms. Zero Data
Retention requires separate eligibility and approval and is not enabled for this
project.

The consequence has to be described plainly to a partner: the SilentVoice application
does not store the transcript, but the external reply processor may retain the text
sent to it for up to thirty days under its standard abuse-monitoring process.

The model receives the minimum text needed to propose a reply. It returns no more than
three short candidate replies.

No candidate is spoken automatically.

**Reply generation is kept separate from the existing `generate_phrase()`.** New
function, new prompt, new endpoint, own tests. Two different tasks do not share one
function.

**No inference about the person.** The model proposes replies. It does not infer
emotion, intent, mood, cognitive state or anything else about either person, and
nothing in the prompt asks it to. This is a deliberate regulatory choice already
recorded in the roadmap and it is repeated here because this feature is where the
temptation appears.

### Measured reply controls

Development testing used typed transcripts only. No microphone or real partner speech
was involved.

Early free-generation tests produced unsupported external facts, including invented
appointment times. Separating system and user prompts did not remove that failure
mode. The architecture was therefore changed so that a model first routes the
transcript and unknown external factual questions receive fixed replies rather than a
second generation call.

On the repeated router fixture, 10 cases were run five times each. The measured result
was 50 of 50 expected route classifications with zero differences across those runs.
This is a result for that fixture, not evidence that routing is generally reliable.

A fixed-route control test confirmed that after `UNKNOWN_OPEN_FACT` or `UNCERTAIN` is
selected, no second generation call is made. An `OPEN_REPLY` control case made exactly
two API calls: one router call and one reply-generation call.

Bulgarian generation also exposed a language-control defect. Before the language gate,
one repeated three-case fixture produced 88 Bulgarian candidates out of 89 and one
mixed-script candidate. A deterministic mixed-script and script-level gate was then
added. Its boundary tests passed 9 of 9 cases, and the same three Bulgarian
defect-finding cases subsequently produced 90 of 90 displayed candidates in Bulgarian.

That gate checks script properties, not meaning. It is not a Bulgarian-language
classifier and it cannot reliably distinguish Bulgarian from Russian or Macedonian
text written only with characters that the gate permits.

The controls reduce observed unsupported output. They do not prove that invented facts
or language errors are impossible.

## 6. What the partner might say

A partner may say something about the communicator's health, or about a third person
who is not in the room at all. That content is captured, transcribed, and sent to two
external processors, exactly like anything else they say.

Nothing in the design can prevent this. What the design can do:

- keep the capture window short and tied to one prompt, rather than open
- retain nothing in the application
- state plainly, in the notice given to the partner, that whatever is said during
  listening is sent for processing

**Open question.** Whether transcripts are shown on screen before use, so the
communicator sees what was captured. This helps control and harms nothing, but it puts
the partner's words on a screen the partner may not have expected. Not decided.

## 7. User control

Candidate replies are shown silently.

The communicator selects one using the same input methods as everywhere else: gaze,
touch or pointer, keyboard or switch.

Only a deliberately selected reply may proceed to speech.

The communicator can reject all suggestions and continue with the ordinary
communication cards.

## 8. Storage

| What | Kept where |
| --- | --- |
| Audio | Nowhere in the application |
| Partner transcript | Not added to communication history |
| Candidate replies | Not added to history unless one is selected for communication |
| Selected reply | Enters history exactly like a card selection does |
| Participant name, session identifier | Never attached to any request |

## 9. Failure

If transcription fails, Partner-Aware stops and ordinary communication remains
available.

If reply generation fails, the transcript is discarded and ordinary communication
remains available.

**Loss of either external service must never stop ordinary card communication.** This
is the test that matters most: a person who cannot speak must not lose the ability to
ask for water because a remote service is down.

If the microphone permission is refused or revoked mid-session, Partner-Aware turns
itself off, says so, and the ordinary interface continues.

## 10. The transport header

The backend currently sends `Permissions-Policy: camera=(self), microphone=()`, and the
comment in the code says the microphone is to be opened deliberately when Partner-Aware
arrives.

**It stays closed for now.** The header is changed to `microphone=(self)` in its own
commit, at the point where real capture is connected, and not before. The shell and the
reply generation are built and tested against a development transcript while the
microphone is still closed.

## 11. Regulatory

The project follows Road B and is treated as a medical device in the United Kingdom.
Classification is not confirmed and a paid opinion is targeted for 15 September 2026.

**The opinion has to cover Partner-Aware Mode, not only the product as it stands
today.** A feature that listens to a conversation and proposes what a person should say
is a different thing from a grid of fixed cards, and it may weigh differently. Asking
about it now costs a paragraph in the brief. Asking later costs a second opinion.

Until the opinion arrives, nothing about Partner-Aware claims or denies a
classification, and no named condition appears in any prompt, label or document.

## 12. Outstanding decisions

| Item | State |
| --- | --- |
| Data controller | TO CONFIRM |
| Speech-to-text processor | TO SELECT |
| Processor retention | TO VERIFY |
| Processor location and transfer basis | TO VERIFY |
| Reply generation processor terms for partner speech | OPENAI RECORDED, PARTNER NOTICE TO COMPLETE |
| How the partner is informed | TO WRITE |
| Whether the partner's agreement is recorded, and how | TO DECIDE |
| Whether transcripts are shown before use | TO DECIDE |
| Privacy notice wording, both transfers named | TO COMPLETE BEFORE ROUND 2 |
| Regulatory opinion covers Partner-Aware | TO CONFIRM IN THE BRIEF |

## 13. Build order

1. This document.
2. The shell, with no microphone: mode on and off, a listen control, the visible
   indicator, a place for up to three suggestions, selection by gaze, touch or
   keyboard, cancel, and return to the ordinary cards.
3. Reply generation from a development transcript typed in by hand.
4. Selection of the three suggestions through every input method.
5. The off and fallback test: Partner-Aware off, and each external service unavailable,
   with ordinary communication unaffected in all three cases.
6. Only then, choose the speech-to-text provider, record section 4, open
   `microphone=(self)`, and connect real capture.

`main` stays at `64049c5` throughout. Round 1 continues on the frozen baseline and is
not affected by any of this.
