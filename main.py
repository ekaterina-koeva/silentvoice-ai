import base64
import hashlib
import hmac
import os
import secrets
import smtplib
import time
from email.message import EmailMessage
from pathlib import Path

from fastapi import Depends, FastAPI, Form, HTTPException, Request, Response, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from pydantic import BaseModel

from cards.phrases import COMMUNICATION_CARDS, PROFILE_NAMES
from ai.phrase_gen import generate_phrase

# Access control.
#
# On 25 August 2026 the decision was taken to take SilentVoice AI down the
# regulatory route as a medical device in the United Kingdom. Whether a public
# deployment of an unregistered device counts as placing it on the market is a
# question for the paid regulatory opinion, so until that opinion arrives the
# working interface is not publicly reachable.
#
# The landing page stays public. It describes the product, the person who builds
# it and the current regulatory status, and it contains nothing interactive.
#
# Entry is by invitation code. Several codes can be configured, separated by
# commas, so that a code given to one person can be withdrawn without disturbing
# anybody else.
#
# The default is closed. With no code configured nobody gets in, because a
# deployment that loses its environment variable must not quietly open itself to
# the world. SV_DEV_OPEN exists for working on a laptop and is never set on the
# deployment.
INVITE_ENV = "SV_INVITATION_CODES"
INVITE_ENV_SINGULAR = "SV_INVITATION_CODE"
PASSWORD_ENV = "SV_APP_PASSWORD"
DEV_OPEN_ENV = "SV_DEV_OPEN"

SESSION_COOKIE = "sv_session"
SESSION_HOURS = 12

# The contact form. What a visitor writes is sent straight on as an email and is
# not stored anywhere on this server. The address it goes to is never shown on
# the page, so it cannot be harvested from it.
SMTP_HOST_ENV = "SV_SMTP_HOST"
SMTP_PORT_ENV = "SV_SMTP_PORT"
SMTP_USER_ENV = "SV_SMTP_USER"
SMTP_PASSWORD_ENV = "SV_SMTP_PASSWORD"
CONTACT_TO_ENV = "SV_CONTACT_TO"

# The alert has its own recipient, separate from the contact form. The person
# who comes when help is asked for is not the person who answers enquiries.
# Several addresses may be given, separated by commas.
ALERT_TO_ENV = "SV_ALERT_TO"

MAX_MESSAGES = 5
MESSAGE_WINDOW_SECONDS = 3600
MAX_MESSAGE_LENGTH = 4000
MAX_NAME_LENGTH = 120

_messages_sent: dict[str, list[float]] = {}

APP_DIR = Path(__file__).resolve().parent / "app"
PAGES_DIR = Path(__file__).resolve().parent / "pages"

# The public pages. Each one is a body fragment; the header and the footer are
# shared, so the navigation exists in one place rather than in eight.
PAGE_TITLES = {
    "home": "SilentVoice AI",
    "how-it-works": "How it works, SilentVoice AI",
    "who-it-is-for": "Who it is for, SilentVoice AI",
    "status": "Current status, SilentVoice AI",
    "roadmap": "Roadmap, SilentVoice AI",
    "about": "Who builds it, SilentVoice AI",
    "questions": "Questions, SilentVoice AI",
    "contact": "Contact, SilentVoice AI",
}


def _dev_open() -> bool:
    return os.environ.get(DEV_OPEN_ENV) == "1"


def _codes() -> list[str]:
    raw = os.environ.get(INVITE_ENV) or os.environ.get(INVITE_ENV_SINGULAR) or ""
    return [c.strip() for c in raw.split(",") if c.strip()]


def _password() -> str:
    return os.environ.get(PASSWORD_ENV, "")


def _configured() -> bool:
    """Both halves have to exist. One without the other lets nobody in."""
    return bool(_codes()) and bool(_password())


def _code_accepted(candidate: str) -> bool:
    """Constant time comparison against every configured code."""
    accepted = False
    for code in _codes():
        if secrets.compare_digest(candidate, code):
            accepted = True
    return accepted


