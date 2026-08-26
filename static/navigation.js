// SilentVoice AI - Auto-scanning navigation with deliberate gaze selection
//
// Cards highlight one at a time. Selection requires a deliberate gaze towards
// one side of the screen, held for DWELL_MS. Which side that is comes from the
// calibration profile, because the side that separates best from a neutral gaze
// is different for different people and cameras.
//
// The other calibrated side moves to the next card, after a shorter hold. The
// gaze has to return towards the middle before it can move again, so one hold
// moves one card and a long look cannot run through the whole set. Every manual
// move restarts the scan timer, so a card cannot change underneath a person who
// is still deciding.
//
// Without a calibration profile the tracker reports UNCALIBRATED, no direction
// is ever reported, and nothing here can select anything. That is deliberate.
// The interface is then operated by touch or pointer.
//
// A reading that falls between two calibrated directions is reported as UNSURE.
// UNSURE never selects and never advances the hold timer. For a tool that
// speaks on behalf of a person, deciding nothing is the correct answer to an
// uncertain signal.
//
// The alert is deliberately excluded from card scanning. An alert must be an
// explicit act, never something a scan can walk into. It is reached instead by
// keeping the gaze on the side that moves between cards, for ARM_MS after the
// move has already happened. Past the move, that hold did nothing at all, so
// the gesture takes a part of the input that was previously dead and collides
// with nothing that exists. Arming only opens the confirmation in alert.js.
// Nothing is sent from this file.

(function () {
  const SCAN_INTERVAL = 3500; // ms each card stays highlighted
  const DWELL_MS = 2000;      // held gaze needed to confirm a selection
  const ADVANCE_MS = 700;     // held gaze needed to move to the next card
  const ARM_MS = 2000;        // further hold, after the move, that arms the alert

  let scanIndex = -1;
  let scanning = false;
  let timer = null;
  let selectedThisCard = false;
  let movedThisHold = false;
  let armedThisHold = false;
  let holding = false;

  function cards() {
    return Array.from(document.querySelectorAll(".comm-card"));
  }

  function alertOpen() {
    return !!(window.SVAlert && window.SVAlert.open);
  }

  // How far through the arming hold the person is. Without this the hold counts
  // silently and there is no way to tell it is happening at all, which is
  // indistinguishable from it not working. Reported on 26 August 2026.
  function armProgress(pct) {
    if (window.SVAlert && typeof window.SVAlert.progress === "function") {
      window.SVAlert.progress(pct);
    }
  }

  function selectSide() {
    const t = window.SVTracking;
    return (t && t.selectDirection) ? t.selectDirection : null;
  }

  function moveSide() {
    const s = selectSide();
    if (!s) return null;
    return s === "LEFT" ? "RIGHT" : "LEFT";
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

  // While a selection is being held, the scan must not move the card. Without
  // this, the highlight walks on to the next card in the middle of the hold and
  // the person selects something they were not looking at. Reported on 25
  // August 2026 and fixed the same day.
  function pauseScan() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function resumeScan() {
    if (scanning && !timer) timer = setInterval(step, SCAN_INTERVAL);
  }

  // A move the person asked for. The scan timer restarts so that the card does
  // not change again a moment later on its own.
  function moveNow() {
    step();
    if (scanning && timer) {
      clearInterval(timer);
      timer = setInterval(step, SCAN_INTERVAL);
    }
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
    holding = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function selectCurrent() {
    const cs = cards();
    if (scanIndex >= 0 && cs[scanIndex]) cs[scanIndex].click();
  }

  function tick() {
    const t = window.SVTracking;

    // While the alert confirmation is open it owns the gaze. Cards must not
    // scan, highlight or select behind it.
    if (alertOpen()) {
      pauseScan();
      paint(0);
      holding = false;
      requestAnimationFrame(tick);
      return;
    }

    if (t && t.ready) {
      // Pause scanning when no face is visible. Nothing should advance or
      // select while the camera cannot see the user.
      if (t.faceVisible === false) {
        stopScan();
        paint(0);
        requestAnimationFrame(tick);
        return;
      }

      if (!scanning) startScan();

      const side = selectSide();
      const other = moveSide();
      const g = t.gaze;

      // The hold that moves to the next card is released as soon as the gaze
      // comes away from that side, so one hold moves exactly one card. The same
      // release rearms the alert gesture, so one continuous hold can arm once.
      if (g !== other) {
        movedThisHold = false;
        armedThisHold = false;
        armProgress(0);
        resumeScan();
      }

      // Selection requires a deliberate, held gaze towards the calibrated side.
      if (side && g === side && scanIndex >= 0 && !selectedThisCard) {
        armProgress(0);
        if (!holding) { holding = true; pauseScan(); }
        const pct = (t.holdMs / DWELL_MS) * 100;
        paint(pct);
        if (t.holdMs >= DWELL_MS) {
          selectedThisCard = true;
          paint(100);
          resetHold();
          selectCurrent();
          holding = false;
          resumeScan();
        }
      } else if (other && g === other) {
        if (holding) { holding = false; resumeScan(); }
        paint(0);
        if (!movedThisHold && t.holdMs >= ADVANCE_MS) {
          movedThisHold = true;
          resetHold();
          moveNow();
        } else if (movedThisHold && !armedThisHold) {
          // The move has already happened and the gaze has stayed. The scan is
          // paused here, because its own step resets the hold and would wipe
          // out the count underneath the person. The bar fills so the hold can
          // be seen while it is counting. Nothing is sent from here: this only
          // opens the confirmation.
          pauseScan();
          armProgress((t.holdMs / ARM_MS) * 100);
          if (t.holdMs >= ARM_MS) {
            armedThisHold = true;
            resetHold();
            armProgress(0);
            resumeScan();
            if (window.SVAlert && typeof window.SVAlert.arm === "function") window.SVAlert.arm();
          }
        }
      } else {
        if (holding) { holding = false; resumeScan(); }
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
