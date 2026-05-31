
// SilentVoice AI — Gaze navigation layer
// Connects window.SVTracking (gaze + blink) to the communication cards.
// LEFT/RIGHT move the focus highlight; blink selects; UP clears.

(function () {
  let focusIndex = -1;
  let lastGaze = "CENTER";
  let gazeReady = false;

  function cards() {
    return Array.from(document.querySelectorAll(".comm-card"));
  }

  function paintFocus() {
    const cs = cards();
    cs.forEach((c, i) => {
      if (i === focusIndex) c.classList.add("sv-focus");
      else c.classList.remove("sv-focus");
    });
    if (focusIndex >= 0 && cs[focusIndex]) {
      cs[focusIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function moveFocus(step) {
    const cs = cards();
    if (!cs.length) return;
    if (focusIndex < 0) focusIndex = 0;
    else focusIndex = (focusIndex + step + cs.length) % cs.length;
    paintFocus();
  }

  // Called by tracking.js when a long blink fires
  window.onSVSelect = function () {
    const cs = cards();
    if (focusIndex >= 0 && cs[focusIndex]) {
      cs[focusIndex].click();
    }
  };

  function tick() {
    const t = window.SVTracking;
    if (t && t.ready) {
      gazeReady = true;
      const g = t.gaze;
      if (g !== lastGaze) {
        if (g === "RIGHT") moveFocus(1);
        else if (g === "LEFT") moveFocus(-1);
        else if (g === "UP") { focusIndex = -1; paintFocus(); }
        lastGaze = g;
      }
    }
    requestAnimationFrame(tick);
  }

  // Inject focus highlight style
  const style = document.createElement("style");
  style.textContent =
    ".comm-card.sv-focus { outline: 4px solid #38bdf8 !important; " +
    "outline-offset: 2px; box-shadow: 0 0 18px rgba(56,189,248,0.8) !important; " +
    "transform: scale(1.04); transition: all 0.12s ease; }";
  document.head.appendChild(style);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", tick);
  else tick();
})();
