import pyttsx3


class Speaker:
    """
    Text-to-speech engine for SilentVoice AI.
    Uses pyttsx3 for offline TTS.
    """

    def __init__(self):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 145)
        self.engine.setProperty('volume', 1.0)
        voices = self.engine.getProperty('voices')
        if voices and len(voices) > 1:
            self.engine.setProperty('voice', voices[1].id)

    def speak(self, text: str):
        self.engine.say(text)
        self.engine.runAndWait()

    def set_rate(self, rate: int):
        self.engine.setProperty('rate', rate)
