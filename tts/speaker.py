import pyttsx3


class Speaker:
    """
    Offline text-to-speech using pyttsx3.
    Uses the system voice engine (Windows SAPI5 / macOS NSSpeech / Linux espeak).
    No internet required.
    """

    def __init__(self, rate: int = 165, volume: float = 1.0):
        self.rate = rate
        self.volume = volume

    def speak(self, phrase: str):
        if not phrase:
            return
        # Re-init engine per call to avoid run-loop lock-ups on repeated use
        engine = pyttsx3.init()
        engine.setProperty("rate", self.rate)
        engine.setProperty("volume", self.volume)
        engine.say(phrase)
        engine.runAndWait()
        engine.stop()
