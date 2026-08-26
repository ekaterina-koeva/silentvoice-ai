// SilentVoice AI, the assistance alert.
//
// This file holds the whole emergency path, on purpose. It has to be readable
// and checkable on its own, rather than spread across four files.
//
// Where the control lives. A bar fixed across the top of the screen, above
// everything else, which never scrolls away and is visible from the moment the
// page opens. The top of the screen and not the bottom, because the camera sits
// above the screen: a gaze upwards keeps the iris open and its geometry clean,
// while a gaze downwards lowers the eyelid and cuts the visible iris, which is
// exactly where the measurement falls apart. A person who cannot move a hand or
// turn their head cannot compensate for that.
//
// How it is reached, three ways, none of which can fire by accident.
//
//   Gaze. A held gaze towards the side that moves between cards, held for
//   ARM_HOLD_MS after the move has already happened. Beyond the move, that hold
//   currently does nothing at all, so the gesture collides with nothing that
//   exists. It arms the alert. It does not send it.
//
//   Pointer or touch. A press held for PRESS_HOLD_MS with a ring that fills
//   while it is held. Releasing away from the control abandons it, which is what
//   WCAG 2.2 SC 2.5.2 Pointer Cancellation asks for.
//   https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html
//
//   Keyboard, which is also how switch hardware presents itself. The bar is a
//   button, so Enter or Space opens the confirmation. Escape closes it.
//
// Arming never sends. It opens a confirmation with two targets, Cancel and Send.
// Cancel holds the focus first. The two targets are scanned and chosen with the
// same held gaze used everywhere else, so nothing new has to be learned. If
// nothing is chosen within CONFIRM_TIMEOUT_MS the confirmation closes and sends
// nothing. Nothing is ever sent by running a timer out, because WCAG 2.2 SC
// 2.2.1 exists for precisely that reason.
// https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
//
// The alert is excluded from the ordinary card scan. An alert must be an
// explicit act, never something a scan can walk into.
//
// What the person is told. Whatever happens, it is said on the screen in words.
// Delivered, to how many recipients and at what time, or not delivered and
// nobody was told. The interface never implies that help is coming when the
// server could not send anything.

