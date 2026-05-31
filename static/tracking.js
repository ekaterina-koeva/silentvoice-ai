// SilentVoice AI — Browser-side MediaPipe tracking
// Reads live video, computes gaze + blink, updates UI, exposes window.SVTracking

(function () {
  const LEFT_IRIS = 468, RIGHT_IRIS = 473;
  const LEFT_T = 0.44, RIGHT_T = 0.56, UP_T = 0.38;
  const SMOOTH = 5, DEBOUNCE = 4;
  const BLINK_EAR = 0.25, BLINK_FRAMES = 10, COOLDOWN = 15;

  let xs = [], ys = [], last = "CENTER", cand = "CENTER", candN = 0;
  let blinkFrames = 0, cooldown = 0;

  window.SVTracking = { gaze: "CENTER", blink: false, ready: false };

  function ear(lm, i) {
    const p1 = lm[i[0]], p2 = lm[i[1]], p3 = lm[i[2]], p4 = lm[i[3]];
    const v = Math.abs(p2.y - p4.y), h = Math.abs(p1.x - p3.x);
    return h === 0 ? 0 : v / h;
  }

  function onResults(res) {
    const badgeG = document.getElementById("gazeStatus");
    const badgeB = document.getElementById("blinkStatus");
    if (!res.multiFaceLandmarks || !res.multiFaceLandmarks.length) {
      if (badgeG) badgeG.textContent = "\u{1F441}\uFE0F Gaze: \u2014";
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

    const le = ear(lm, [159, 145, 33, 133]);
    const re = ear(lm, [386, 374, 362, 263]);
    const avg = (le + re) / 2;
    let fired = false;
    if (cooldown > 0) cooldown--;
    else if (avg < BLINK_EAR) blinkFrames++;
    else {
      if (blinkFrames >= BLINK_FRAMES) { fired = true; cooldown = COOLDOWN; }
      blinkFrames = 0;
    }
    window.SVTracking.blink = fired;
    if (badgeB) badgeB.textContent = fired ? "\u{1F611} Blink: SELECT" : "\u{1F611} Blink: \u2014";
    if (fired && typeof window.onSVSelect === "function") window.onSVSelect();
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
