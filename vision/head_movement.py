class HeadMovementDetector:
    """
    Detects head nod (YES) and head shake (NO).
    Uses nose tip landmark as reference point.
    """

    MOVEMENT_THRESHOLD = 0.015
    NOSE_TIP = 1

    def __init__(self):
        self.prev_y = None
        self.prev_x = None

    def detect(self, landmarks):
        if not landmarks:
            return None

        nose = landmarks.landmark[self.NOSE_TIP]

        if self.prev_y is None:
            self.prev_y = nose.y
            self.prev_x = nose.x
            return None

        dy = nose.y - self.prev_y
        dx = nose.x - self.prev_x

        self.prev_y = nose.y
        self.prev_x = nose.x

        if abs(dy) > self.MOVEMENT_THRESHOLD and abs(dy) > abs(dx):
            if dy < 0:
                return "NOD"

        if abs(dx) > self.MOVEMENT_THRESHOLD and abs(dx) > abs(dy):
            return "SHAKE"

        return None
