const STORAGE_KEY = "life_deck_v2_mc_bayes";
const VERSION = 2;

const GOLD_STREAK = 7;
const GOLD_TOTAL = 14;

const DOUBLE_TAP_MS = 260;
const LONG_PRESS_MS = 520;
const MC_RUNS = 500;
const LOOKBACK_DAYS = 30;

let app = {
  version: VERSION,
  days: [],
  today: null
};

const CATEGORIES = [
  {
    id: "mind",
    title: "Mind",
    habits: [
      "Breathing 1 min","Breathing 3 min","Breathing 5 min","Meditation 3 min","Meditation 10 min","Meditation 15 min",
      "Thought dump 2 min","Thought dump 10 min","Journal 3 lines","Journal 10 min","Gratitude x3","Visualize 2 min",
      "No morning phone","No news","No doomscroll","Read 5 pages","Read 20 min","Learn 10 min","Silence 5 min",
      "Single focus 20 min","Single focus 45 min","Top task touched","Plan tomorrow 3 min","One hard thought faced",
      "Walk without input","Cold clarity breath","Box breathing 3 min","NSDR 10 min","Mind reset","Cognitive cleanup"
    ]
  },
  {
    id: "body",
    title: "Body",
    habits: [
      "Walk 10 min","Walk 30 min","Steps 7k+","Mobility 5 min","Mobility 15 min","Stretch 10 min",
      "Strength 20 min","Strength 45 min","Zone2 20 min","Sprint / intervals","Light sweat","Sauna",
      "Cold shower","Cold plunge","Hydration","Electrolytes","Protein intake","Whole meal","No ultra-processed",
      "Sunlight 10 min","Posture reset","Micro-breaks","Breathing before sleep","Early bedtime","Sleep 7h+",
      "Sleep routine","No caffeine after 14:00","Core 10 min","Recovery walk"
    ]
  },
  {
    id: "discipline",
    title: "Discipline",
    habits: [
      "No excuses","Kept promise","Did hard thing","Showed up","Start uncomfortable 1 min","Finish task",
      "Single task block","No multitask","Delayed dopamine","No complaining","One boundary","Say no once",
      "Clean space 3 min","Clean space 10 min","Inbox zero 5 min","Minimal day","Phone limit respected",
      "No late screen","Do it now (2 min)","Future-self action","Consistency check","Plan tomorrow","Ship something",
      "No drama","No impulse buy"
    ]
  },
  {
    id: "recovery",
    title: "Recovery",
    habits: [
      "Slow evening","No screen 30 min","No screen 60 min","Calm music","Nature 10 min","Nature 30 min",
      "Hot shower","Breathing box","Body scan 5 min","Body scan 15 min","Nap 10–20 min","Stretch evening",
      "Light walk","Gratitude person","Emotional release","Compassion","Do nothing 10 min","Social safe talk",
      "Low stimulation hour","Read fiction","Tea ritual","Warm light only","Noise off","Early wind-down"
    ]
  },
  {
    id: "purpose",
    title: "Purpose",
    habits: [
      "Deep work 30 min","Deep work 60 min","Project push 15 min","Project push 45 min","Skill practice 20 min",
      "Publish / ship","Network ping","Build asset","Review goals 5 min","Refine plan 10 min","One brave ask",
      "Long-game yes","Long-game no","Money move","Learn & apply","Teach one thing","Portfolio step",
      "Write 200 words","Roadmap update","Tomorrow setup"
    ]
  }
];

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 1400);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app)); } catch {}
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return;

  if (!parsed.version) parsed.version = 1;
  if (!Array.isArray(parsed.days)) parsed.days = [];

  if (parsed.version < VERSION) {
    parsed.version = VERSION;
  }

  app = parsed;
}

