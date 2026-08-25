// SilentVoice AI - Per user gaze calibration
//
// Measurement on 25 August 2026 showed that a fixed threshold does not survive
// between people, cameras or rooms, and the same measurement showed that the
// signal itself is separable once both eyes are measured along one axis. This
// file turns that signal into a decision boundary for one person, on one
// camera, in one place, and refuses to enable gaze selection when the numbers
// do not support it.
//
// Three targets are recorded: left edge, centre, right edge. The routine then
// checks four things before it writes a profile.
//
//   1. every target collected enough frames
//   2. the head did not move between targets
//   3. the centre reading sits between the two side readings
//   4. each gap is wide compared with the noise inside a target
//
// If any check fails, nothing is saved and the screen says which one failed and
// what to try. A communication tool that speaks for a person must not run on a
// signal it cannot separate.

(function () {
  var SETTLE_MS = 1200;     // dot is shown, nothing is recorded yet
  var RECORD_MS = 2500;     // frames collected for this target
  var PAUSE_MS = 700;       // between targets
  var MIN_SAMPLES = 20;
  var MAX_YAW_SPREAD = 0.03;
  var MIN_GAP = 0.02;
  var GAP_OVER_NOISE = 4;   // a gap must be this many times the noise width
  var MARGIN = 0.15;        // reject zone around a boundary, as a share of the gap

  var TARGETS = [
    { key: "LEFT", label: "Look at the dot on the left", pos: "left" },
    { key: "CENTER", label: "Look at the dot in the middle", pos: "center" },
    { key: "RIGHT", label: "Look at the dot on the right", pos: "right" }
  ];

  var overlay = null, running = false, cancelled = false;

  // ---- maths -------------------------------------------------------------

  function med(a) {
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; });
    return b[Math.floor(b.length / 2)];
  }
  function pctl(a, p) {
    if (!a.length) return NaN;
    var b = a.slice().sort(function (x, y) { return x - y; });
    return b[Math.min(b.length - 1, Math.max(0, Math.round((b.length - 1) * p)))];
  }
  function f3(x) { return (x === null || x === undefined || isNaN(x)) ? "n/a" : x.toFixed(3); }

  function summarise(samples) {
    var ax = samples.map(function (s) { return s.axis; });
    var yaw = samples.map(function (s) { return s.yaw; });
    var span = samples.map(function (s) { return s.span; });
    return {
      n: samples.length,
      median: med(ax),
      p10: pctl(ax, 0.10),
      p90: pctl(ax, 0.90),
      yaw: med(yaw),
      span: med(span)
    };
  }

  // Builds a profile, or an explanation of why one cannot be built.
  // prefer is the side this person already selects with, when there is one.
  function evaluate(rec, prefer) {
    var L = rec.LEFT, C = rec.CENTER, R = rec.RIGHT;

    if (L.n < MIN_SAMPLES || C.n < MIN_SAMPLES || R.n < MIN_SAMPLES) {
      return { ok: false, reason: "frames",
        detail: "Frames recorded: left " + L.n + ", centre " + C.n + ", right " + R.n + "." };
    }

    var yaws = [L.yaw, C.yaw, R.yaw];
    var yawSpread = Math.max.apply(null, yaws) - Math.min.apply(null, yaws);
    if (yawSpread > MAX_YAW_SPREAD) {
      return { ok: false, reason: "head",
        detail: "Head position moved by " + f3(yawSpread) + " between the dots, and " +
                f3(MAX_YAW_SPREAD) + " is the most this can allow." };
    }

    var lowIsLeft = L.median < R.median;
    var low = lowIsLeft ? L : R, high = lowIsLeft ? R : L;
    var lowName = lowIsLeft ? "LEFT" : "RIGHT";
    var highName = lowIsLeft ? "RIGHT" : "LEFT";

    if (!(C.median > low.median && C.median < high.median)) {
      return { ok: false, reason: "order",
        detail: "Readings were left " + f3(L.median) + ", centre " + f3(C.median) +
                ", right " + f3(R.median) + ". The centre has to sit between the other two." };
    }

    var gapLow = C.median - low.median;
    var gapHigh = high.median - C.median;
    var noise = Math.max(L.p90 - L.p10, C.p90 - C.p10, R.p90 - R.p10);
    var need = Math.max(MIN_GAP, GAP_OVER_NOISE * noise);

    if (gapLow < need || gapHigh < need) {
      return { ok: false, reason: "gap",
        detail: "Gaps measured " + f3(gapLow) + " and " + f3(gapHigh) + ", noise inside a look was " +
                f3(noise) + ", so a gap of at least " + f3(need) + " is needed." };
    }

    // Which side selects has to stay the same between calibrations. The two
    // gaps are often nearly equal, so choosing the larger one every time can
    // swap the sides on a person who has already learnt them. The side that is
    // already in use is kept unless the other one is clearly better.
    var chosen = gapHigh >= gapLow ? highName : lowName;
    if (prefer === "LEFT" || prefer === "RIGHT") {
      var preferGap = (prefer === highName) ? gapHigh : gapLow;
      if (preferGap >= 0.8 * Math.max(gapLow, gapHigh)) chosen = prefer;
    }

    var m = MARGIN * Math.min(gapLow, gapHigh);
    var bLow = (low.median + C.median) / 2;
    var bHigh = (C.median + high.median) / 2;

    return {
      ok: true,
      profile: {
        version: 1,
        createdAt: new Date().toISOString(),
        targets: { LEFT: L, CENTER: C, RIGHT: R },
        bands: {
          loEnter: bLow - m, loName: lowName,
          midLo: bLow + m, midHi: bHigh - m,
          hiEnter: bHigh + m, hiName: highName
        },
        quality: { gapLow: gapLow, gapHigh: gapHigh, noise: noise, yawSpread: yawSpread },
        // The seat this profile describes. Tracking pauses selection when the
        // person is no longer sitting this way, because the thresholds were
        // measured here and nowhere else.
        pose: {
          yaw: med([L.yaw, C.yaw, R.yaw]),
          span: med([L.span, C.span, R.span]),
          yawTol: 0.05,
          spanTol: 0.22
        },
        selectDirection: chosen
      }
    };
  }

  // ---- screen ------------------------------------------------------------

  function style() {
    if (document.getElementById("svCalStyle")) return;
    var s = document.createElement("style");
    s.id = "svCalStyle";
    s.textContent =
      ".sv-cal-panel{margin:10px 16px 0;padding:14px 16px;border-radius:16px;" +
      "border:1px solid rgba(120,180,255,.16);background:linear-gradient(135deg,rgba(20,42,82,.72),rgba(7,18,37,.72))}" +
      ".sv-cal-panel .t{font-size:.74rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#b5c9e5}" +
      ".sv-cal-panel .s{margin:6px 0 10px;font-size:.84rem;line-height:1.5;color:#d1e0f4}" +
      ".sv-cal-panel button{height:44px;padding:0 16px;margin-right:8px;border-radius:12px;font-family:inherit;" +
      "font-weight:800;cursor:pointer;color:#c5f8ff;background:rgba(22,213,255,.08);border:1px solid rgba(22,213,255,.42)}" +
      ".sv-cal-panel button.ghost{color:#9cb0ca;background:transparent;border-color:rgba(156,176,202,.35)}" +
      "#svCalOverlay{position:fixed;inset:0;z-index:9999;background:#05101f;color:#eaf3ff;" +
      "font-family:Inter,'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center}" +
      // The class is prefixed on purpose. A plain name such as card already
      // exists in style.css with a white background, and an overlay written for
      // a dark background became unreadable inside it.
      "#svCalOverlay .sv-cal-card{max-width:660px;padding:34px 38px;text-align:center;border-radius:20px;" +
      "background:#0b1c33;color:#eaf3ff;border:1px solid rgba(120,180,255,.25);box-shadow:0 24px 60px rgba(0,0,0,.55)}" +
      "#svCalOverlay h2{font-size:1.6rem;margin:0 0 20px;color:#ffffff}" +
      "#svCalOverlay p{font-size:1.15rem;line-height:1.65;margin:0 0 14px;color:#eaf3ff}" +
      "#svCalOverlay .small{font-size:.88rem;color:#a8c2e6;font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap}" +
      "#svCalOverlay button{height:52px;padding:0 26px;margin:14px 8px 0;border-radius:14px;font-family:inherit;" +
      "font-size:1rem;font-weight:800;cursor:pointer;color:#05101f;background:#38bdf8;border:0}" +
      "#svCalOverlay button.ghost{color:#c5d8ef;background:transparent;border:1px solid rgba(156,176,202,.45)}" +
      "#svCalDot{position:fixed;width:96px;height:96px;border-radius:50%;background:#38bdf8;" +
      "box-shadow:0 0 40px rgba(56,189,248,.75);top:50%;transform:translateY(-50%)}" +
      "#svCalBar{position:fixed;left:0;bottom:0;height:8px;background:#22c55e;width:0}" +
      "#svCalSay{position:fixed;left:0;right:0;bottom:42px;text-align:center;font-size:1.25rem;color:#eaf3ff}" +
      "#svCalStop{position:fixed;top:22px;right:22px}";
    document.head.appendChild(s);
  }

  function openOverlay() {
    overlay = document.createElement("div");
    overlay.id = "svCalOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
  }

  function closeOverlay() {
    document.removeEventListener("keydown", onKey);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    running = false;
  }

  function onKey(e) { if (e.key === "Escape") { cancelled = true; closeOverlay(); renderPanel(); } }

  function screen(html) { overlay.innerHTML = '<div class="sv-cal-card">' + html + "</div>"; }

  function intro() {
    screen(
      "<h2>Setting up gaze selection</h2>" +
      "<p>Three dots will appear, one at a time. Look at each dot until it disappears.</p>" +
      "<p>It takes about half a minute. Keep your head still and move only your eyes.</p>" +
      "<p>Sit the way you will actually use it. What is measured now applies to this seat and this distance from the camera.</p>" +
      "<p>You can stop at any time.</p>" +
      '<button id="svCalGo">Start</button>' +
      '<button class="ghost" id="svCalNo">Not now</button>'
    );
    document.getElementById("svCalGo").addEventListener("click", run);
    document.getElementById("svCalNo").addEventListener("click", function () { closeOverlay(); renderPanel(); });
  }

  function stage(label) {
    overlay.innerHTML =
      '<div id="svCalDot"></div><div id="svCalBar"></div>' +
      '<div id="svCalSay">' + label + "</div>" +
      '<button class="ghost" id="svCalStop">Stop</button>';
    document.getElementById("svCalStop").addEventListener("click", function () {
      cancelled = true; closeOverlay(); renderPanel();
    });
  }

  function placeDot(pos) {
    var d = document.getElementById("svCalDot");
    if (!d) return;
    if (pos === "left") { d.style.left = "24px"; d.style.right = "auto"; }
    else if (pos === "right") { d.style.right = "24px"; d.style.left = "auto"; }
    else { d.style.left = "50%"; d.style.right = "auto"; d.style.marginLeft = "-48px"; }
  }

  function bar(pct) {
    var b = document.getElementById("svCalBar");
    if (b) b.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  // ---- recording ---------------------------------------------------------

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Collects frames for one target. Resolves with the samples, or null when the
  // face was lost for too long.
  function collect(ms) {
    return new Promise(function (resolve) {
      var samples = [], missing = 0, t0 = performance.now();
      function step() {
        if (cancelled) return resolve(null);
        var T = window.SVTracking;
        var now = performance.now(), done = now - t0;
        bar((done / ms) * 100);
        if (T && T.faceVisible && typeof T.axis === "number") {
          samples.push({ axis: T.axis, yaw: T.yaw, span: T.span });
        } else {
          missing++;
        }
        if (done >= ms) return resolve(missing > samples.length ? null : samples);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  async function recordTarget(t) {
    for (var attempt = 1; attempt <= 3; attempt++) {
      stage(t.label);
      placeDot(t.pos);
      bar(0);
      await wait(SETTLE_MS);
      if (cancelled) return null;
      var s = await collect(RECORD_MS);
      if (cancelled) return null;
      if (s && s.length >= MIN_SAMPLES) return s;
      stage("I lost your face for a moment. Let us do that one again.");
      await wait(1600);
    }
    return null;
  }

  async function run() {
    running = true;
    cancelled = false;
    var rec = {};
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      var s = await recordTarget(t);
      if (cancelled) return;
      if (!s) return fail({ reason: "frames", detail: "The camera could not follow your face for the " + t.key.toLowerCase() + " dot." });
      rec[t.key] = summarise(s);
      if (i < TARGETS.length - 1) { stage("Good. Next one."); bar(0); await wait(PAUSE_MS); }
    }
    var prefer = (window.SVTracking && window.SVTracking.profile) ? window.SVTracking.profile.selectDirection : null;
    var out = evaluate(rec, prefer);
    if (!out.ok) return fail(out);
    if (window.SVTracking && window.SVTracking.saveProfile) window.SVTracking.saveProfile(out.profile);
    success(out.profile);
  }

  var ADVICE = {
    frames: "Sit so that your whole face is inside the picture, with the light in front of you rather than behind you.",
    head: "Try again and move only your eyes. It helps if the assistant says the word left, middle or right before each dot, so that the head does not follow.",
    order: "This usually means the light or the position changed during the run. Try again without moving the chair.",
    gap: "Try more light in front of you, sit a little closer to the camera, and remove any glare on glasses. If it fails again, gaze selection is not reliable enough on this camera today, and the interface stays on touch or pointer."
  };

  function fail(out) {
    screen(
      "<h2>Calibration did not pass</h2>" +
      "<p>" + (out.reason === "head" ? "Your head moved between the dots." :
               out.reason === "gap" ? "Looking left, at the middle and right did not come out different enough to tell apart." :
               out.reason === "order" ? "The three looks did not line up in a row." :
               "The camera did not see your face for long enough.") + "</p>" +
      "<p>" + ADVICE[out.reason] + "</p>" +
      '<p class="small">' + (out.detail || "") + "</p>" +
      "<p>Nothing was saved. Cards are still selected by touch or pointer.</p>" +
      '<button id="svCalAgain">Try again</button>' +
      '<button class="ghost" id="svCalNo2">Not now</button>'
    );
    document.getElementById("svCalAgain").addEventListener("click", run);
    document.getElementById("svCalNo2").addEventListener("click", function () { closeOverlay(); renderPanel(); });
  }

  function success(p) {
    var side = sideWord(p.selectDirection);
    var other = sideWord(otherOf(p.selectDirection));
    screen(
      "<h2>Gaze selection is on</h2>" +
      "<p>Cards highlight one at a time. Hold your gaze to the <strong>" + side +
      "</strong> to select the card that is highlighted, and to the <strong>" + other +
      "</strong> to move to the next card.</p>" +
      "<p>If you move, sit further away or the light changes, gaze selection pauses by itself and the screen says so. Calibrate again from the same seat and it takes half a minute.</p>" +
      '<p class="small">' +
      "measured just now\n" +
      "left " + f3(p.targets.LEFT.median) + "   centre " + f3(p.targets.CENTER.median) +
      "   right " + f3(p.targets.RIGHT.median) + "\n" +
      "gaps " + f3(p.quality.gapLow) + " and " + f3(p.quality.gapHigh) +
      "   noise " + f3(p.quality.noise) + "   head " + f3(p.quality.yawSpread) +
      "</p>" +
      '<button id="svCalDone">Done</button>'
    );
    document.getElementById("svCalDone").addEventListener("click", function () { closeOverlay(); renderPanel(); });
  }

  // ---- the panel under the signal cards -----------------------------------

  function sideWord(d) { return d === "LEFT" ? "left" : "right"; }
  function otherOf(d) { return d === "LEFT" ? "RIGHT" : "LEFT"; }

  // The interface explains how a card is selected in two places. Both have to
  // follow the profile, or the screen goes back to promising something that is
  // not switched on.
  function setHints(p) {
    var text = p
      ? "Cards highlight in turn. Hold your gaze to the " + sideWord(p.selectDirection) +
        " to choose the highlighted card, and to the " + sideWord(otherOf(p.selectDirection)) +
        " to move to the next card."
      : "Cards highlight in turn. Select by touch or pointer. Gaze selection needs calibration.";
    ["svCardsHint", "svTopHint"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  function renderPanel() {
    var box = document.getElementById("svCalPanel");
    if (!box) return;
    var T = window.SVTracking;
    var p = T && T.profile;
    setHints(T && T.calibrated ? p : null);

    if (T && T.calibrated && p) {
      var when = "";
      try { when = new Date(p.createdAt).toLocaleString(); } catch (e) { when = p.createdAt; }
      box.innerHTML =
        '<div class="t">Gaze selection</div>' +
        '<div class="s">On. Hold your gaze to the ' + sideWord(p.selectDirection) +
        ' to select the highlighted card, and to the ' + sideWord(otherOf(p.selectDirection)) +
        ' to move to the next card.<br>' +
        "Calibrated " + when + ". This applies to the seat and the distance used then. " +
        "If you move away or turn, selection pauses and the panel above says POSITION CHANGED.</div>" +
        '<button id="svCalRe">Calibrate again</button>' +
        '<button class="ghost" id="svCalSwap">Swap the sides</button>' +
        '<button class="ghost" id="svCalOff">Turn off</button>';
      document.getElementById("svCalRe").addEventListener("click", start);
      document.getElementById("svCalSwap").addEventListener("click", function () {
        var np = JSON.parse(JSON.stringify(p));
        np.selectDirection = otherOf(p.selectDirection);
        if (T.saveProfile) T.saveProfile(np);
        renderPanel();
      });
      document.getElementById("svCalOff").addEventListener("click", function () {
        if (T.clearProfile) T.clearProfile();
        renderPanel();
      });
    } else {
      box.innerHTML =
        '<div class="t">Gaze selection</div>' +
        '<div class="s">Off until this device has learnt how you look left, at the middle and right. ' +
        "Until then, cards are selected by touch or pointer.<br><br>" +
        "Setting it up takes about half a minute. Three dots appear one at a time and you look at each " +
        "one until it disappears. Keep your head still and move only your eyes. You can stop at any " +
        "time, and nothing is saved unless the result is good enough to rely on.</div>" +
        '<button id="svCalStart">Set up gaze selection</button>';
      document.getElementById("svCalStart").addEventListener("click", start);
    }
  }

  function start() {
    if (running) return;
    if (!window.SVTracking || !window.SVTracking.ready) {
      alert("The camera tracking is not running yet. Give it a moment and try again.");
      return;
    }
    style();
    openOverlay();
    intro();
  }

  function build() {
    var anchor = document.querySelector(".signal-row");
    if (!anchor) return;
    var box = document.createElement("div");
    box.id = "svCalPanel";
    box.className = "sv-cal-panel";
    anchor.insertAdjacentElement("afterend", box);
    renderPanel();
  }

  function boot() {
    style();
    build();
    // The profile is loaded by tracking.js when it starts, which may be after
    // this file runs, so the panel is drawn again once tracking is up.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if ((window.SVTracking && window.SVTracking.ready) || tries > 40) {
        clearInterval(iv);
        renderPanel();
      }
    }, 500);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
