import os
import sys
from pathlib import Path

# The Anthropic client is constructed at import time in ai/phrase_gen.py.
# Tests never call the provider, but the import must not fail.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
