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

  var state = {
    enabled: false
  };

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
      setStatus("Ready, microphone not connected");
    }
  }

  function setEnabled(on) {
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
      setStatus("Ready, microphone not connected");
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
      setStatus("No reply suggestions");
    }

    return clean.length > 0;
  }

  function init() {
    var toggle = el("partnerAwareToggle");
    var listen = el("partnerAwareListen");
    var cancel = el("partnerAwareCancel");

    if (!toggle || !listen || !cancel) {
      return;
    }

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
