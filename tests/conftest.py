import base64
import os
import sys
from pathlib import Path

import pytest

# The Anthropic client is constructed at import time in ai/phrase_gen.py.
# Tests never call the provider, but the import must not fail.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")

# Since 25 August 2026 the working interface and its routes are behind a
# password, because the product is under regulatory assessment and the
# deployment is not public. The suite therefore runs with a password
# configured, and the tests that exercise the access control itself remove it
# again.
#
# These two lines assign rather than default on purpose. A developer who exports
# SV_APP_PASSWORD in a terminal to run the server would otherwise have that
# password inherited by pytest, and the suite would pass or fail depending on
# what was typed in the shell beforehand. A test run has to describe the code,
# not the terminal it was started from.
TEST_INVITATION_CODE = "test-invitation-code"
TEST_APP_PASSWORD = "test-password-not-a-real-one"
os.environ["SV_INVITATION_CODES"] = TEST_INVITATION_CODE
os.environ["SV_APP_PASSWORD"] = TEST_APP_PASSWORD
os.environ.pop("SV_DEV_OPEN", None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Credentials for a route that is behind the invitation.

    The invitation code travels as the user name and the password as the
    password. Both are compared in constant time.
    """
    raw = f"{TEST_INVITATION_CODE}:{TEST_APP_PASSWORD}".encode()
    return {"Authorization": "Basic " + base64.b64encode(raw).decode()}