function ensureToday() {
  const d = todayISO();
  let day = app.days.find(x => x.date === d);
  if (!day) {
    day = {
      date: d,
      finalized: false,
      telemetry: { energy: 5, stress: 5, mood: 5, motivation: 5, difficulty: 5, sleep: "ok" },
      notes: "",
      active: [],
      done: {},
      selectedCount: {},
      history: []
    };
    app.days.push(day);
  }
  if (!Array.isArray(day.active)) day.active = [];
  if (!day.done || typeof day.done !== "object") day.done = {};
  if (!day.selectedCount || typeof day.selectedCount !== "object") day.selectedCount = {};
  if (!Array.isArray(day.history)) day.history = [];
  if (!day.telemetry) day.telemetry = { energy: 5, stress: 5, mood: 5, motivation: 5, difficulty: 5, sleep: "ok" };
  if (!("notes" in day)) day.notes = "";
  app.today = day;
}

function allHabitKeys() {
  const keys = [];
  for (const cat of CATEGORIES) {
    for (const name of cat.habits) keys.push(`${cat.id}:${name}`);
  }
  return keys;
}

function band(val, edges) {
  for (let i = 0; i < edges.length; i++) if (val <= edges[i]) return i;
  return edges.length;
}

function computeReadiness(t, doneRatio) {
  const base = (t.energy + (11 - t.stress) + t.mood + t.motivation) / 40;
  let sleepAdj = 0;
  if (t.sleep === "good") sleepAdj = 0.08;
  else if (t.sleep === "bad") sleepAdj = -0.12;
  const diffPenalty = (t.difficulty - 5) / 25;
  const habitBonus = (doneRatio || 0) * 0.15;
  const r = Math.round(Math.max(0, Math.min(1, base + sleepAdj - diffPenalty + habitBonus)) * 100);
  return r;
}

function computeMomentum(readiness, doneCount, activeCount) {
  const ratio = activeCount ? doneCount / activeCount : 0;
  const quality = 0.7 + (readiness / 100) * 0.6;
  let m = Math.round(Math.max(0, Math.min(100, (ratio * 100) * quality)));
  return m;
}

function getLookbackDays(refDate, n) {
  const sorted = [...app.days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const idx = sorted.findIndex(x => x.date === refDate);
  const slice = idx >= 0 ? sorted.slice(Math.max(0, idx - n), idx) : sorted.slice(Math.max(0, sorted.length - n));
  return slice.filter(d => d.finalized);
}

function bayesProbDone(habitKey, ctx) {
  const look = getLookbackDays(app.today.date, LOOKBACK_DAYS);
  let trials = 0;
  let success = 0;

  const rb = band(ctx.readiness, [35, 50, 65, 80]);
  const sb = band(ctx.stress, [3, 5, 7, 9]);
  const eb = band(ctx.energy, [3, 5, 7, 9]);

  for (const d of look) {
    const r = d.summary?.readiness ?? 50;
    const t = d.telemetry || {};
    const rb2 = band(r, [35, 50, 65, 80]);
    const sb2 = band(t.stress ?? 5, [3, 5, 7, 9]);
    const eb2 = band(t.energy ?? 5, [3, 5, 7, 9]);

    if (rb2 !== rb || sb2 !== sb || eb2 !== eb) continue;

    const sel = d.selectedCount?.[habitKey] ? 1 : 0;
    if (!sel) continue;

    trials++;
    if (d.history?.some(x => x.k === habitKey && x.done)) success++;
  }

  const alpha = 1, beta = 1;
  const p = (success + alpha) / (trials + alpha + beta);

  const overall = overallProbDone(habitKey);
  return 0.65 * p + 0.35 * overall;
}

function overallProbDone(habitKey) {
  const look = getLookbackDays(app.today.date, LOOKBACK_DAYS);
  let trials = 0, success = 0;
  for (const d of look) {
    const sel = d.selectedCount?.[habitKey] ? 1 : 0;
    if (!sel) continue;
    trials++;
    if (d.history?.some(x => x.k === habitKey && x.done)) success++;
  }
  const alpha = 1, beta = 1;
  return (success + alpha) / (trials + alpha + beta);
}

function monteCarloTomorrow(activeKeys, ctx) {
  if (!activeKeys.length) return 0;

  let wins = 0;
  const threshold = Math.max(1, Math.ceil(activeKeys.length * 0.6));

  for (let i = 0; i < MC_RUNS; i++) {
    let done = 0;
    for (const k of activeKeys) {
      const p = bayesProbDone(k, ctx);
      if (Math.random() < p) done++;
    }
    if (done >= threshold) wins++;
  }
  return Math.round((wins / MC_RUNS) * 100);
}

function computeGoldSet() {
  const totals = {};
  const streak = {};
  const gold = new Set();

  const sorted = [...app.days].filter(d => d.finalized).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const d of sorted) {
    const selectedKeys = Object.keys(d.selectedCount || {}).filter(k => d.selectedCount[k] > 0);
    const selectedSet = new Set(selectedKeys);

    for (const k of selectedKeys) {
      totals[k] = (totals[k] || 0) + 1;
    }

    for (const k of Object.keys(totals)) {
      if (selectedSet.has(k)) streak[k] = (streak[k] || 0) + 1;
      else streak[k] = 0;

      if (streak[k] >= GOLD_STREAK || (totals[k] || 0) >= GOLD_TOTAL) gold.add(k);
    }
  }

  return { gold, totals, streak };
}

