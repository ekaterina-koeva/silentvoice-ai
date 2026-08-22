// SilentVoice AI - Auto-scanning navigation with deliberate gaze selection
//
// Cards highlight one at a time. Selection requires a deliberate RIGHT gaze
// held for DWELL_MS. Looking at the screen normally (CENTER) never selects
// anything, so a user reading the screen cannot trigger a card by accident.
//
// LEFT cancels the current selection attempt and moves to the next card.
// UP restarts scanning from the first card.
//
// The emergency button is deliberately excluded from gaze scanning. An
// emergency signal must be an explicit act, never something a scan can reach.

(function () {
  const SCAN_INTERVAL = 3500; // ms each card stays highlighted
  const DWELL_MS = 2000;      // held RIGHT gaze needed to confirm selection

  let scanIndex = -1;
  let scanning = false;
  let timer = null;
  let lastGaze = "CENTER";
  let selectedThisCard = false;

  function cards() {
    return Array.from(document.querySelectorAll(".comm-card"));
  }

  function paint(progress) {
    const cs = cards();
    cs.forEach((c, i) => {
      if (i === scanIndex) c.classList.add("sv-focus");
      else { c.classList.remove("sv-focus"); c.style.removeProperty("--sv-fill"); }
    });
    if (scanIndex >= 0 && cs[scanIndex]) {
      const pct = Math.max(0, Math.min(100, progress || 0));
      cs[scanIndex].style.setProperty("--sv-fill", pct + "%");
    }
  }

  function step() {
    const cs = cards();
    if (!cs.length) return;
    scanIndex = (scanIndex + 1) % cs.length;
    selectedThisCard = false;
    resetHold();
    paint(0);
  }

  function resetHold() {
    const t = window.SVTracking;
    if (t && typeof t.resetHold === "function") t.resetHold();
  }

  function startScan() {
    if (scanning) return;
    scanning = true;
    if (scanIndex < 0) scanIndex = 0;
    selectedThisCard = false;
    resetHold();
    paint(0);
    timer = setInterval(step, SCAN_INTERVAL);
  }

  function stopScan() {
    scanning = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function selectCurrent() {
    const cs = cards();
    if (scanIndex >= 0 && cs[scanIndex]) cs[scanIndex].click();
  }

  function tick() {
    const t = window.SVTracking;

    if (t && t.ready) {
      // Pause scanning when no face is visible. Nothing should advance or
      // select while the camera cannot see the user.
      if (t.faceVisible === false) {
        stopScan();
        paint(0);
        lastGaze = "NONE";
        requestAnimationFrame(tick);
        return;
      }

      if (!scanning) startScan();
      const g = t.gaze;

      // UP restarts scanning from the first card.
      if (g === "UP" && lastGaze !== "UP") {
        stopScan();
        scanIndex = 0;
        selectedThisCard = false;
        resetHold();
        paint(0);
        startScan();
        lastGaze = g;
        requestAnimationFrame(tick);
        return;
      }

      // LEFT cancels this card and moves on, giving the user a way out.
      if (g === "LEFT" && lastGaze !== "LEFT") {
        selectedThisCard = true;
        resetHold();
        paint(0);
        step();
        lastGaze = g;
        requestAnimationFrame(tick);
        return;
      }

      lastGaze = g;

      // Selection requires a deliberate, held RIGHT gaze.
      if (g === "RIGHT" && scanIndex >= 0 && !selectedThisCard) {
        const pct = (t.holdMs / DWELL_MS) * 100;
        paint(pct);
        if (t.holdMs >= DWELL_MS) {
          selectedThisCard = true;
          paint(100);
          resetHold();
          selectCurrent();
        }
      } else if (g !== "RIGHT") {
        paint(0);
      }
    }

    requestAnimationFrame(tick);
  }

  const style = document.createElement("style");
  style.textContent =
    ".comm-card.sv-focus { position: relative; outline: 5px solid #38bdf8 !important; " +
    "outline-offset: 2px; box-shadow: 0 0 26px rgba(56,189,248,0.95) !important; " +
    "transform: scale(1.05); transition: outline 0.15s ease; } " +
    ".comm-card.sv-focus::after { content: ''; position: absolute; left: 0; bottom: 0; " +
    "height: 7px; width: var(--sv-fill, 0%); background: #22c55e; " +
    "border-bottom-left-radius: 10px; transition: width 0.1s linear; }";
  document.head.appendChild(style);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", tick);
  else tick();
})();
