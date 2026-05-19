// SilentVoice AI — app.js v4.0 — 3D SVG icons embedded

// ── 3D SVG ICONS ─────────────────────────────────────
const SVG = {
  water: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0369a1"/></linearGradient><filter id="wf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0369a1" flood-opacity="0.5"/></filter></defs><path filter="url(#wf)" d="M28 4C28 4 10 24 10 36C10 46.5 18.5 52 28 52C37.5 52 46 46.5 46 36C46 24 28 4 28 4Z" fill="url(#wg)"/><ellipse cx="21" cy="27" rx="4" ry="7" transform="rotate(-20 21 27)" fill="white" opacity="0.3"/></svg>`,

  help: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient><filter id="hf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#6d28d9" flood-opacity="0.5"/></filter></defs><g filter="url(#hf)"><path d="M28 8C28 8 16 16 16 24C16 28 18 30 20 31L18 48L38 48L36 31C38 30 40 28 40 24C40 16 28 8 28 8Z" fill="url(#hg)"/><ellipse cx="23" cy="19" rx="3" ry="5" fill="white" opacity="0.25"/></g></svg>`,

  tired: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#b45309"/></linearGradient><filter id="tf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#b45309" flood-opacity="0.4"/></filter></defs><circle filter="url(#tf)" cx="28" cy="28" r="22" fill="url(#tg)"/><path d="M18 22 Q22 19 26 22" stroke="#92400e" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M30 22 Q34 19 38 22" stroke="#92400e" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 38 Q28 34 36 38" stroke="#92400e" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="17" rx="3" ry="4" fill="white" opacity="0.28"/></svg>`,

  good: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#86efac"/><stop offset="100%" stop-color="#15803d"/></linearGradient><filter id="gf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#15803d" flood-opacity="0.4"/></filter></defs><circle filter="url(#gf)" cx="28" cy="28" r="22" fill="url(#gg)"/><circle cx="21" cy="23" r="3.5" fill="#14532d"/><circle cx="35" cy="23" r="3.5" fill="#14532d"/><path d="M19 34 Q28 44 37 34" stroke="#14532d" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="17" rx="3" ry="4" fill="white" opacity="0.28"/></svg>`,

  assistance: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#b91c1c"/></linearGradient><filter id="af"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#b91c1c" flood-opacity="0.5"/></filter></defs><circle filter="url(#af)" cx="28" cy="28" r="22" fill="url(#ag)"/><rect x="24" y="12" width="8" height="32" rx="4" fill="white" opacity="0.95"/><rect x="12" y="24" width="32" height="8" rx="4" fill="white" opacity="0.95"/></svg>`,

  toilet: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tog" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#92400e"/></linearGradient><filter id="tof"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#92400e" flood-opacity="0.5"/></filter></defs><g filter="url(#tof)"><rect x="20" y="14" width="16" height="8" rx="2" fill="#fde68a"/><rect x="16" y="22" width="24" height="10" rx="3" fill="url(#tog)"/><ellipse cx="28" cy="40" rx="16" ry="12" fill="url(#tog)"/><ellipse cx="28" cy="40" rx="9" ry="6" fill="#92400e" opacity="0.2"/></g></svg>`,

  yes: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="yg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#047857"/></linearGradient><filter id="yf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#047857" flood-opacity="0.5"/></filter></defs><circle filter="url(#yf)" cx="28" cy="28" r="22" fill="url(#yg)"/><path d="M14 28 L23 38 L42 18" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,

  no: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f9a8d4"/><stop offset="100%" stop-color="#be185d"/></linearGradient><filter id="nf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#be185d" flood-opacity="0.5"/></filter></defs><circle filter="url(#nf)" cx="28" cy="28" r="22" fill="url(#ng)"/><path d="M18 18 L38 38 M38 18 L18 38" stroke="white" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`,

  pause: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#93c5fd"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient><filter id="pf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1d4ed8" flood-opacity="0.5"/></filter></defs><circle filter="url(#pf)" cx="28" cy="28" r="22" fill="url(#pg)"/><rect x="17" y="18" width="7" height="20" rx="3.5" fill="white" opacity="0.95"/><rect x="32" y="18" width="7" height="20" rx="3.5" fill="white" opacity="0.95"/></svg>`,

  loud: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a5b4fc"/><stop offset="100%" stop-color="#4338ca"/></linearGradient><filter id="lf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#4338ca" flood-opacity="0.5"/></filter></defs><circle filter="url(#lf)" cx="28" cy="28" r="22" fill="url(#lg)"/><path d="M16 22 L24 22 L32 14 L32 42 L24 34 L16 34 Z" fill="white" opacity="0.9"/><line x1="34" y1="16" x2="42" y2="40" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>`,

  quiet: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="qg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#065f46"/></linearGradient></defs><circle cx="28" cy="28" r="22" fill="url(#qg)"/><path d="M16 22 L24 22 L32 14 L32 42 L24 34 L16 34 Z" fill="white" opacity="0.9"/><line x1="36" y1="18" x2="44" y2="38" stroke="white" stroke-width="3.5" stroke-linecap="round"/></svg>`,

  medication: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f0abfc"/><stop offset="100%" stop-color="#86198f"/></linearGradient><filter id="mf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#86198f" flood-opacity="0.5"/></filter></defs><rect filter="url(#mf)" x="10" y="20" width="36" height="22" rx="11" fill="url(#mg)"/><line x1="28" y1="20" x2="28" y2="42" stroke="white" stroke-width="2.5"/><ellipse cx="19" cy="31" rx="9" ry="11" fill="#e879f9" opacity="0.4"/></svg>`,

  nurse: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="nrg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#075985"/></linearGradient><filter id="nrf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#075985" flood-opacity="0.5"/></filter></defs><circle filter="url(#nrf)" cx="28" cy="18" r="10" fill="url(#nrg)"/><path d="M12 50 C12 36 44 36 44 50" fill="url(#nrg)"/><rect x="24" y="10" width="8" height="3" rx="1.5" fill="white" opacity="0.9"/><rect x="26.5" y="8" width="3" height="8" rx="1.5" fill="white" opacity="0.9"/></svg>`,

  default: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="22" fill="#334155"/><circle cx="28" cy="22" r="5" fill="white" opacity="0.9"/><rect x="24" y="30" width="8" height="14" rx="4" fill="white" opacity="0.9"/></svg>`
};

const ICON_MAP = {
  "I need water": SVG.water,
  "I need help": SVG.help,
  "I am tired": SVG.tired,
  "I feel good": SVG.good,
  "I need assistance": SVG.assistance,
  "I need the toilet": SVG.toilet,
  "Yes": SVG.yes,
  "No": SVG.no,
  "I need a break": SVG.pause,
  "It is too loud": SVG.loud,
  "I need quiet": SVG.quiet,
  "I need medication": SVG.medication,
  "Please call the nurse": SVG.nurse,
  "Call the nurse": SVG.nurse,
  "I am uncomfortable": SVG.tired,
  "I am overwhelmed": SVG.tired,
  "I am anxious": SVG.tired,
  "I am in pain": SVG.assistance,
  "I cannot speak now": SVG.quiet,
  "I cannot move": SVG.pause,
  "I am confused": SVG.tired,
  "Please be patient": SVG.pause,
  "I understand": SVG.yes,
  "Please wait": SVG.pause,
  "I need space": SVG.pause,
  "I need more time": SVG.pause,
  "Adjust my position": SVG.toilet,
  "I need to rest": SVG.pause,
  "Thank you": SVG.good,
  "Please call my carer": SVG.nurse,
};

function getIcon(phrase) {
  return ICON_MAP[phrase] || SVG.default;
}

// ── DATA ──────────────────────────────────────────────
const CARD_DATA = {
  general: [
    { text: "I need water",      cc: "cc0" },
    { text: "I need help",       cc: "cc1" },
    { text: "I am tired",        cc: "cc2" },
    { text: "I feel good",       cc: "cc3" },
    { text: "I need assistance", cc: "cc4" },
    { text: "I need the toilet", cc: "cc5" },
    { text: "Yes",               cc: "cc6" },
    { text: "No",                cc: "cc7" },
  ],
  autism: [
    { text: "I need a break",   cc: "cc0" },
    { text: "It is too loud",   cc: "cc1" },
    { text: "I need quiet",     cc: "cc2" },
    { text: "I feel good",      cc: "cc3" },
    { text: "I am overwhelmed", cc: "cc4" },
    { text: "I need more time", cc: "cc5" },
    { text: "Yes",              cc: "cc6" },
    { text: "No",               cc: "cc7" },
  ],
  cerebral_palsy: [
    { text: "I need water",        cc: "cc0" },
    { text: "I need help",         cc: "cc1" },
    { text: "I am uncomfortable",  cc: "cc2" },
    { text: "I feel good",         cc: "cc3" },
    { text: "Adjust my position",  cc: "cc4" },
    { text: "I need medication",   cc: "cc5" },
    { text: "Yes",                 cc: "cc6" },
    { text: "No",                  cc: "cc7" },
  ],
  stroke: [
    { text: "I am in pain",      cc: "cc0" },
    { text: "I need help",       cc: "cc1" },
    { text: "I need medication", cc: "cc2" },
    { text: "Call the nurse",    cc: "cc3" },
    { text: "I am confused",     cc: "cc4" },
    { text: "I need water",      cc: "cc5" },
    { text: "Yes",               cc: "cc6" },
    { text: "No",                cc: "cc7" },
  ],
  voice_loss: [
    { text: "I cannot speak now", cc: "cc0" },
    { text: "I need water",       cc: "cc1" },
    { text: "I am tired",         cc: "cc2" },
    { text: "I need help",        cc: "cc3" },
    { text: "Please be patient",  cc: "cc4" },
    { text: "I understand",       cc: "cc5" },
    { text: "Yes",                cc: "cc6" },
    { text: "No",                 cc: "cc7" },
  ],
};

const PROFILES = [
  { value: "general",        label: "General Communication", icon: "🗣️" },
  { value: "autism",         label: "Autism Support",        icon: "🧩" },
  { value: "cerebral_palsy", label: "Cerebral Palsy Support",icon: "♿" },
  { value: "stroke",         label: "Stroke Recovery",       icon: "🫀" },
  { value: "voice_loss",     label: "Voice Loss Recovery",   icon: "🎙️" },
];

const SUGGESTIONS = {
  morning:   [{icon:"☀️",text:'"Good morning"'},{icon:"🍳",text:'"I need breakfast"'},{icon:"😴",text:'"I slept well"'},{icon:"🚽",text:'"I need the toilet"'}],
  afternoon: [{icon:"🥗",text:'"I need lunch"'},{icon:"💊",text:'"My medication"'},{icon:"😊",text:'"I feel good"'},{icon:"💧",text:'"I need water"'}],
  evening:   [{icon:"🌙",text:'"Good evening"'},{icon:"🍽",text:'"I need dinner"'},{icon:"😴",text:'"I am tired"'},{icon:"📺",text:'"I want the TV"'}],
  night:     [{icon:"🛏",text:'"I need to rest"'},{icon:"💡",text:'"Lights off please"'},{icon:"😣",text:'"I am in pain"'},{icon:"🤲",text:'"I need help"'}],
};

// ── STATE ─────────────────────────────────────────────
let selectedPhrase = "", lastPhrase = "";
let sessionHistory = [];
let carerMode = false, currentMode = "home";
let sessionStart = null, sessionTimer = null;

// ── INIT ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderProfileList();
  loadCards();
  startCamera();
  loadSuggestions();
  startWaveform();
});