function setHub(readiness, momentum, tomorrowPct) {
  document.getElementById("hubReadiness").textContent = `${readiness}%`;
  document.getElementById("hubMomentum").textContent = `${momentum}`;
  document.getElementById("hubTomorrow").textContent = `${tomorrowPct}%`;
}

function setTodayLabels() {
  const d = app.today.date;
  document.getElementById("todayLabel").textContent = d;
  document.getElementById("todayCount").textContent = `${app.today.active.length} cards`;
}

function makeCard({ title, desc, metaL, metaR, done, gold }) {
  const el = document.createElement("div");
  el.className = "card";
  if (done) el.classList.add("done");
  if (gold) el.classList.add("gold");

  const t = document.createElement("div");
  t.className = "title";
  t.textContent = title;

  const d = document.createElement("div");
  d.className = "desc";
  d.textContent = desc || "";

  const m = document.createElement("div");
  m.className = "meta";
  const ml = document.createElement("span");
  ml.textContent = metaL || "";
  const mr = document.createElement("span");
  mr.textContent = metaR || "";
  m.appendChild(ml);
  m.appendChild(mr);

  el.appendChild(t);
  el.appendChild(d);
  el.appendChild(m);
  return el;
}

function attachTapHandlers(el, key, mode) {
  let pressTimer = null;
  let longPressed = false;

  el.addEventListener("pointerdown", () => {
    longPressed = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      if (mode === "active") {
        removeFromToday(key);
        toast("Removed");
      }
    }, LONG_PRESS_MS);
  });

  const cancel = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("pointerleave", cancel);

  el.addEventListener("click", () => {
    if (longPressed) return;

    const now = Date.now();
    if (attachTapHandlers._lastKey === key && now - (attachTapHandlers._lastAt || 0) <= DOUBLE_TAP_MS) {
      attachTapHandlers._lastKey = null;
      attachTapHandlers._lastAt = 0;

      if (mode === "library") {
        addToToday(key);
        toast("Added");
      } else if (mode === "active") {
        toggleDone(key);
      }
      return;
    }
    attachTapHandlers._lastKey = key;
    attachTapHandlers._lastAt = now;
  });
}

function addToToday(key) {
  if (app.today.finalized) return;
  if (!app.today.active.includes(key)) {
    app.today.active.push(key);
    app.today.done[key] = false;
  }
  save();
  renderAll();
}

function removeFromToday(key) {
  if (app.today.finalized) return;
  app.today.active = app.today.active.filter(k => k !== key);
  delete app.today.done[key];
  save();
  renderAll();
}

