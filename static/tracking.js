// SilentVoice AI - Browser-side MediaPipe tracking
//
// Reads live video, computes a single horizontal gaze axis, classifies it
// against a per user calibration profile, and exposes window.SVTracking with
// the current direction and how long it has been held.
//
// WHY THIS FILE WAS REWRITTEN ON 25 AUGUST 2026
//
// The previous version measured each iris from the outer corner of its own eye
// towards the inner corner, then averaged the two eyes. Those two directions
// are mirror images of each other. When both eyes move to the same side, one
// ratio rises and the other falls by almost the same amount, so the average
// removed most of the horizontal signal and left convergence plus noise.
//
// Measured on 25 August 2026, one user, one webcam, 38 frames per target, head
// still (yaw 0.502 to 0.518 across the three horizontal targets). Both formulas
// were computed from the same frames.
//
//   old formula   right 0.449   centre 0.434   left 0.432   separation 0.017
//   this formula  right 0.449   centre 0.510   left 0.577   separation 0.129
//
// Spread within a target, tenth to ninetieth percentile, was 0.006 to 0.010, so
// the gap between neighbouring directions is now roughly eight times the noise.
// Under the old formula it was inside the noise.
//
// This file no longer assumes which end of the axis is the left of the screen.
// Calibration learns that, so a mirrored preview cannot invert the meaning.
//
// Without a calibration profile the tracker reports UNCALIBRATED and never
// reports a selection direction. Thresholds measured on one person, one camera
// and one room are not a product.

