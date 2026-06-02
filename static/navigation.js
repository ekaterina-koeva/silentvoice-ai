
// SilentVoice AI — Auto-scanning navigation with dwell selection
// Cards highlight one at a time. Looking steadily at the screen (CENTER) for
// DWELL_MS while a card is highlighted selects it. Blink is no longer used,
// which removes accidental selections. Look UP restarts from the first card.

(function () {
  const SCAN_INTERVAL = 3500; // ms each card stays highlighted
  const DWELL_MS = 2000;      // steady gaze needed to confirm selection
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
    paint(0);
  }

  function startScan() {
    if (scanning) return;
    scanning = true;
    if (scanIndex < 0) scanIndex = 0;
    selectedThisCard = false;
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
      if (!scanning) startScan();
      const g = t.gaze;

      // Look UP = restart scanning from the first card
      if (g === "UP" && lastGaze !== "UP") {
        stopScan(); scanIndex = 0; selectedThisCard = false; paint(0); startScan();
      }
      lastGaze = g;

      // Dwell selection: steady CENTER gaze fills a progress ring; at DWELL_MS, select
      if (g === "CENTER" && scanIndex >= 0 && !selectedThisCard) {
        const pct = (t.dwellMs / DWELL_MS) * 100;
        paint(pct);
        if (t.dwellMs >= DWELL_MS) {
          selectedThisCard = true;
          paint(100);
          selectCurrent();
        }
      } else if (g !== "CENTER") {
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