function toggleDone(key) {
  if (app.today.finalized) return;
  if (!app.today.active.includes(key)) return;
  app.today.done[key] = !app.today.done[key];
  save();
  renderAll();
}

function finalizeDay() {
  if (app.today.finalized) return;

  const active = [...app.today.active];
  const hist = [];
  for (const k of active) {
    app.today.selectedCount[k] = (app.today.selectedCount[k] || 0) + 1;
    const done = !!app.today.done[k];
    hist.push({ k, done });
  }
  app.today.history = hist;

  const doneCount = active.filter(k => !!app.today.done[k]).length;
  const doneRatio = active.length ? doneCount / active.length : 0;

  const t = app.today.telemetry || {};
  const readiness = computeReadiness(t, doneRatio);
  const momentum = computeMomentum(readiness, doneCount, active.length);

  app.today.summary = { readiness, momentum, doneCount, activeCount: active.length };
  app.today.finalized = true;

  app.today.active = [];
  app.today.done = {};

  save();
  toast("Finalized");
  renderAll();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(app, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "life_deck_data.json";
  a.click();
}

function renderHome(goldSet) {
  const rail = document.getElementById("activeRail");
  rail.innerHTML = "";

  const active = app.today.active;
  document.getElementById("homeEmpty").style.display = active.length ? "none" : "block";

  for (const key of active) {
    const name = key.split(":")[1];
    const done = !!app.today.done[key];
    const g = goldSet.has(key);

    const card = makeCard({
      title: name,
      desc: done ? "Done today" : "Double tap to mark done",
      metaL: g ? "Gold" : "Active",
      metaR: done ? "✓" : "•",
      done,
      gold: g
    });

    attachTapHandlers(card, key, "active");
    rail.appendChild(card);
  }
}

function renderLibrary(goldSet) {
  const out = document.getElementById("librarySections");
  out.innerHTML = "";

  for (const cat of CATEGORIES) {
    const head = document.createElement("div");
    head.className = "sectionTitle";
    head.textContent = cat.title;

    const wrap = document.createElement("div");
    wrap.className = "railWrap";

    const rail = document.createElement("div");
    rail.className = "rail";

    for (const h of cat.habits) {
      const key = `${cat.id}:${h}`;
      const isGold = goldSet.has(key);

      const card = makeCard({
        title: h,
        desc: "Double tap to add to Today",
        metaL: isGold ? "Gold" : "Library",
        metaR: isGold ? "★" : "",
        done: false,
        gold: isGold
      });

      attachTapHandlers(card, key, "library");
      rail.appendChild(card);
    }

    wrap.appendChild(rail);
    out.appendChild(head);
    out.appendChild(wrap);
  }
}

function renderGold(goldSet, totals, streak) {
  const rail = document.getElementById("goldRail");
  rail.innerHTML = "";

  const goldKeys = [...goldSet].sort((a, b) => (a < b ? -1 : 1));
  document.getElementById("goldCount").textContent = `${goldKeys.length}`;
  document.getElementById("goldEmpty").style.display = goldKeys.length ? "none" : "block";

  for (const key of goldKeys) {
    const name = key.split(":")[1];
    const total = totals[key] || 0;
    const st = streak[key] || 0;

    const card = makeCard({
      title: name,
      desc: "Identity locked",
      metaL: `Total ${total}`,
      metaR: `Streak ${st}`,
      gold: true
    });

    rail.appendChild(card);
  }
}

function renderTelemetry() {
  const t = app.today.telemetry;

  const fields = ["energy", "stress", "mood", "motivation", "difficulty"];
  for (const f of fields) {
    const input = document.querySelector(`input[data-field="${f}"]`);
    if (input) input.value = t[f] ?? 5;
    const label = document.getElementById(`${f}Label`);
    if (label) label.textContent = `${t[f] ?? 5}/10`;
  }

  const sel = document.querySelector(`select[data-field="sleep"]`);
  if (sel) sel.value = t.sleep || "ok";
  const sleepLabel = document.getElementById("sleepLabel");
  if (sleepLabel) sleepLabel.textContent = (t.sleep || "ok").toUpperCase();

  const notes = document.getElementById("notes");
  if (notes) notes.value = app.today.notes || "";
}

function updateScoreboard(goldSet) {
  const active = app.today.active;
  const doneCount = active.filter(k => !!app.today.done[k]).length;
  const doneRatio = active.length ? doneCount / active.length : 0;

  const t = app.today.telemetry;
  const readiness = computeReadiness(t, doneRatio);
  const momentum = computeMomentum(readiness, doneCount, active.length);

  const ctx = {
    readiness,
    stress: t.stress ?? 5,
    energy: t.energy ?? 5
  };

  const tomorrowKeys = active.length ? active : [...goldSet].slice(0, 6);
  const tomorrowPct = monteCarloTomorrow(tomorrowKeys, ctx);

  setHub(readiness, momentum, tomorrowPct);
}

function renderAll() {
  const { gold, totals, streak } = computeGoldSet();

  setTodayLabels();
  renderHome(gold);
  renderLibrary(gold);
  renderGold(gold, totals, streak);
  renderTelemetry();
  updateScoreboard(gold);

  save();
}

function switchView(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  const btn = document.querySelector(`.tab[data-view="${id}"]`);
  if (btn) btn.classList.add("active");

  const view = document.getElementById(`view-${id}`);
  if (view) view.classList.add("active");
}

function bindNav() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function bindTelemetry() {
  document.querySelectorAll('input[type="range"][data-field]').forEach(input => {
    input.addEventListener("input", () => {
      if (app.today.finalized) return;
      const f = input.dataset.field;
      app.today.telemetry[f] = Number(input.value);
      const label = document.getElementById(`${f}Label`);
      if (label) label.textContent = `${input.value}/10`;
      renderAll();
    });
  });

  const sel = document.querySelector('select[data-field="sleep"]');
  if (sel) {
    sel.addEventListener("change", () => {
      if (app.today.finalized) return;
      app.today.telemetry.sleep = sel.value;
      const sleepLabel = document.getElementById("sleepLabel");
      if (sleepLabel) sleepLabel.textContent = sel.value.toUpperCase();
      renderAll();
    });
  }

  const notes = document.getElementById("notes");
  if (notes) {
    notes.addEventListener("input", () => {
      if (app.today.finalized) return;
      app.today.notes = notes.value;
      save();
    });
  }
}

function bindButtons() {
  const fin = document.getElementById("finalizeBtn");
  if (fin) fin.addEventListener("click", finalizeDay);

  const exp = document.getElementById("exportBtn");
  if (exp) exp.addEventListener("click", exportJSON);
}

function finalDiagnostic() {
  const errs = [];

  if (!document.getElementById("activeRail")) errs.push("Missing #activeRail");
  if (!document.getElementById("librarySections")) errs.push("Missing #librarySections");
  if (!document.getElementById("goldRail")) errs.push("Missing #goldRail");
  if (!document.getElementById("finalizeBtn")) errs.push("Missing #finalizeBtn");
  if (!document.getElementById("hubReadiness")) errs.push("Missing hub readiness");
  if (!document.getElementById("hubMomentum")) errs.push("Missing hub momentum");
  if (!document.getElementById("hubTomorrow")) errs.push("Missing hub tomorrow");

  if (!app.today || !app.today.date) errs.push("Today not initialized");
  if (!Array.isArray(app.days)) errs.push("Days not array");

  if (errs.length) {
    toast("DIAGNOSTIC: " + errs[0]);
  } else {
    toast("READY");
  }
}

function init() {
  load();
  ensureToday();
  bindNav();
  bindTelemetry();
  bindButtons();
  renderAll();
  finalDiagnostic();
}

window.addEventListener("load", init);