(function () {
  "use strict";

  var ARM_HOLD_MS = 3000;          // held gaze, after the card move, that arms
  // A fallback for when there is no calibration profile. The bar watches the raw
  // horizontal axis directly: a gaze held clearly to either side arms it. This
  // is deliberately coarse and deliberately high, so an ordinary glance does not
  // trip it. It never runs when calibration exists, because the calibrated
  // gesture in navigation.js owns that case.
  // Measured on this camera on 26 August 2026: centre 0.508, sides 0.370 and
  // 0.628, so the nearest side sits 0.121 away from centre. A margin of 0.075
  // puts the trip points at 0.433 and 0.583, which both real sides clear with
  // room, while an ordinary glance near centre does not reach them.
  var AXIS_CENTRE = 0.508;
  var AXIS_MARGIN = 0.075;
  var AXIS_ARM_MS = 2500;          // held that far aside to arm
  var PRESS_HOLD_MS = 1500;        // press and hold on the bar
  var CONFIRM_SCAN_MS = 3500;      // each confirmation target holds the focus
  var CONFIRM_DWELL_MS = 2000;     // held gaze that chooses the focused target
  var CONFIRM_ADVANCE_MS = 700;    // held gaze that moves between the two
  var CONFIRM_TIMEOUT_MS = 60000;  // closes without sending
  var BAR_HEIGHT = 72;

  var open = false;
  var sending = false;
  var focusIndex = 0;              // 0 is Cancel, 1 is Send
  var holding = false;             // a choice is being held right now
  var movedThisHold = false;       // one hold moves between the two exactly once
  var needsRelease = false;        // the gaze that armed this must be released first
  var scanTimer = null;
  var timeoutTimer = null;
  var frame = null;
  var pressTimer = null;
  var pressStart = 0;
  var axisArmStart = 0;            // when the current off-centre hold began
  var axisFrame = null;
  var axisHoldStart = 0;           // hold on the selecting side inside the confirm
  var axisMoveStart = 0;           // hold on the moving side inside the confirm

  // ---- the look, kept here so the whole path is in one file ----------------

  var css = document.createElement("style");
  css.textContent = [
    ".sv-alert-bar{position:fixed;top:0;left:0;right:0;height:" + BAR_HEIGHT + "px;z-index:200;",
    "display:flex;align-items:center;gap:16px;padding:0 22px;font-family:inherit;",
    "border:0;border-bottom:1px solid rgba(255,120,120,.5);width:100%;text-align:left;",
    "background:linear-gradient(135deg,#b91c1c,#ef4444);color:#fff;cursor:pointer;",
    "box-shadow:0 10px 34px rgba(239,68,68,.28);overflow:hidden}",
    ".sv-alert-bar:focus-visible{outline:4px solid #fff;outline-offset:-6px}",
    ".sv-alert-ring{position:absolute;left:0;top:0;bottom:0;width:0%;",
    "background:rgba(255,255,255,.24);transition:width .1s linear;pointer-events:none}",
    ".sv-alert-face{position:relative;z-index:1;display:flex;align-items:center;gap:16px;width:100%}",
    ".sv-alert-icon{font-size:2rem;line-height:1;flex:none}",
    ".sv-alert-title{font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}",
    ".sv-alert-sub{font-size:.8rem;font-weight:600;color:rgba(255,255,255,.9)}",
    ".sv-alert-state{margin-left:auto;font-size:.85rem;font-weight:700;text-align:right;max-width:44ch}",
    ".topbar{top:" + BAR_HEIGHT + "px}",
    ".app-shell{padding-top:" + BAR_HEIGHT + "px}",

    ".sv-confirm{position:fixed;inset:0;z-index:300;display:flex;align-items:center;",
    "justify-content:center;padding:28px;background:rgba(3,8,18,.93);backdrop-filter:blur(10px)}",
    ".sv-confirm[hidden]{display:none}",
    ".sv-confirm-card{width:100%;max-width:900px;border:1px solid rgba(255,120,120,.5);",
    "border-radius:22px;padding:34px 36px;background:linear-gradient(145deg,rgba(40,12,16,.96),rgba(10,16,34,.96));",
    "box-shadow:0 26px 70px rgba(0,0,0,.6);color:#fff}",
    ".sv-confirm h2{margin:0 0 8px;font-size:1.8rem;font-weight:900;letter-spacing:-.02em}",
    ".sv-confirm p{margin:0 0 22px;color:#ffd7dc;font-size:1.02rem;line-height:1.55}",
    ".sv-confirm-row{display:grid;grid-template-columns:1fr 1fr;gap:18px}",
    ".sv-choice{position:relative;overflow:hidden;min-height:132px;border-radius:18px;",
    "border:1px solid rgba(255,255,255,.16);color:#fff;font-family:inherit;font-weight:900;",
    "font-size:1.3rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;",
    "justify-content:center;gap:6px;background:linear-gradient(145deg,rgba(20,42,84,.85),rgba(7,18,37,.9))}",
    ".sv-choice .sub{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.78)}",
    ".sv-choice.send{background:linear-gradient(135deg,#b91c1c,#ef4444);border-color:rgba(255,140,140,.8)}",
    ".sv-choice.sv-focus{outline:5px solid #38bdf8;outline-offset:2px;",
    "box-shadow:0 0 26px rgba(56,189,248,.95);transform:scale(1.03)}",
    ".sv-choice .fill{position:absolute;left:0;bottom:0;height:7px;width:var(--sv-fill,0%);",
    "background:#22c55e;transition:width .1s linear}",
    ".sv-confirm-hint{margin:20px 0 0;font-size:.95rem;font-weight:700;color:#c5f8ff;line-height:1.5}",
    ".sv-confirm-note{margin:14px 0 0;font-size:.88rem;color:#cbd5e1;line-height:1.6}",
    ".sv-result{margin:22px 0 0;padding:16px 18px;border-radius:14px;font-size:1rem;line-height:1.55;",
    "border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06)}",
    ".sv-result.good{border-color:rgba(53,243,161,.5);background:rgba(53,243,161,.1);color:#c9ffe7}",
    ".sv-result.bad{border-color:rgba(255,120,120,.6);background:rgba(239,68,68,.12);color:#ffd7dc}",
    "@media (prefers-reduced-motion: reduce){.sv-alert-ring,.sv-choice .fill{transition:none}",
    ".sv-choice.sv-focus{transform:none}}"
  ].join("");
  document.head.appendChild(css);

  // ---- the bar -------------------------------------------------------------

  var bar = document.createElement("button");
  bar.type = "button";
  bar.className = "sv-alert-bar";
  bar.id = "svAlertBar";
  bar.setAttribute("aria-label", "Ask for assistance. Press and hold, or hold your gaze to the side that moves between cards.");
  bar.innerHTML =
    '<span class="sv-alert-ring" id="svAlertRing"></span>' +
    '<span class="sv-alert-face">' +
      '<span class="sv-alert-icon" aria-hidden="true">\uD83D\uDEA8</span>' +
      '<span>' +
        '<span class="sv-alert-title">Ask for assistance</span><br>' +
        '<span class="sv-alert-sub">Look firmly to one side and hold, or press and hold. Then choose Send or Cancel. Nothing is sent until you confirm.</span>' +
      '</span>' +
      '<span class="sv-alert-state" id="svAlertState" role="status" aria-live="polite"></span>' +
    '</span>';

  var ring = null;
  var state = null;

  // ---- the confirmation ----------------------------------------------------

  var overlay = document.createElement("div");
  overlay.className = "sv-confirm";
  overlay.id = "svConfirm";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "svConfirmTitle");
  overlay.innerHTML =
    '<div class="sv-confirm-card">' +
      '<h2 id="svConfirmTitle">Send a request for assistance?</h2>' +
      '<p>Nothing has been sent yet. Choose Send to ask for someone to come, or Cancel to go back.</p>' +
      '<div class="sv-confirm-row">' +
        '<button type="button" class="sv-choice" id="svChoiceCancel">Cancel<span class="sub">Go back, send nothing</span><span class="fill"></span></button>' +
        '<button type="button" class="sv-choice send" id="svChoiceSend">Send<span class="sub">Ask someone to come</span><span class="fill"></span></button>' +
      '</div>' +
      '<p class="sv-confirm-hint" id="svConfirmHint"></p>' +
      '<div id="svResult" hidden></div>' +
      '<p class="sv-confirm-note">This asks the people set up to receive it. It does not contact an emergency service. If nothing is chosen, this closes on its own and sends nothing.</p>' +
    '</div>';

  var choices = [];
  var result = null;

  function mount() {
    if (document.getElementById("svAlertBar")) return;
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(overlay);
    ring = document.getElementById("svAlertRing");
    state = document.getElementById("svAlertState");
    result = document.getElementById("svResult");
    choices = [
      document.getElementById("svChoiceCancel"),
      document.getElementById("svChoiceSend")
    ];
    choices[0].addEventListener("click", function () { close("cancelled"); });
    choices[1].addEventListener("click", function () { send(); });
    bindPress();
    axisFrame = requestAnimationFrame(watchAxis);
  }

  // The fallback gaze path. It runs only when there is no calibration profile,
  // so it never competes with the calibrated gesture. It reads the raw axis
  // that tracking.js exposes even before calibration, and fills the same ring.
  function watchAxis() {
    var t = window.SVTracking;
    var live = t && t.ready && t.faceVisible !== false;
    var calibrated = t && t.calibrated;
    var a = t ? t.axis : null;

    if (!open && !sending && live && !calibrated && typeof a === "number") {
      if (Math.abs(a - AXIS_CENTRE) >= AXIS_MARGIN) {
        if (!axisArmStart) axisArmStart = Date.now();
        var held = Date.now() - axisArmStart;
        progress((held / AXIS_ARM_MS) * 100);
        if (held >= AXIS_ARM_MS) { axisArmStart = 0; progress(0); arm(); }
      } else {
        if (axisArmStart) { axisArmStart = 0; progress(0); }
      }
    } else if (axisArmStart) {
      axisArmStart = 0; progress(0);
    }

    axisFrame = requestAnimationFrame(watchAxis);
  }

  // ---- press and hold on the bar ------------------------------------------

  function bindPress() {
    function begin(e) {
      if (open) return;
      if (e.type === "pointerdown" && e.button !== 0) return;
      pressStart = Date.now();
      if (pressTimer) clearInterval(pressTimer);
      pressTimer = setInterval(function () {
        var pct = ((Date.now() - pressStart) / PRESS_HOLD_MS) * 100;
        if (ring) ring.style.width = Math.min(100, pct) + "%";
        if (pct >= 100) { abandon(); arm("press"); }
      }, 50);
    }
    function abandon() {
      if (pressTimer) { clearInterval(pressTimer); pressTimer = null; }
      if (ring) ring.style.width = "0%";
    }
    bar.addEventListener("pointerdown", begin);
    bar.addEventListener("pointerup", abandon);
    bar.addEventListener("pointerleave", abandon);
    bar.addEventListener("pointercancel", abandon);
    // Keyboard and switch hardware. A press opens the confirmation, which is
    // itself the deliberate second step, so no hold is asked for here.
    bar.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        arm("keyboard");
      }
    });
  }

  // ---- arming and the confirmation loop -----------------------------------

  function arm() {
    if (open || sending) return;
    open = true;
    focusIndex = 0;
    holding = false;
    movedThisHold = false;
    needsRelease = true;
    axisHoldStart = 0;
    axisMoveStart = 0;
    setResult(null);
    setHint();
    overlay.hidden = false;
    paint(0);
    resetHold();
    try { choices[0].focus(); } catch (e) {}
    scanTimer = setInterval(advance, CONFIRM_SCAN_MS);
    timeoutTimer = setTimeout(function () { close("timed out"); }, CONFIRM_TIMEOUT_MS);
    frame = requestAnimationFrame(tick);
  }

  function advance() {
    focusIndex = (focusIndex + 1) % choices.length;
    resetHold();
    paint(0);
    try { choices[focusIndex].focus(); } catch (e) {}
  }

  // While a choice is being held, the scan must not move it. Without this the
  // focus walks on to the other option in the middle of the hold, the hold is
  // reset, and the person watches the bar fill and nothing happen. This is the
  // same defect that was found in navigation.js on 25 August 2026, repeated
  // here on the new screen and reported on 26 August 2026.
  function pauseScan() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  }

  function resumeScan() {
    if (open && !sending && !scanTimer) scanTimer = setInterval(advance, CONFIRM_SCAN_MS);
  }

  // A move the person asked for. The scan timer restarts so that the choice
  // does not change again a moment later on its own.
  function switchNow() {
    advance();
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = setInterval(advance, CONFIRM_SCAN_MS);
    }
  }

  function paint(progress) {
    for (var i = 0; i < choices.length; i++) {
      if (i === focusIndex) choices[i].classList.add("sv-focus");
      else {
        choices[i].classList.remove("sv-focus");
        choices[i].style.removeProperty("--sv-fill");
      }
    }
    var pct = Math.max(0, Math.min(100, progress || 0));
    if (choices[focusIndex]) choices[focusIndex].style.setProperty("--sv-fill", pct + "%");
  }

  function resetHold() {
    var t = window.SVTracking;
    if (t && typeof t.resetHold === "function") t.resetHold();
  }

  function tick() {
    if (!open) return;
    var t = window.SVTracking;
    if (t && t.ready && t.faceVisible !== false && !sending) {
      if (t.calibrated) tickCalibrated(t);
      else tickAxis(t);
    }
    frame = requestAnimationFrame(tick);
  }

  // With calibration the two choices are driven by the calibrated sides, the
  // same held gaze used everywhere else in the interface.
  function tickCalibrated(t) {
    var side = t.selectDirection || null;
    var other = side ? (side === "LEFT" ? "RIGHT" : "LEFT") : null;
    var g = t.gaze;

    // The gaze that armed this screen was held towards the moving side. It has
    // to come away from there before that side means anything again, otherwise
    // arming would immediately flip the choice under the person.
    if (g !== other) { movedThisHold = false; needsRelease = false; }

    if (side && g === side) {
      if (!holding) { holding = true; pauseScan(); }
      paint((t.holdMs / CONFIRM_DWELL_MS) * 100);
      if (t.holdMs >= CONFIRM_DWELL_MS) { chooseFocused(); return; }
    } else if (other && g === other) {
      if (holding) { holding = false; resumeScan(); }
      paint(0);
      if (!needsRelease && !movedThisHold && t.holdMs >= CONFIRM_ADVANCE_MS) {
        movedThisHold = true;
        resetHold();
        switchNow();
      }
    } else {
      if (holding) { holding = false; resumeScan(); }
      paint(0);
    }
  }

  // Without calibration the raw axis drives the two choices directly, matching
  // how the bar itself is reached. One measured side selects the focused option;
  // the other side moves between the two. Which measured side is which does not
  // matter here, only that they are on opposite sides of centre. The side below
  // AXIS_CENTRE selects, the side above it moves, chosen once and kept.
  function tickAxis(t) {
    var a = t.axis;
    if (typeof a !== "number") { paint(0); return; }

    var lowSide = a <= AXIS_CENTRE - AXIS_MARGIN;   // selects the focused option
    var highSide = a >= AXIS_CENTRE + AXIS_MARGIN;   // moves between the two

    if (!highSide) movedThisHold = false;            // must return before moving again
    if (!lowSide && !highSide) needsRelease = false; // the arming hold has been released

    if (lowSide) {
      if (!holding) { holding = true; pauseScan(); axisHoldStart = Date.now(); }
      var held = Date.now() - axisHoldStart;
      paint((held / CONFIRM_DWELL_MS) * 100);
      if (held >= CONFIRM_DWELL_MS) { chooseFocused(); return; }
    } else if (highSide) {
      if (holding) { holding = false; axisHoldStart = 0; resumeScan(); }
      paint(0);
      if (!needsRelease && !movedThisHold) {
        if (!axisMoveStart) axisMoveStart = Date.now();
        if (Date.now() - axisMoveStart >= CONFIRM_ADVANCE_MS) {
          movedThisHold = true;
          axisMoveStart = 0;
          switchNow();
        }
      }
    } else {
      if (holding) { holding = false; axisHoldStart = 0; resumeScan(); }
      axisMoveStart = 0;
      paint(0);
    }
  }

  function chooseFocused() {
    paint(100);
    resetHold();
    holding = false;
    if (focusIndex === 1) send();
    else close("cancelled");
  }

  // The two sides are not the same for everyone: which one selects comes from
  // the calibration profile. The instruction is therefore written out with this
  // persons own sides, rather than left as something to work out.
  function setHint() {
    var hint = document.getElementById("svConfirmHint");
    if (!hint) return;
    var t = window.SVTracking;
    var side = (t && t.selectDirection) ? t.selectDirection : null;
    if (!side) {
      hint.textContent = "Choose with touch, pointer or keyboard. Gaze selection needs calibration.";
      return;
    }
    var other = side === "LEFT" ? "right" : "left";
    hint.textContent =
      "Hold your gaze to the " + side.toLowerCase() + " to choose the highlighted option, " +
      "and to the " + other + " to move between the two.";
  }

  function stopLoop() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
    if (frame) { cancelAnimationFrame(frame); frame = null; }
  }

  function close(why) {
    stopLoop();
    open = false;
    holding = false;
    movedThisHold = false;
    needsRelease = false;
    axisHoldStart = 0;
    axisMoveStart = 0;
    overlay.hidden = true;
    paint(0);
    resetHold();
    if (why === "cancelled" || why === "timed out") setState("");
    try { bar.focus(); } catch (e) {}
  }

  // ---- sending -------------------------------------------------------------

  function setState(text, kind) {
    if (!state) return;
    state.textContent = text || "";
    state.style.color = kind === "bad" ? "#ffe1e4" : "#ffffff";
  }

  function setResult(text, kind) {
    if (!result) return;
    if (!text) { result.hidden = true; result.textContent = ""; result.className = ""; return; }
    result.hidden = false;
    result.className = "sv-result" + (kind ? " " + kind : "");
    result.textContent = text;
  }

  function now() {
    return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function send() {
    if (sending) return;
    sending = true;
    stopLoop();
    paint(100);
    setState("Sending");
    setResult("Sending the request.", null);

    // The phrase is spoken on the device first. That part does not depend on a
    // network, and it is the one thing that works even when nothing else does.
    var phrase = (typeof window.EMERGENCY_PHRASE === "string")
      ? window.EMERGENCY_PHRASE
      : "Emergency: please come immediately";
    try {
      if (typeof window.setPhrase === "function") window.setPhrase(phrase);
      if (typeof window.speakPhrase === "function") window.speakPhrase();
      if (typeof window.addToHistory === "function") window.addToHistory(phrase, "\uD83D\uDEA8", true);
    } catch (e) {}

    fetch("/emergency", { method: "POST" })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        var b = r.body || {};
        if (r.ok && b.delivered) {
          var many = b.recipients === 1 ? "1 person" : (b.recipients || 0) + " people";
          setState("Sent to " + many + " at " + now());
          setResult("Sent to " + many + " at " + now() + ". The phrase was also spoken aloud on this device.", "good");
        } else {
          failed(b.reason);
        }
      })
      .catch(function () { failed("no_connection"); })
      .then(function () {
        sending = false;
        setTimeout(function () { if (open) close("done"); }, 6000);
      });
  }

  function failed(reason) {
    var why;
    if (reason === "not_configured") {
      why = "Nobody is set up to receive requests on this installation, so nobody was told.";
    } else if (reason === "no_connection") {
      why = "This device could not reach the server, so nobody was told.";
    } else {
      why = "The server could not send the request, so nobody was told.";
    }
    setState("Not sent. Nobody was told.", "bad");
    setResult(why + " The phrase was spoken aloud on this device. Please ask for help another way.", "bad");
  }

  // ---- what the rest of the interface may use -----------------------------

  // How far through the arming hold the gaze is, from navigation.js. It fills
  // the same ring that a press and hold fills, so both ways of reaching this
  // control look the same while they are counting.
  function progress(pct) {
    if (open || sending) return;
    if (!ring) return;
    ring.style.width = Math.max(0, Math.min(100, pct || 0)) + "%";
  }

  window.SVAlert = {
    arm: arm,
    progress: progress,
    cancel: function () { close("cancelled"); },
    send: send,
    get open() { return open; }
  };

  // The old inline handler and anything else that called this now arrives at
  // the confirmation instead of sending straight away.
  window.triggerEmergency = arm;

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open && !sending) close("cancelled");
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
