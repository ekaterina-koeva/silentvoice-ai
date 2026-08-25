// SilentVoice AI - Voice selection
//
// The browser does not report whether a voice is male or female. There is no
// such field in the Web Speech API. What a device does report is the voice name
// and its language, so this file lists the voices the device actually has and
// lets the person hear one before choosing it. A name is a weaker promise than
// a sample, so the sample is the point of this panel.
//
// The choice is stored per language. Text in Cyrillic uses the voice chosen for
// Bulgarian; everything else uses the voice chosen for the selected language.
//
// Nothing here speaks by itself. app.js asks SVVoice.pick(text) when the person
// presses Speak, and falls back to its own behaviour when no choice was made.

(function () {
  var KEY = "sv.voice.v1";
  var state = { byLang: {}, current: null };   // byLang: language prefix -> voiceURI

  var SAMPLES = {
    en: "This is how I will sound.",
    bg: "Така ще звуча."
  };

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.byLang) { state.byLang = p.byLang; state.current = p.current || null; }
      }
    } catch (e) {}
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function voices() {
    if (!("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  function prefixOf(lang) { return (lang || "").split("-")[0].toLowerCase(); }

  function languageName(prefix) {
    try {
      var dn = new Intl.DisplayNames(["en"], { type: "language" });
      return dn.of(prefix) || prefix;
    } catch (e) { return prefix; }
  }

  function isOnline(v) { return /online|natural|cloud/i.test(v.name); }

  // Returns the voice this person chose for the language of the text, or null
  // when nothing has been chosen. app.js decides what to do with null.
  function pick(text) {
    var vs = voices();
    if (!vs.length) return null;
    var wanted = /[Ѐ-ӿ]/.test(text || "") ? "bg" : (state.current || "en");
    var uri = state.byLang[wanted];
    if (!uri && wanted !== "bg" && state.current) uri = state.byLang[state.current];
    if (!uri) return null;
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].voiceURI === uri) return vs[i];
    }
    return null;   // the chosen voice is gone from this device
  }

  function speakSample(voice) {
    if (!voice || !("speechSynthesis" in window)) return;
    var p = prefixOf(voice.lang);
    var u = new SpeechSynthesisUtterance(SAMPLES[p] || SAMPLES.en);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // ---- interface ---------------------------------------------------------

  function style() {
    var s = document.createElement("style");
    s.textContent =
      ".sv-voice{margin-top:14px;padding:14px 16px;border:1px solid rgba(120,180,255,.16);" +
      "border-radius:16px;background:linear-gradient(135deg,rgba(20,42,82,.72),rgba(7,18,37,.72))}" +
      ".sv-voice-title{font-size:.74rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#b5c9e5;margin-bottom:10px}" +
      ".sv-voice-row{display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px;align-items:center}" +
      ".sv-voice select{height:46px;border-radius:12px;padding:0 10px;font-family:inherit;font-size:.92rem;" +
      "color:#eaf3ff;background:rgba(0,0,0,.28);border:1px solid rgba(120,180,255,.24);min-width:0}" +
      ".sv-voice button{height:46px;padding:0 18px;border-radius:12px;font-family:inherit;font-weight:800;cursor:pointer;" +
      "color:#c5f8ff;background:rgba(22,213,255,.08);border:1px solid rgba(22,213,255,.42)}" +
      ".sv-voice button:disabled{opacity:.45;cursor:default}" +
      ".sv-voice-note{margin-top:10px;font-size:.78rem;line-height:1.5;color:#a8c2e6}" +
      "@media(max-width:640px){.sv-voice-row{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }

  function build() {
    var anchor = document.querySelector(".action-row");
    if (!anchor) return null;

    var box = document.createElement("div");
    box.className = "sv-voice";
    box.innerHTML =
      '<div class="sv-voice-title">Voice</div>' +
      '<div class="sv-voice-row">' +
      '  <select id="svVoiceLang" aria-label="Speech language"></select>' +
      '  <select id="svVoiceName" aria-label="Voice"></select>' +
      '  <button id="svVoiceTry" type="button">Try it</button>' +
      '</div>' +
      '<div class="sv-voice-note" id="svVoiceNote"></div>';
    anchor.insertAdjacentElement("afterend", box);
    return box;
  }

  function fill() {
    var langSel = document.getElementById("svVoiceLang");
    var nameSel = document.getElementById("svVoiceName");
    var tryBtn = document.getElementById("svVoiceTry");
    var note = document.getElementById("svVoiceNote");
    if (!langSel) return;

    var vs = voices();
    if (!vs.length) {
      langSel.innerHTML = "";
      nameSel.innerHTML = "";
      langSel.disabled = nameSel.disabled = tryBtn.disabled = true;
      note.textContent =
        "This device offers no speech voices, so the phrase is sent to the server to be spoken. " +
        "Choosing a voice will become possible on a device that has them.";
      return;
    }
    langSel.disabled = nameSel.disabled = tryBtn.disabled = false;

    // languages present on this device, English first, then Bulgarian, then the rest
    var seen = {}, langs = [];
    vs.forEach(function (v) {
      var p = prefixOf(v.lang);
      if (!seen[p]) { seen[p] = true; langs.push(p); }
    });
    langs.sort(function (a, b) {
      var rank = { en: 0, bg: 1 };
      var ra = (a in rank) ? rank[a] : 2, rb = (b in rank) ? rank[b] : 2;
      if (ra !== rb) return ra - rb;
      return languageName(a).localeCompare(languageName(b));
    });

    if (!state.current || langs.indexOf(state.current) < 0) {
      state.current = langs.indexOf("en") >= 0 ? "en" : langs[0];
    }

    langSel.innerHTML = "";
    langs.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p;
      o.textContent = languageName(p);
      if (p === state.current) o.selected = true;
      langSel.appendChild(o);
    });

    fillVoices();
  }

  function fillVoices() {
    var nameSel = document.getElementById("svVoiceName");
    var note = document.getElementById("svVoiceNote");
    var list = voices().filter(function (v) { return prefixOf(v.lang) === state.current; });

    nameSel.innerHTML = "";
    list.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = v.name + (isOnline(v) ? "  (online)" : "");
      if (state.byLang[state.current] === v.voiceURI) o.selected = true;
      nameSel.appendChild(o);
    });

    if (!state.byLang[state.current] && list.length) {
      state.byLang[state.current] = list[0].voiceURI;
      nameSel.value = list[0].voiceURI;
      save();
    }

    var chosen = list.filter(function (v) { return v.voiceURI === nameSel.value; })[0];
    var lines = [];
    if (!list.length) {
      lines.push("This device has no voice for that language, so nothing would be spoken in it.");
    }
    lines.push("Press Try it to hear the voice before you keep it.");
    if (chosen && isOnline(chosen)) {
      lines.push("This voice is produced on a Microsoft server, so the phrase text leaves the device when it speaks. A voice without the online label speaks on the device itself.");
    }
    lines.push("Text in Cyrillic uses the Bulgarian voice chosen here. Everything else uses the voice for the language selected above.");
    note.textContent = lines.join(" ");
  }

  function wire() {
    var langSel = document.getElementById("svVoiceLang");
    var nameSel = document.getElementById("svVoiceName");
    var tryBtn = document.getElementById("svVoiceTry");

    langSel.addEventListener("change", function () {
      state.current = langSel.value;
      save();
      fillVoices();
    });

    nameSel.addEventListener("change", function () {
      state.byLang[state.current] = nameSel.value;
      save();
      fillVoices();
    });

    tryBtn.addEventListener("click", function () {
      var v = voices().filter(function (x) { return x.voiceURI === nameSel.value; })[0];
      speakSample(v);
    });
  }

  function start() {
    if (!("speechSynthesis" in window)) return;
    load();
    style();
    if (!build()) return;
    fill();
    wire();
    // Voices arrive asynchronously in most browsers, and can change when a
    // language pack is added, so the list is rebuilt when the browser says so.
    window.speechSynthesis.addEventListener("voiceschanged", fill);
  }

  window.SVVoice = { pick: pick };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