def _credentials_accepted(code: str, password: str) -> bool:
    """An invitation code and the password. Both, or nothing.

    The code says who was invited and can be withdrawn on its own. The password
    is shared by everyone who has been invited. Neither is an account: real
    accounts arrive with the database, and this is the smallest thing that keeps
    the prototype closed in the meantime.
    """
    code_ok = _code_accepted(code)
    password_ok = bool(_password()) and secrets.compare_digest(password, _password())
    return code_ok and password_ok


# The session cookie is signed with a key derived from the configured codes.
# Withdrawing a code therefore ends every session that was opened with it, and
# there is no separate secret to lose.
def _signing_key() -> bytes:
    material = "|".join(_codes()) + "::" + _password()
    return hashlib.sha256(material.encode()).digest()


def _make_session(now: float | None = None) -> str:
    expires = int((now if now is not None else time.time()) + SESSION_HOURS * 3600)
    body = str(expires).encode()
    mac = hmac.new(_signing_key(), body, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(body).decode() + "." + base64.urlsafe_b64encode(mac).decode()


def _session_valid(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    body_raw, mac_raw = token.split(".", 1)
    try:
        body = base64.urlsafe_b64decode(body_raw.encode())
        mac = base64.urlsafe_b64decode(mac_raw.encode())
    except Exception:
        return False
    expected = hmac.new(_signing_key(), body, hashlib.sha256).digest()
    if not hmac.compare_digest(mac, expected):
        return False
    try:
        return int(body.decode()) > time.time()
    except ValueError:
        return False


# The API documentation describes every route to anyone who asks for it. It is
# useful while developing and it has no place on a deployment whose interface is
# deliberately closed.
_docs_enabled = _dev_open()

app = FastAPI(
    title="SilentVoice AI",
    description="Assistive communication prototype under regulatory assessment",
    version="0.1.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# Only the assets are served from here. The interface itself lives outside this
# directory, because a mounted directory is public by definition and a code on a
# route means nothing while the same file can be fetched directly.
app.mount("/static", StaticFiles(directory="static"), name="static")

# Basic authentication is accepted so that a script or a test can reach the API
# without a browser. It is never used to challenge, because a challenge makes
# the browser show its own grey dialog on top of the interface.
security = HTTPBasic(auto_error=False)

# Failed attempts are counted per address. A shared code invites automated
# guessing, and the counter turns an unlimited guessing rate into a slow one. It
# lives in process memory, resets on restart and is not shared between workers,
# so it is a brake and not a security control.
MAX_AUTH_FAILURES = 10
AUTH_FAILURE_WINDOW_SECONDS = 900

_auth_failures: dict[str, list[float]] = {}


def _client_address(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _record_auth_failure(address: str) -> None:
    now = time.monotonic()
    window_start = now - AUTH_FAILURE_WINDOW_SECONDS
    recent = [t for t in _auth_failures.get(address, []) if t > window_start]
    recent.append(now)
    _auth_failures[address] = recent


def _attempts_exhausted(address: str) -> bool:
    now = time.monotonic()
    window_start = now - AUTH_FAILURE_WINDOW_SECONDS
    recent = [t for t in _auth_failures.get(address, []) if t > window_start]
    _auth_failures[address] = recent
    return len(recent) >= MAX_AUTH_FAILURES


def _has_access(request: Request, credentials: HTTPBasicCredentials | None) -> bool:
    if _dev_open():
        return True
    if not _configured():
        return False
    if _session_valid(request.cookies.get(SESSION_COOKIE)):
        return True
    # A script or a test can send the code as the user name and the password as
    # the password. The browser is never challenged this way.
    if credentials is not None and _credentials_accepted(credentials.username, credentials.password):
        return True
    return False


def require_access(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(security),
) -> None:
    """Allows the request through, or refuses it with a reason.

    A deployment with no invitation code configured is closed for everybody,
    including someone holding a code, because there is no code to hold.
    """
    if _dev_open():
        return

    if not _configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The SilentVoice AI prototype is not available. Access is "
                "restricted while the product is under regulatory assessment."
            ),
        )

    if _attempts_exhausted(_client_address(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please wait and try again.",
        )

    if not _has_access(request, credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access to the prototype is by invitation.",
        )


# Session history is held in the browser and is not sent to the server.
#
# A single module level list was previously shared by every visitor to the
# deployment, and GET /history returned it to anyone who asked. On a public
# deployment that exposed one persons communication to every other visitor.
# The interface never read it back, so removing it cost nothing.
#
# The help request below speaks aloud on the device and notifies nobody. This
# route records nothing and sends nothing. It is kept only so the interface does
# not change behaviour, and it is to be replaced by a real assistance alert with
# a confirmed recipient, a delivery status and an acknowledgement.
EMERGENCY_PHRASE = "Emergency: please come immediately"

# Limits on the AI phrase generation endpoint. This route spends the Anthropic
# API key, so both input size and request rate need a ceiling. The invitation
# code is not the limit: an invited person can still exhaust the key.
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


# ---- public ---------------------------------------------------------------


def _render(page: str, message: str = "", bad: bool = False) -> HTMLResponse:
    header = (PAGES_DIR / "_header.html").read_text(encoding="utf-8")
    footer = (PAGES_DIR / "_footer.html").read_text(encoding="utf-8")
    body = (PAGES_DIR / f"{page}.html").read_text(encoding="utf-8")

    header = header.replace("<!--TITLE-->", PAGE_TITLES.get(page, "SilentVoice AI"))
    # The page a reader is on is marked in the navigation, so it is possible to
    # tell where you are without reading the address bar.
    header = header.replace(
        f'data-page="{page}"', f'data-page="{page}" aria-current="page"'
    )

    block = ""
    if message:
        css = "said bad" if bad else "said"
        block = f'<p class="{css}" role="status">{message}</p>'
    body = body.replace("<!--CONTACT-MESSAGE-->", block)

    return HTMLResponse(header + body + footer)


def _landing(message: str = "", bad: bool = False) -> HTMLResponse:
    """The contact form lives on its own page, and answers there."""
    return _render("contact", message, bad)


@app.get("/")
def root():
    return _render("home")


@app.get("/how-it-works")
def page_how():
    return _render("how-it-works")


@app.get("/who-it-is-for")
def page_who():
    return _render("who-it-is-for")


@app.get("/status")
def page_status():
    return _render("status")


@app.get("/roadmap")
def page_roadmap():
    return _render("roadmap")


@app.get("/about")
def page_about():
    return _render("about")


@app.get("/questions")
def page_questions():
    return _render("questions")


@app.get("/contact")
def page_contact():
    return _render("contact")


def _contact_configured() -> bool:
    return bool(os.environ.get(SMTP_HOST_ENV) and os.environ.get(CONTACT_TO_ENV))


def _send_message(name: str, email: str, message: str) -> None:
    """Sends the message on. Raises if it cannot.

    Nothing is written to disk. The visitor address becomes the reply address,
    so answering is one click and no address book is kept here.
    """
    note = EmailMessage()
    note["Subject"] = f"SilentVoice AI: message from {name}"
    note["From"] = os.environ.get(SMTP_USER_ENV, os.environ[CONTACT_TO_ENV])
    note["To"] = os.environ[CONTACT_TO_ENV]
    note["Reply-To"] = email
    note.set_content(
        f"Name: {name}\nEmail: {email}\n\n{message}\n\n"
        "Sent from the contact form on the SilentVoice AI page."
    )

    host = os.environ[SMTP_HOST_ENV]
    port = int(os.environ.get(SMTP_PORT_ENV, "587"))
    user = os.environ.get(SMTP_USER_ENV)
    password = os.environ.get(SMTP_PASSWORD_ENV)

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.starttls()
        if user and password:
            server.login(user, password)
        server.send_message(note)


@app.post("/contact", response_class=HTMLResponse)
def contact(
    request: Request,
    name: str = Form(""),
    email: str = Form(""),
    message: str = Form(""),
    website: str = Form(""),
):
    # The honeypot field is invisible to a person and irresistible to a robot.
    # A filled one is answered exactly like a real message, so the robot learns
    # nothing from the difference.
    if website.strip():
        return _landing("Thank you. Your message has been sent.")

    if not _contact_configured():
        return _landing(
            "The contact form is not available at the moment. Please try again later.",
            bad=True,
        )

    address = _client_address(request)
    now = time.monotonic()
    recent = [t for t in _messages_sent.get(address, []) if t > now - MESSAGE_WINDOW_SECONDS]
    if len(recent) >= MAX_MESSAGES:
        return _landing(
            "Several messages have already been sent from this connection. "
            "Please wait an hour before sending another.",
            bad=True,
        )

    name = name.strip()[:MAX_NAME_LENGTH]
    email = email.strip()[:MAX_NAME_LENGTH]
    message = message.strip()[:MAX_MESSAGE_LENGTH]

    if not name or not email or not message:
        return _landing("Please fill in your name, your email address and a message.", bad=True)

    try:
        _send_message(name, email, message)
    except Exception:
        # The reason is not shown to the visitor. It would say more about the
        # server than about their message.
        return _landing(
            "The message could not be sent just now. Please try again later.",
            bad=True,
        )

    recent.append(now)
    _messages_sent[address] = recent
    return _landing("Thank you. Your message has been sent, and you will get a reply by email.")


@app.get("/robots.txt")
def robots():
    return FileResponse("static/robots.txt")


@app.get("/health")
def health():
    return {"status": "ok", "product": "SilentVoice AI", "version": "0.1.0"}


# ---- the way in -----------------------------------------------------------


def _sign_in_page(message: str = "", disabled: bool = False) -> HTMLResponse:
    html = (APP_DIR / "signin.html").read_text(encoding="utf-8")
    block = f'<p class="error" role="alert">{message}</p>' if message else ""
    html = html.replace("<!--MESSAGE-->", block)
    if disabled:
        html = html.replace('name="code"', 'name="code" disabled')
        html = html.replace('name="password"', 'name="password" disabled')
    return HTMLResponse(html)


@app.get("/sign-in", response_class=HTMLResponse)
def sign_in_page(request: Request):
    if _dev_open() or _session_valid(request.cookies.get(SESSION_COOKIE)):
        return RedirectResponse("/app", status_code=status.HTTP_303_SEE_OTHER)
    if not _configured():
        return _sign_in_page(
            "The prototype is not available at the moment. Access is restricted "
            "while the product is under regulatory assessment.",
            disabled=True,
        )
    return _sign_in_page()


@app.post("/sign-in", response_class=HTMLResponse)
def sign_in(request: Request, code: str = Form(""), password: str = Form("")):
    address = _client_address(request)

    if not _configured():
        return _sign_in_page(
            "The prototype is not available at the moment. Access is restricted "
            "while the product is under regulatory assessment.",
            disabled=True,
        )

    if _attempts_exhausted(address):
        return _sign_in_page(
            "Too many attempts have been made from this connection. "
            "Please wait fifteen minutes and try again."
        )

    if not _credentials_accepted(code, password):
        _record_auth_failure(address)
        # The message does not say which of the two was wrong. Saying so would
        # tell a guesser which half to keep.
        return _sign_in_page("That invitation code and password were not recognised.")

    response = RedirectResponse("/app", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        SESSION_COOKIE,
        _make_session(),
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        path="/",
    )
    return response


@app.get("/sign-out")
def sign_out():
    response = RedirectResponse("/", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


# ---- the interface and its routes -----------------------------------------


@app.get("/app")
def application(request: Request):
    """The working interface. Not public while the assessment is in progress."""
    if _dev_open() or _session_valid(request.cookies.get(SESSION_COOKIE)):
        return FileResponse("app/index.html")
    return RedirectResponse("/sign-in", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/profiles", dependencies=[Depends(require_access)])
def get_profiles():
    return PROFILE_NAMES


@app.get("/cards/{profile}", dependencies=[Depends(require_access)])
def get_cards(profile: str):
    cards = COMMUNICATION_CARDS.get(profile, COMMUNICATION_CARDS["general"])
    return {"profile": profile, "cards": cards}


@app.post("/generate", dependencies=[Depends(require_access)])
def generate(request: PhraseRequest, http_request: Request):
    _validate_keywords(request.keywords)
    _check_rate_limit(_client_address(http_request))
    phrase = generate_phrase(request.keywords)
    return {"phrase": phrase, "profile": request.profile}


@app.post("/speak", dependencies=[Depends(require_access)])
def speak(request: SpeakRequest):
    return {
        "spoken": True,
        "phrase": request.phrase,
        "mode": "browser_speech",
        "note": "Speech output is handled in the browser for cloud deployment."
    }


def _alert_recipients() -> list:
    """The addresses set up to receive a request for help."""
    raw = os.environ.get(ALERT_TO_ENV, "")
    return [a.strip() for a in raw.split(",") if a.strip()]


def _alert_body(when: str) -> str:
    """The text a recipient reads.

    It says what was asked for, when, and what this is not. It says nothing
    about why, because the interface has no way of knowing why and must not
    invent one.
    """
    return (
        f"A request for assistance was sent from a SilentVoice AI communication "
        f"interface at {when}.\n\n"
        f"The person selected: {EMERGENCY_PHRASE}\n\n"
        "This comes from a communication support interface. It is not an emergency "
        "service, and no emergency service has been contacted. If you cannot go to "
        "the person yourself, please telephone someone who can.\n"
    )


def _deliver(note: EmailMessage) -> None:
    """Hands the message to the mail server. Separated so it can be replaced.

    Kept apart from the route so that the tests can stand in for it, and so that
    moving from one sending service to another touches this function and nothing
    else.
    """
    host = os.environ[SMTP_HOST_ENV]
    port = int(os.environ.get(SMTP_PORT_ENV, "587"))
    user = os.environ.get(SMTP_USER_ENV)
    password = os.environ.get(SMTP_PASSWORD_ENV)

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls()
        if user and password:
            server.login(user, password)
        server.send_message(note)


@app.post("/emergency", dependencies=[Depends(require_access)])
def emergency():
    """Sends a request for assistance to the addresses in SV_ALERT_TO.

    The phrase comes back whatever happens, because the interface speaks it
    aloud on the device and that part needs no network. What the response must
    never do is suggest that somebody was told when nobody was, so delivery is
    reported as it actually went, and the interface says so on screen.

    Nothing about the request is written down here. There is no acknowledgement
    yet: confirming that a person read it needs somewhere to keep that fact, and
    an alert that forgets it was acknowledged is worse than one that never
    claimed it could remember.
    """
    # time is already imported for the contact form limiter. Reaching for
    # datetime here would add an import for the sake of one line.
    when = time.strftime("%H:%M UTC on %d %B %Y", time.gmtime())
    recipients = _alert_recipients()

    if not recipients or not os.environ.get(SMTP_HOST_ENV):
        return {
            "phrase": EMERGENCY_PHRASE,
            "emergency": True,
            "delivered": False,
            "recipients": 0,
            "reason": "not_configured",
            "at": when,
        }

    note = EmailMessage()
    note["Subject"] = "SilentVoice AI: a request for assistance"
    note["From"] = os.environ.get(SMTP_USER_ENV, recipients[0])
    note["To"] = ", ".join(recipients)
    note.set_content(_alert_body(when))

    try:
        _deliver(note)
    except Exception:
        return {
            "phrase": EMERGENCY_PHRASE,
            "emergency": True,
            "delivered": False,
            "recipients": 0,
            "reason": "send_failed",
            "at": when,
        }

    return {
        "phrase": EMERGENCY_PHRASE,
        "emergency": True,
        "delivered": True,
        "recipients": len(recipients),
        "reason": None,
        "at": when,
    }
