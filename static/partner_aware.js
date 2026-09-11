(function () {
  "use strict";

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

      var mark = document.createElement("span");
      mark.className = "partner-aware-mark";
      mark.textContent = "✦";

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