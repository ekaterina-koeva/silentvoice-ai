class BlinkDetector:
    """
    Detects long blinks as a selection mechanism.
    A long blink (held for BLINK_DURATION frames) = SELECT action.
    Short blinks are ignored. Cooldown prevents double-selection.
    """

    BLINK_THRESHOLD = 0.25
    BLINK_DURATION = 10
    COOLDOWN_FRAMES = 15

    def __init__(self):
        self.blink_frames = 0
        self.cooldown = 0

    def _eye_aspect_ratio(self, landmarks, indices):
        p1 = landmarks.landmark[indices[0]]
        p2 = landmarks.landmark[indices[1]]
        p3 = landmarks.landmark[indices[2]]
        p4 = landmarks.landmark[indices[3]]

        vertical = abs(p2.y - p4.y)
        horizontal = abs(p1.x - p3.x)

        if horizontal == 0:
            return 0
        return vertical / horizontal

    def detect(self, landmarks):
        if not landmarks:
            return None

        if self.cooldown > 0:
            self.cooldown -= 1
            return None

        left_ear = self._eye_aspect_ratio(landmarks, [159, 145, 33, 133])
        right_ear = self._eye_aspect_ratio(landmarks, [386, 374, 362, 263])
        avg_ear = (left_ear + right_ear) / 2

        if avg_ear < self.BLINK_THRESHOLD:
            self.blink_frames += 1
        else:
            if self.blink_frames >= self.BLINK_DURATION:
                self.blink_frames = 0
                self.cooldown = self.COOLDOWN_FRAMES
                return "LONG_BLINK"
            self.blink_frames = 0

        return None