// ── CAMERA ────────────────────────────────────────────
async function startCamera() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById("videoFeed").srcObject = s;
  } catch { }
}

// ── SUGGESTIONS ───────────────────────────────────────
function loadSuggestions() {
  const h = new Date().getHours();
  const k = h>=5&&h<12?"morning":h>=12&&h<17?"afternoon":h>=17&&h<21?"evening":"night";
  document.getElementById("suggestionsChips").innerHTML =
    SUGGESTIONS[k].map(s =>
      `<button class="suggestion-chip" onclick="pickSuggestion(${JSON.stringify(s.text)})">${s.icon} ${s.text}</button>`
    ).join("");
}

function pickSuggestion(text) {
  const clean = text.replace(/"/g,"");
  setPhrase(clean);
  addToHistory(clean, "💬");
}

// ── PROFILE ───────────────────────────────────────────
function renderProfileList() {
  const cur = document.getElementById("profileSelect").value;
  document.getElementById("profileList").innerHTML = PROFILES.map(p =>
    `<div class="profile-item ${p.value===cur?"active":""}" onclick="switchProfile('${p.value}')">
      <span>${p.icon}</span> ${p.label}
      ${p.value===cur?'<span class="check">✓</span>':""}
    </div>`
  ).join("");
}

function switchProfile(val) {
  document.getElementById("profileSelect").value = val;
  loadCards();
  renderProfileList();
}

// ── CARDS ─────────────────────────────────────────────
function loadCards() {
  const profile = document.getElementById("profileSelect").value;
  const cards = CARD_DATA[profile] || CARD_DATA.general;
  document.getElementById("cardsGrid").innerHTML = cards.map(c =>
    `<button class="comm-card ${c.cc}" onclick="selectCard(this,'${c.text.replace(/'/g,"\\'")}')">
      <span class="card-icon-3d">${getIcon(c.text)}</span>
      <span class="card-text">${c.text}</span>
    </button>`
  ).join("");
  clearSelection();
}

function selectCard(el, phrase) {
  const already = el.classList.contains("selected");
  document.querySelectorAll(".comm-card.selected").forEach(c=>c.classList.remove("selected"));
  if (!already) {
    el.classList.add("selected");
    setPhrase(phrase);
    addToHistory(phrase, "💬");
  } else { clearSelection(); }
}

// ── PHRASE ────────────────────────────────────────────
function setPhrase(phrase) {
  selectedPhrase = phrase; lastPhrase = phrase;
  document.getElementById("phraseText").textContent = phrase;
  document.getElementById("phraseCursor").style.display = "block";
  const kws = phrase.toLowerCase().split(/\s+/).filter(w=>w.length>2);
  document.getElementById("kwLabel").style.display = kws.length?"block":"none";
  document.getElementById("keywordsDisplay").innerHTML = kws.map(k=>`<span class="keyword-tag">${k}</span>`).join("");
}

function clearSelection() {
  selectedPhrase = "";
  document.getElementById("phraseText").textContent = "Select a card or generate a phrase...";
  document.getElementById("phraseCursor").style.display = "none";
  document.getElementById("kwLabel").style.display = "none";
  document.getElementById("keywordsDisplay").innerHTML = "";
  document.querySelectorAll(".comm-card.selected").forEach(c=>c.classList.remove("selected"));
}

// ── GENERATE ──────────────────────────────────────────
async function generatePhrase() {
  if (!selectedPhrase) { document.getElementById("phraseText").textContent="Please select a card first."; return; }
  const profile = document.getElementById("profileSelect").value;
  document.getElementById("phraseText").textContent = "Generating...";
  document.getElementById("phraseCursor").style.display = "block";
  try {
    const res = await fetch("/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keywords:[selectedPhrase],profile})});
    const data = await res.json();
    setPhrase(data.phrase);
    addToHistory(data.phrase,"✦");
  } catch {
    const f = `I would like ${selectedPhrase.toLowerCase()}, please.`;
    setPhrase(f); addToHistory(f,"✦");
  }
}

// ── SPEAK ─────────────────────────────────────────────
async function speakPhrase() {
  if (!selectedPhrase) return;
  try { await fetch("/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phrase:selectedPhrase})}); } catch {}
}

function repeatPhrase() {
  if (!lastPhrase) return;
  selectedPhrase = lastPhrase;
  document.getElementById("phraseText").textContent = lastPhrase;
  document.getElementById("phraseCursor").style.display = "block";
  speakPhrase();
}

// ── HISTORY ───────────────────────────────────────────
function addToHistory(phrase, icon) {
  if (!phrase||phrase.startsWith("Select")||phrase.startsWith("Please select")) return;
  const time = new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  sessionHistory.unshift({phrase, icon:icon||"💬", time});
  renderHistory();
  updateCarerPanel(phrase);
  updateClinicalPanel();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!sessionHistory.length) { list.innerHTML='<div class="history-empty">No phrases yet this session.</div>'; return; }
  list.innerHTML = sessionHistory.map(i=>
    `<div class="history-item">
      <span class="hi-icon">${i.icon}</span>
      <span class="hi-text">${i.phrase}</span>
      <span class="hi-time">${i.time}</span>
    </div>`
  ).join("");
}

function clearHistory() {
  sessionHistory = []; renderHistory();
  fetch("/history",{method:"DELETE"}).catch(()=>{});
}

function exportHistory() {
  if (!sessionHistory.length) { alert("No history to export."); return; }
  const csv = "Phrase,Time\n"+sessionHistory.map(i=>`"${i.phrase}","${i.time}"`).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = `silentvoice-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ── CARER MODE ────────────────────────────────────────
function toggleCarer() {
  carerMode = document.getElementById("carerToggle").checked;
  document.getElementById("carerPanel").style.display = carerMode?"block":"none";
  if (carerMode && !sessionStart) {
    sessionStart = new Date();
    sessionTimer = setInterval(()=>{
      const d=Math.floor((new Date()-sessionStart)/1000);
      const el=document.getElementById("cstTime");
      if(el) el.textContent=String(Math.floor(d/60)).padStart(2,"0")+":"+String(d%60).padStart(2,"0");
    },1000);
  }
  if (!carerMode) clearInterval(sessionTimer);
}

function updateCarerPanel(phrase) {
  const c=document.getElementById("cstPhrases");
  const l=document.getElementById("carerLastText");
  const a=document.getElementById("cstLast");
  if(c) c.textContent=sessionHistory.length;
  if(l) l.textContent=phrase;
  if(a) a.textContent=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}

function updateClinicalPanel() {
  const t=document.getElementById("clinTotal");
  if(t) t.textContent=sessionHistory.length;
  const freq={};
  sessionHistory.forEach(i=>{freq[i.phrase]=(freq[i.phrase]||0)+1;});
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
  const te=document.getElementById("clinTop");
  if(te&&top) te.textContent=top[0];
}

// ── MODE SWITCH ───────────────────────────────────────
function setMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const cp=document.getElementById("clinicalPanel");
  const layout=document.getElementById("mainLayout");
  if(mode==="clinical"){
    if(cp) cp.style.display="block";
    const t=document.getElementById("clinStart");
    if(t) t.textContent=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const p=document.getElementById("clinProfile");
    if(p) p.textContent=PROFILES.find(x=>x.value===document.getElementById("profileSelect").value)?.label||"General";
  } else {
    if(cp) cp.style.display="none";
  }
  if(layout) layout.classList.toggle("family-mode",mode==="family");
}

// ── WAVEFORM ──────────────────────────────────────────
function startWaveform() {
  setInterval(()=>{
    document.querySelectorAll(".waveform span").forEach(s=>{
      s.style.height=(Math.random()*18+3)+"px";
    });
  },120);
}
