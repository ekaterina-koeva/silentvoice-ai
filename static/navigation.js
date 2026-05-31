
// SilentVoice AI — Auto-scanning navigation
// Cards highlight one at a time on a timer. Blink selects the highlighted card.
// Look UP to restart scanning from the first card. Hands-free (ALS, stroke, CP).

(function () {
  const SCAN_INTERVAL = 3500; // ms each card stays highlighted (calmer pace)
  let scanIndex = -1;
  let scanning = false;
  let timer = null;
  let lastGaze = "CENTER";

  function cards() {
    return Array.from(document.querySelectorAll(".comm-card"));
  }

  function paint() {
    const cs = cards();
    cs.forEach((c, i) => {
      if (i === scanIndex) c.classList.add("sv-focus");
      else c.classList.remove("sv-focus");
    });
    // No forced scrollIntoView — lets the user read freely without being yanked.
  }

  function step() {
    const cs = cards();
    if (!cs.length) return;
    scanIndex = (scanIndex + 1) % cs.length;
    paint();
  }

  function startScan() {
    if (scanning) return;
    scanning = true;
    if (scanIndex < 0) scanIndex = 0;
    paint();
    timer = setInterval(step, SCAN_INTERVAL);
  }

  function stopScan() {
    scanning = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  window.onSVSelect = function () {
    const cs = cards();
    if (scanIndex >= 0 && cs[scanIndex]) {
      cs[scanIndex].click();
    }
  };

  function tick() {
    const t = window.SVTracking;
    if (t && t.ready) {
      if (!scanning) startScan();
      const g = t.gaze;
      if (g !== lastGaze) {
        if (g === "UP") { stopScan(); scanIndex = 0; paint(); startScan(); }
        lastGaze = g;
      }
    }
    requestAnimationFrame(tick);
  }

  const style = document.createElement("style");
  style.textContent =
    ".comm-card.sv-focus { outline: 5px solid #38bdf8 !important; " +
    "outline-offset: 2px; box-shadow: 0 0 26px rgba(56,189,248,0.95) !important; " +
    "transform: scale(1.05); transition: all 0.18s ease; }";
  document.head.appendChild(style);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", tick);
  else tick();
})();
