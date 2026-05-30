class EyeTracker:
    LEFT_IRIS = 468
    RIGHT_IRIS = 473

    LEFT_THRESHOLD = 0.44
    RIGHT_THRESHOLD = 0.56
    UP_THRESHOLD = 0.38

    SMOOTH_FRAMES = 5
    DEBOUNCE_FRAMES = 4

    def __init__(self):
        self._x_history = []
        self._y_history = []
        self._last_direction = "CENTER"
        self._candidate_direction = "CENTER"
        self._candidate_count = 0

    def get_gaze_direction(self, landmarks):
        if not landmarks:
            return "UNKNOWN"

        left_iris = landmarks.landmark[self.LEFT_IRIS]
        right_iris = landmarks.landmark[self.RIGHT_IRIS]

        raw_x = (left_iris.x + right_iris.x) / 2
        raw_y = (left_iris.y + right_iris.y) / 2

        self._x_history.append(raw_x)
        self._y_history.append(raw_y)

        if len(self._x_history) > self.SMOOTH_FRAMES:
            self._x_history.pop(0)
            self._y_history.pop(0)

        avg_x = sum(self._x_history) / len(self._x_history)
        avg_y = sum(self._y_history) / len(self._y_history)

        if avg_y < self.UP_THRESHOLD:
            new_direction = "UP"
        elif avg_x < self.LEFT_THRESHOLD:
            new_direction = "LEFT"
        elif avg_x > self.RIGHT_THRESHOLD:
            new_direction = "RIGHT"
        else:
            new_direction = "CENTER"

        if new_direction == self._candidate_direction:
            self._candidate_count += 1
        else:
            self._candidate_direction = new_direction
            self._candidate_count = 1

        if self._candidate_count >= self.DEBOUNCE_FRAMES:
            self._last_direction = self._candidate_direction

        return self._last_direction
