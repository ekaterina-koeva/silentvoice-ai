// Regression tests for static/navigation.js.
//
// The real navigation.js is loaded into an isolated context with a minimal
// stand in for the DOM, the tracker (window.SVTracking), the alert
// (window.SVAlert), requestAnimationFrame and the interval timer. Time and
// animation frames are advanced by hand, so every test is deterministic.
//
// These tests check the documented navigation behaviour only. They say
// nothing about gaze accuracy for any person, camera or room.

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "navigation.js"),
  "utf8"
);

const SCAN_INTERVAL = 3500;
const DWELL_MS = 2000;
const ADVANCE_MS = 700;

function makeCard(index) {
  const classes = new Set(["comm-card"]);
  return {
    index,
    clicks: 0,
    click() { this.clicks += 1; },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    style: { setProperty() {}, removeProperty() {} },
  };
}

function load(cardCount) {
  const cards = Array.from({ length: cardCount }, (_, i) => makeCard(i));

  let now = 0;
  let nextId = 1;
  const intervals = new Map();
  let frame = null;

  const tracker = {
    ready: true,
    faceVisible: true,
    selectDirection: "LEFT",
    gaze: "CENTER",
    holdMs: 0,
    resetHold() { this.holdMs = 0; },
  };

  const window = { SVTracking: tracker, SVAlert: { open: false, arm() {}, progress() {} } };

  const context = {
    window,
    document: {
      readyState: "complete",
      querySelectorAll: (sel) => (sel === ".comm-card" ? cards : []),
      createElement: () => ({ textContent: "" }),
      head: { appendChild() {} },
      addEventListener() {},
    },
    requestAnimationFrame: (fn) => { frame = fn; },
    setInterval: (fn, ms) => {
      const id = nextId++;
      intervals.set(id, { fn, ms, due: now + ms });
      return id;
    },
    clearInterval: (id) => { intervals.delete(id); },
  };

  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "static/navigation.js" });

  // One animation frame: run the scheduled tick once.
  function frameOnce() {
    const fn = frame;
    frame = null;
    if (fn) fn();
  }

  // Advance the clock in small steps, firing due intervals and one frame per
  // step, with the tracker's hold counter growing while the gaze is held.
  function advance(ms, stepMs = 50) {
    for (let elapsed = 0; elapsed < ms; elapsed += stepMs) {
      now += stepMs;
      if (tracker.gaze === "LEFT" || tracker.gaze === "RIGHT") tracker.holdMs += stepMs;
      for (const [id, t] of Array.from(intervals)) {
        if (intervals.has(id) && now >= t.due) {
          t.due += t.ms;
          t.fn();
        }
      }
      frameOnce();
    }
  }

  function focused() {
    return cards.findIndex((c) => c.classList.contains("sv-focus"));
  }

  function clicks() {
    return cards.reduce((n, c) => n + c.clicks, 0);
  }

  function gaze(g) {
    tracker.gaze = g;
    tracker.holdMs = 0;
  }

  frameOnce(); // first tick starts the scan
  return { cards, tracker, window, advance, focused, clicks, gaze };
}

test("an UNSURE reading never selects a card", () => {
  const nav = load(4);
  nav.gaze("UNSURE");
  nav.tracker.holdMs = DWELL_MS * 5;
  nav.advance(DWELL_MS * 2);
  assert.equal(nav.clicks(), 0);
});

test("a selection hold shorter than the dwell time does not select", () => {
  const nav = load(4);
  nav.gaze("LEFT");
  nav.advance(DWELL_MS - 100);
  assert.equal(nav.clicks(), 0);
});

test("a selection hold of the full dwell time selects exactly one card", () => {
  const nav = load(4);
  const before = nav.focused();
  nav.gaze("LEFT");
  nav.advance(DWELL_MS + 1000);
  assert.equal(nav.clicks(), 1);
  assert.equal(nav.cards[before].clicks, 1);
});

test("automatic scanning pauses during a selection hold", () => {
  const nav = load(4);
  nav.advance(SCAN_INTERVAL - 1000); // an automatic step is due during the hold
  const before = nav.focused();
  nav.gaze("LEFT");
  nav.advance(DWELL_MS - 100);
  assert.equal(nav.focused(), before, "the card does not change during the hold");
  assert.equal(nav.clicks(), 0);
});

test("a movement hold advances to the next card", () => {
  const nav = load(4);
  const before = nav.focused();
  nav.gaze("RIGHT");
  nav.advance(ADVANCE_MS + 100);
  assert.equal(nav.focused(), (before + 1) % 4);
  assert.equal(nav.clicks(), 0);
});

test("one continuous movement hold advances only one card", () => {
  const nav = load(6);
  const before = nav.focused();
  nav.gaze("RIGHT");
  nav.advance(ADVANCE_MS * 4); // stays below the alert arming time
  assert.equal(nav.focused(), (before + 1) % 6);
});

test("a manual move restarts the automatic scan interval", () => {
  const nav = load(6);
  nav.advance(SCAN_INTERVAL - 500); // close to an automatic step
  nav.gaze("RIGHT");
  nav.advance(ADVANCE_MS + 100);
  const afterMove = nav.focused();
  nav.gaze("CENTER"); // release, the scan resumes from here
  nav.advance(SCAN_INTERVAL - 200);
  assert.equal(nav.focused(), afterMove, "no automatic step before a full interval");
  nav.advance(400);
  assert.equal(nav.focused(), (afterMove + 1) % 6, "automatic step after a full interval");
});

test("an open assistance confirmation blocks selection and scanning behind it", () => {
  const nav = load(4);
  const before = nav.focused();
  nav.window.SVAlert.open = true;
  nav.gaze("LEFT");
  nav.advance(DWELL_MS + SCAN_INTERVAL);
  assert.equal(nav.clicks(), 0, "nothing is selected behind the dialog");
  assert.equal(nav.focused(), before, "the scan does not move behind the dialog");
});