(function () {
  var LEFT_IRIS = 468, RIGHT_IRIS = 473;

  // Eye corner landmarks. The pair per eye is used by x order, not by
  // anatomical name, so both eyes are measured along one shared direction.
  var EYE_A = [33, 133];
  var EYE_B = [362, 263];

  var SMOOTH = 5;      // frames averaged before a decision
  var DEBOUNCE = 4;    // frames a direction must persist before it counts

  var PROFILE_KEY = "sv.gaze.profile.v1";

  var xs = [], last = "UNCALIBRATED", cand = "UNCALIBRATED", candN = 0;
  var holdStart = 0;

  window.SVTracking = {
    gaze: "UNCALIBRATED",   // NONE, UNCALIBRATED, CENTER, LEFT, RIGHT, UNSURE
    axis: null,             // smoothed horizontal ratio, or null when no face
    yaw: null,              // head yaw proxy, for calibration quality checks
    holdMs: 0,
    ready: false,
    faceVisible: false,
    profile: null,
    calibrated: false,
    selectDirection: null,  // which direction this user selects with

    // Clears the hold timer. Navigation calls this after a selection so the
    // next card cannot inherit an already full timer.
    resetHold: function () {
      holdStart = 0;
      window.SVTracking.holdMs = 0;
    },

    // Calibration writes here. Passing null turns gaze selection off again.
    setProfile: function (p) {
      window.SVTracking.profile = p;
      window.SVTracking.calibrated = !!(p && p.bands);
      window.SVTracking.selectDirection = p ? p.selectDirection : null;
      if (!window.SVTracking.calibrated) {
        last = cand = "UNCALIBRATED";
        window.SVTracking.gaze = "UNCALIBRATED";
      }
      window.SVTracking.resetHold();
    },

    loadProfile: function () {
      var raw = null;
      try { raw = window.localStorage.getItem(PROFILE_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      var p = null;
      try { p = JSON.parse(raw); } catch (e) { return null; }
      if (!p || p.version !== 1 || !p.bands) return null;
      window.SVTracking.setProfile(p);
      return p;
    },

    saveProfile: function (p) {
      try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
      catch (e) { return false; }
      window.SVTracking.setProfile(p);
      return true;
    },

    clearProfile: function () {
      try { window.localStorage.removeItem(PROFILE_KEY); } catch (e) {}
      window.SVTracking.setProfile(null);
    }
  };

  // One eye, measured left to right in the image. Both eyes therefore move the
  // same way when the gaze moves, and averaging them adds signal instead of
  // cancelling it.
  function eyeAxis(lm, iris, corners) {
    var a = lm[corners[0]], b = lm[corners[1]], c = lm[iris];
    var lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    if ((hi - lo) < 1e-6) return 0.5;
    return (c.x - lo) / (hi - lo);
  }

  // Where the nose sits between the two outer eye corners. Used only as a head
  // movement check during calibration, never as a gaze signal.
  function headYaw(lm) {
    var l = lm[33], r = lm[263], nose = lm[1];
    var span = r.x - l.x;
    if (Math.abs(span) < 1e-6) return 0.5;
    return (nose.x - l.x) / span;
  }

  // Classifies a value against the calibrated bands. Anything that falls in a
  // boundary zone returns UNSURE, and UNSURE never selects anything.
  function classify(v, bands) {
    if (v >= bands.hiEnter) return bands.hiName;
    if (v <= bands.loEnter) return bands.loName;
    if (v > bands.midLo && v < bands.midHi) return "CENTER";
    return "UNSURE";
  }

  function onResults(res) {
    var badgeG = document.getElementById("gazeStatus");
    var badgeB = document.getElementById("blinkStatus");
    var T = window.SVTracking;

    if (!res.multiFaceLandmarks || !res.multiFaceLandmarks.length) {
      T.faceVisible = false;
      T.gaze = "NONE";
      T.axis = null;
      T.yaw = null;
      T.resetHold();
      xs = [];
      if (badgeG) badgeG.textContent = "\u{1F441}️ Gaze: no face";
      if (badgeB) badgeB.textContent = "\u{1F441}️ Hold: —";
      return;
    }

    var lm = res.multiFaceLandmarks[0];
    if (!lm[LEFT_IRIS] || !lm[RIGHT_IRIS]) {
      T.faceVisible = true;
      T.gaze = "NONE";
      T.axis = null;
      T.resetHold();
      if (badgeG) badgeG.textContent = "\u{1F441}️ Gaze: eyes not found";
      return;
    }

    T.faceVisible = true;

    var a = eyeAxis(lm, LEFT_IRIS, EYE_A);
    var b = eyeAxis(lm, RIGHT_IRIS, EYE_B);
    var ax = (a + b) / 2;

    xs.push(ax);
    if (xs.length > SMOOTH) xs.shift();
    ax = xs.reduce(function (p, q) { return p + q; }) / xs.length;

    T.axis = ax;
    T.yaw = headYaw(lm);

    if (!T.calibrated) {
      last = cand = "UNCALIBRATED";
      candN = 0;
      T.gaze = "UNCALIBRATED";
      T.resetHold();
      if (badgeG) badgeG.textContent = "\u{1F441}️ Gaze: not calibrated";
      if (badgeB) badgeB.textContent = "Calibration needed";
      return;
    }

    var dir = classify(ax, T.profile.bands);

    if (dir === cand) candN++; else { cand = dir; candN = 1; }
    if (candN >= DEBOUNCE) last = cand;
    T.gaze = last;
    if (badgeG) badgeG.textContent = last;

    // How long the current direction has been held without changing.
    var now = performance.now();
    if (last === cand && candN >= DEBOUNCE && last !== "UNSURE") {
      if (holdStart === 0) holdStart = now;
      T.holdMs = now - holdStart;
    } else {
      T.resetHold();
    }

    if (badgeB) {
      badgeB.textContent = last + ": " + (T.holdMs / 1000).toFixed(1) + "s";
    }
  }

  function start() {
    var video = document.getElementById("videoFeed");
    if (!video || typeof FaceMesh === "undefined") { setTimeout(start, 500); return; }

    window.SVTracking.loadProfile();

    var fm = new FaceMesh({
      locateFile: function (f) { return "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" + f; }
    });
    fm.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });
    fm.onResults(onResults);

    var busy = false;
    function loop() {
      if (!busy && video.readyState >= 2) {
        busy = true;
        fm.send({ image: video }).then(function () { busy = false; })
          .catch(function () { busy = false; });
      }
      requestAnimationFrame(loop);
    }
    window.SVTracking.ready = true;
    loop();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
