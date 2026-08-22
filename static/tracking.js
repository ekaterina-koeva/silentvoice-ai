// SilentVoice AI - Browser-side MediaPipe tracking
// Reads live video, computes gaze relative to the eye corners, and exposes
// window.SVTracking with the current direction and how long it has been held.
//
// Iris position is measured against the inner and outer eye corners rather than
// against the video frame, so moving the head no longer reads as moving the eyes.

(function () {
  const LEFT_IRIS = 468, RIGHT_IRIS = 473;

  // Eye corner landmarks used to normalise iris position within each eye.
  const LEFT_OUTER = 33, LEFT_INNER = 133;
  const RIGHT_INNER = 362, RIGHT_OUTER = 263;

  // Ratio of iris position across the eye opening. 0.5 is centred.
  const LEFT_T = 0.54, RIGHT_T = 0.46;

  // Vertical gaze still uses frame position, which is acceptable for a
  // deliberate look-up gesture.
  const UP_T = 0.30;

  const SMOOTH = 5, DEBOUNCE = 4;

  let xs = [], ys = [], last = "CENTER", cand = "CENTER", candN = 0;
  let holdStart = 0;

  window.SVTracking = {
    gaze: "CENTER",
    holdMs: 0,
    ready: false,
    faceVisible: false,

    // Clears the hold timer. Navigation calls this after a selection so the
    // next card cannot inherit an already full timer.
    resetHold: function () {
      holdStart = 0;
      window.SVTracking.holdMs = 0;
    }
  };

  function eyeRatio(lm, iris, outer, inner) {
    const o = lm[outer], i = lm[inner], c = lm[iris];
    const span = i.x - o.x;
    if (Math.abs(span) < 1e-6) return 0.5;
    return (c.x - o.x) / span;
  }

  function onResults(res) {
    const badgeG = document.getElementById("gazeStatus");
    const badgeB = document.getElementById("blinkStatus");

    if (!res.multiFaceLandmarks || !res.multiFaceLandmarks.length) {
      window.SVTracking.faceVisible = false;
      window.SVTracking.gaze = "NONE";
      window.SVTracking.resetHold();
      if (badgeG) badgeG.textContent = "\u{1F441}\uFE0F Gaze: no face";
      if (badgeB) badgeB.textContent = "\u{1F441}\uFE0F Hold: \u2014";
      return;
    }

    const lm = res.multiFaceLandmarks[0];
    window.SVTracking.faceVisible = true;

    // Horizontal: iris position within each eye, averaged across both eyes.
    const lr = eyeRatio(lm, LEFT_IRIS, LEFT_OUTER, LEFT_INNER);
    const rr = eyeRatio(lm, RIGHT_IRIS, RIGHT_OUTER, RIGHT_INNER);
    let ax = (lr + rr) / 2;

    // Vertical: frame position of the iris centres.
    let ay = (lm[LEFT_IRIS].y + lm[RIGHT_IRIS].y) / 2;

    xs.push(ax); ys.push(ay);
    if (xs.length > SMOOTH) { xs.shift(); ys.shift(); }
    ax = xs.reduce((a, b) => a + b) / xs.length;
    ay = ys.reduce((a, b) => a + b) / ys.length;

    let dir = "CENTER";
    if (ay < UP_T) dir = "UP";
    else if (ax > LEFT_T) dir = "LEFT";
    else if (ax < RIGHT_T) dir = "RIGHT";

    if (dir === cand) candN++; else { cand = dir; candN = 1; }
    if (candN >= DEBOUNCE) last = cand;
    window.SVTracking.gaze = last;
    if (badgeG) badgeG.textContent = "\u{1F441}\uFE0F Gaze: " + last;

    // How long the current direction has been held without changing.
    const now = performance.now();
    if (last === cand && candN >= DEBOUNCE) {
      if (holdStart === 0) holdStart = now;
      window.SVTracking.holdMs = now - holdStart;
    } else {
      window.SVTracking.resetHold();
    }

    if (badgeB) {
      const s = (window.SVTracking.holdMs / 1000).toFixed(1);
      badgeB.textContent = "\u{1F441}\uFE0F Hold " + last + ": " + s + "s";
    }
  }

  function start() {
    const video = document.getElementById("videoFeed");
    if (!video || typeof FaceMesh === "undefined") { setTimeout(start, 500); return; }

    const fm = new FaceMesh({
      locateFile: (f) => "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" + f
    });
    fm.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });
    fm.onResults(onResults);

    async function loop() {
      if (video.readyState >= 2) { try { await fm.send({ image: video }); } catch (e) {} }
      requestAnimationFrame(loop);
    }
    window.SVTracking.ready = true;
    loop();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
