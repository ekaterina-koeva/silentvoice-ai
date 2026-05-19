class EyeTracker:
    """
    Tracks gaze direction using MediaPipe iris landmarks.

    Returns:
        LEFT   -> user looking left  -> NO
        RIGHT  -> user looking right -> YES
        UP     -> user looking up    -> MENU
        CENTER -> neutral
    """

    LEFT_IRIS = 468
    RIGHT_IRIS = 473

    LEFT_THRESHOLD = 0.40
    RIGHT_THRESHOLD = 0.60
    UP_THRESHOLD = 0.35

    def get_gaze_direction(self, landmarks):
        if not landmarks:
            return "UNKNOWN"

        left_iris = landmarks.landmark[self.LEFT_IRIS]
        right_iris = landmarks.landmark[self.RIGHT_IRIS]

        avg_x = (left_iris.x + right_iris.x) / 2
        avg_y = (left_iris.y + right_iris.y) / 2

        if avg_y < self.UP_THRESHOLD:
            return "UP"
        elif avg_x < self.LEFT_THRESHOLD:
            return "LEFT"
        elif avg_x > self.RIGHT_THRESHOLD:
            return "RIGHT"
        else:
            return "CENTER"
