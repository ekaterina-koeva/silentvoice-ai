// SilentVoice AI — Browser-side MediaPipe tracking
// Reads live video, computes gaze, tracks dwell (steady CENTER gaze), exposes window.SVTracking

(function () {
  const LEFT_IRIS = 468, RIGHT_IRIS = 473;
  const LEFT_T = 0.44, RIGHT_T = 0.56, UP_T = 0.38;
  const SMOOTH = 5, DEBOUNCE = 4;

  let xs = [], ys = [], last = "CENTER", cand = "CENTER", candN = 0;
  let dwellStart = 0;

  window.SVTracking = { gaze: "CENTER", dwellMs: 0, ready: false };

  function onResults(res) {
    const badgeG = document.getElementById("gazeStatus");
    const badgeB = document.getElementById("blinkStatus");
    if (!res.multiFaceLandmarks || !res.multiFaceLandmarks.length) {
      if (badgeG) badgeG.textContent = "\u{1F441}\uFE0F Gaze: \u2014";
      window.SVTracking.dwellMs = 0;
      dwellStart = 0;
      return;
    }
    const lm = res.multiFaceLandmarks[0];

    const li = lm[LEFT_IRIS], ri = lm[RIGHT_IRIS];
    let ax = (li.x + ri.x) / 2, ay = (li.y + ri.y) / 2;
    xs.push(ax); ys.push(ay);
    if (xs.length > SMOOTH) { xs.shift(); ys.shift(); }
    ax = xs.reduce((a, b) => a + b) / xs.length;
    ay = ys.reduce((a, b) => a + b) / ys.length;

    let dir = "CENTER";
    if (ay < UP_T) dir = "UP";
    else if (ax < LEFT_T) dir = "LEFT";
    else if (ax > RIGHT_T) dir = "RIGHT";

    if (dir === cand) candN++; else { cand = dir; candN = 1; }
    if (candN >= DEBOUNCE) last = cand;
    window.SVTracking.gaze = last;
    if (badgeG) badgeG.textContent = "\u{1F441}\uFE0F Gaze: " + last;

    // Dwell: how long has gaze been steady on CENTER (looking at the screen)?
    const now = performance.now();
    if (last === "CENTER") {
      if (dwellStart === 0) dwellStart = now;
      window.SVTracking.dwellMs = now - dwellStart;
    } else {
      dwellStart = 0;
      window.SVTracking.dwellMs = 0;
    }
    if (badgeB) {
      const s = (window.SVTracking.dwellMs / 1000).toFixed(1);
      badgeB.textContent = last === "CENTER"
        ? "\u{1F441}\uFE0F Hold: " + s + "s"
        : "\u{1F441}\uFE0F Hold: \u2014";
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
