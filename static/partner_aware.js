(function () {
  "use strict";

  // The mode icon. A PNG for now, so it can be judged at the real size. The
  // other icons in this interface are inline SVG, so this one is softer than
  // they are and is expected to be redrawn as SVG.
  // Drawn for the size it is shown at. The first attempt was a 1254px raster
  // reduced to 34px, where every shape fell below two pixels and the whole
  // thing became one smudge. Here nothing is thinner than five units out of
  // 56, so it survives the reduction. The partner speaks on the right and the
  // bubble points left, towards the person who chooses.
  var ICON =
    '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="pal" x1="10%" y1="0%" x2="90%" y2="100%">' +
    '<stop offset="0%" stop-color="#e8f0ff"/><stop offset="100%" stop-color="#9dbcf8"/>' +
    '</linearGradient>' +
    '<linearGradient id="par" x1="10%" y1="0%" x2="90%" y2="100%">' +
    '<stop offset="0%" stop-color="#8fb2f2"/><stop offset="100%" stop-color="#31508f"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<path d="M20 15 Q36 15 36 24 Q36 33 26 33 L23 33 L14 39 L16.5 32.5 Q10 30 10 24 Q10 15 20 15 Z" fill="#ffffff"/>' +
    '<circle cx="16" cy="24" r="2.9" fill="#2b4374"/>' +
    '<circle cx="23" cy="24" r="2.9" fill="#2b4374"/>' +
    '<circle cx="30" cy="24" r="2.9" fill="#2b4374"/>' +
    '<circle cx="14" cy="43" r="7" fill="url(#pal)"/>' +
    '<path d="M2.5 56 Q2.5 46.5 14 46.5 Q25.5 46.5 25.5 56 Z" fill="url(#pal)"/>' +
    '<circle cx="42" cy="43" r="7" fill="url(#par)"/>' +
    '<path d="M30.5 56 Q30.5 46.5 42 46.5 Q53.5 46.5 53.5 56 Z" fill="url(#par)"/>' +
    '</svg>';

  function iconNode() {
    var span = document.createElement("span");
    span.className = "partner-aware-mark";
    span.innerHTML = ICON;
    return span;
  }

  var READY = "Ready for typed development transcript";

  // Mirrors MAX_TRANSCRIPT_CHARS in ai/partner_aware.py. The server refuses a
  // longer transcript rather than cutting it, so the field refuses it too and
  // says why, instead of sending half a sentence.
  var MAX_TRANSCRIPT = 400;

  var state = {
    enabled: false,

    // Every request carries the token that was current when it started. A
    // response whose token is stale is discarded instead of displayed, so a
    // slow answer cannot overwrite a newer one, and Cancel or Turn off cannot
    // be undone by an answer that arrives seconds later.
    requestId: 0,

    waiting: false
  };

  // Moves the token on, so any response still in flight is discarded when it
  // arrives. This does not abort the HTTP request or recall data already sent.
  // The request may continue after the interface stops waiting for it. If the
  // backend forwards the transcript to an external provider, this does not
  // stop that processing. What this gives is stale-response protection, not
  // cancellation.
  function invalidate() {
    state.requestId += 1;
    setWaiting(false);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setStatus(text) {
    var node = el("partnerAwareStatus");

    if (node) {
      node.textContent = text;
    }
  }

  function clearSuggestions() {
    var root = el("partnerAwareSuggestions");

    // Remove the actual .comm-card elements from the DOM.
    // navigation.js scans every .comm-card in the document and does not
    // know or care whether CSS hides one.
    if (root) {
      root.replaceChildren();
    }

    if (state.enabled) {
      setStatus(READY);
    }
  }

  function setEnabled(on) {
    // Turning the mode on or off invalidates any response still in flight.
    invalidate();

    state.enabled = !!on;

    var panel = el("partnerAwarePanel");
    var toggle = el("partnerAwareToggle");
    var controls = el("partnerAwareControls");

    if (panel) {
      panel.dataset.state = state.enabled ? "on" : "off";
    }

    if (toggle) {
      toggle.setAttribute(
        "aria-pressed",
        state.enabled ? "true" : "false"
      );

      toggle.textContent = state.enabled ? "Turn off" : "Turn on";
    }

    if (controls) {
      controls.hidden = !state.enabled;
    }

    clearSuggestions();

    if (state.enabled) {
      setStatus(READY);
    } else {
      setStatus("Off");
    }
  }

  function chooseSuggestion(text, button) {
    if (!state.enabled) {
      return;
    }

    document
      .querySelectorAll(
        "#partnerAwareSuggestions .partner-aware-card.selected"
      )
      .forEach(function (node) {
        node.classList.remove("selected");
      });

    if (button) {
      button.classList.add("selected");
    }

    // Do not call selectCard().
    // A normal card already owns its own immediate selection path.
    // Partner-Aware keeps this path separate.
    if (typeof window.setPhrase === "function") {
      window.setPhrase(text);
    }

    if (typeof window.addToHistory === "function") {
      window.addToHistory(text, "✦");
    }

    if (typeof window.speakPhrase === "function") {
      window.speakPhrase();
    }

    // Remove all temporary .comm-card elements after selection so the
    // scanner returns to the ordinary communication cards.
    //
    // navigation.js may still hold a scanIndex from the longer list.
    // Its next step normalises that index with modulo against the new
    // card count. A visible focus jump is therefore expected here.
    setTimeout(clearSuggestions, 0);
  }

  function showSuggestions(items) {
    if (!state.enabled) {
      return false;
    }

    var root = el("partnerAwareSuggestions");

    if (!root) {
      return false;
    }

    var clean = [];

    (Array.isArray(items) ? items : []).forEach(function (item) {
      var text = String(item || "").trim();

      if (!text) {
        return;
      }

      if (clean.indexOf(text) !== -1) {
        return;
      }

      if (clean.length >= 3) {
        return;
      }

      clean.push(text);
    });

    // Old suggestions cease to exist before new ones are inserted.
    root.replaceChildren();

    clean.forEach(function (text) {
      var button = document.createElement("button");

      button.type = "button";
      button.className = "comm-card partner-aware-card";

      var mark = iconNode();

      var label = document.createElement("span");
      label.className = "card-text";
      label.textContent = text;

      button.appendChild(mark);
      button.appendChild(label);

      button.addEventListener("click", function () {
        chooseSuggestion(text, button);
      });

      root.appendChild(button);
    });

    if (clean.length === 1) {
      setStatus("1 reply suggestion ready");
    } else if (clean.length > 1) {
      setStatus(clean.length + " reply suggestions ready");
    } else {
      setStatus("No reply suggestions available");
    }

    return clean.length > 0;
  }

  function setWaiting(on) {
    state.waiting = !!on;

    var button = el("partnerAwareSuggest");

    if (button) {
      button.disabled = state.waiting;
    }

    // Only this button waits. The ordinary communication cards are left
    // alone on purpose.
  }

  function updateCount() {
    var field = el("partnerAwareTranscript");
    var counter = el("partnerAwareCount");

    if (!field || !counter) {
      return;
    }

    counter.textContent = field.value.length + " of " + MAX_TRANSCRIPT;
  }

  function unavailable() {
    setWaiting(false);
    setStatus("Reply suggestions are unavailable just now. The cards still work");
  }

  function requestSuggestions() {
    if (!state.enabled || state.waiting) {
      return;
    }

    var field = el("partnerAwareTranscript");

    if (!field) {
      return;
    }

    var text = field.value.trim();

    if (!text) {
      setStatus("Type a test transcript first");
      return;
    }

    if (text.length > MAX_TRANSCRIPT) {
      setStatus("That is longer than " + MAX_TRANSCRIPT + " characters. Shorten it and try again");
      return;
    }

    var token = ++state.requestId;

    // No older cards stay on screen while a newer answer is being waited for.
    clearSuggestions();

    setWaiting(true);
    setStatus("Working on suggestions");

    fetch("/partner-aware/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text })
    })
      .then(function (response) {
        if (token !== state.requestId) {
          return null;
        }

        if (response.status === 401) {
          window.location.assign("/sign-in");
          return null;
        }

        if (response.status === 400) {
          setWaiting(false);
          setStatus("That transcript was not accepted. Check its length and try again");
          return null;
        }

        if (response.status === 429) {
          setWaiting(false);
          setStatus("Too many requests just now. Wait a moment and try again");
          return null;
        }

        if (!response.ok) {
          unavailable();
          return null;
        }

        return response.json();
      })
      .then(function (data) {
        if (data === null || token !== state.requestId) {
          return;
        }

        setWaiting(false);

        var items = (data && Array.isArray(data.suggestions)) ? data.suggestions : [];

        // showSuggestions writes the status itself, the empty case included.
        // Nothing is spoken here. A suggestion is spoken only when the person
        // chooses it.
        showSuggestions(items);
      })
      .catch(function () {
        if (token !== state.requestId) {
          return;
        }

        unavailable();
      });
  }

  function init() {
    var toggle = el("partnerAwareToggle");
    var listen = el("partnerAwareListen");
    var cancel = el("partnerAwareCancel");
    var suggest = el("partnerAwareSuggest");
    var field = el("partnerAwareTranscript");

    if (!toggle || !listen || !cancel || !suggest || !field) {
      return;
    }

    suggest.addEventListener("click", requestSuggestions);

    // Editing the transcript invalidates whatever was asked about the older
    // text, and clears any cards still on screen. Otherwise suggestions to one
    // sentence would sit under a different sentence and look like an answer
    // to it.
    field.addEventListener("input", function () {
      updateCount();
      invalidate();
      clearSuggestions();
    });

    updateCount();

    toggle.addEventListener("click", function () {
      setEnabled(!state.enabled);
    });

    listen.addEventListener("click", function () {
      if (!state.enabled) {
        return;
      }

      // Deliberately no microphone request in this build.
      setStatus("Microphone capture is not connected in this build");
    });

    cancel.addEventListener("click", function () {
      // Cancel invalidates any pending response as well as removing the cards.
      // Without this a late response could put suggestions back on screen
      // after the person asked for them to go.
      invalidate();
      clearSuggestions();
    });

    setEnabled(false);
  }

  window.SVPartnerAware = {
    turnOn: function () {
      setEnabled(true);
    },

    turnOff: function () {
      setEnabled(false);
    },

    showSuggestions: showSuggestions,

    clearSuggestions: clearSuggestions,

    isEnabled: function () {
      return state.enabled;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
