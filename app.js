// FI VARIKKO ENGINE + HABIT REELS

const STORAGE_KEY = "fi_varikko_days_v2";

// Habit-konfiguraatio
const HABITS = [
  {
    id: "wake",
    title: "Herääminen järkevään aikaan",
    desc: "Heräsit suunnilleen suunniteltuun aikaan ilman loputonta torkutusta.",
    weight: 1.2,
  },
  {
    id: "move",
    title: "Liike / treeni",
    desc: "Teit jotain fyysistä: kävely, treeni, venyttely tai edes 10 minuutin liike.",
    weight: 1.4,
  },
  {
    id: "focus",
    title: "Yksi fokus-stintti",
    desc: "Yksi 20–30 min keskittynyt jakso ilman some-scrollia.",
    weight: 1.5,
  },
  {
    id: "fuel",
    title: "Hyvä fuel",
    desc: "Et vetänyt pelkkää roskaa; perus ravinto oli kasassa.",
    weight: 1.1,
  },
  {
    id: "off",
    title: "Off-screen hetki",
    desc: "Vähintään 10–15 min ilman ruutua – hengitys, rauhoittuminen, ulkoilu.",
    weight: 1.3,
  },
  {
    id: "hard",
    title: "Vaikean asian aloitus",
    desc: "Aloitit edes 5 minuutiksi asian, jota olisit mieluummin vältellyt.",
    weight: 1.6,
  },
];

let days = [];
let todayDay = null;
let recomputeTimer = null;

let currentHabitIndex = 0;
let lastHabitTapTime = 0;

// ---- UTIL ----
function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFi(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function setStatus(msg) {
  const el = document.getElementById("statusMessage");
  if (el) el.textContent = msg;
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// ---- STORAGE ----
function loadDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(e);
    setStatus("LocalStorage ei käytettävissä, data vain tältä istunnolta.");
    return [];
  }
}

function saveDays() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
    setStatus("Tallennettu.");
  } catch (e) {
    console.error(e);
    setStatus("Tallennus epäonnistui.");
  }
}

function defaultDay(dateISO) {
  const habitsState = {};
  HABITS.forEach((h) => {
    habitsState[h.id] = { done: false, perfect: false };
  });

  return {
    id: "day_" + dateISO,
    date: dateISO,
    dayType: "race",
    difficulty: 5,
    energy: 5,
    focus: 5,
    bodyLoad: 5,
    stress: 5,
    mood: 5,
    sleep: "ok",
    motivation: 5,
    confidence: 5,
    goal: "progress",
    readiness: 50,
    hardDay: false,
    strategy: "",
    pitPlan: "",
    notes: "",
    habits: habitsState,
    finalized: false,
    createdAt: new Date().toISOString(),
  };
}

function ensureToday() {
  const todayISO = getTodayISO();
  let d = days.find((x) => x.date === todayISO);
  if (!d) {
    d = defaultDay(todayISO);
    days.push(d);
    saveDays();
  } else {
    // varmista että kaikki habitit on olemassa myös vanhoissa korteissa
    if (!d.habits || typeof d.habits !== "object") {
      d.habits = {};
    }
    HABITS.forEach((h) => {
      if (!d.habits[h.id]) {
        d.habits[h.id] = { done: false, perfect: false };
      }
    });
  }
  todayDay = d;
}

// ---- HABIT LOGIIKKA ----
function getHabitStateForDay(day, habitId) {
  if (!day.habits || typeof day.habits !== "object") {
    day.habits = {};
  }
  if (!day.habits[habitId]) {
    day.habits[habitId] = { done: false, perfect: false };
  }
  return day.habits[habitId];
}

function computeHabitConsistency(habitId) {
  if (!days.length) {
    return { percent: 0, doneCount: 0, totalDays: 0 };
  }
  let doneCount = 0;
  let total = 0;
  days.forEach((d) => {
    if (!d.habits) return;
    const st = d.habits[habitId];
    if (!st) return;
    total += 1;
    if (st.done) doneCount += 1;
  });
  if (!total) return { percent: 0, doneCount: 0, totalDays: 0 };
  const percent = Math.round((doneCount / total) * 100);
  return { percent, doneCount, totalDays: total };
}

function computeHabitScoreForDay(day) {
  if (!day.habits) return 0;
  let doneCount = 0;
  let perfectBonus = 0;
  HABITS.forEach((h) => {
    const st = day.habits[h.id];
    if (!st) return;
    if (st.done) {
      doneCount += 1;
      if (st.perfect) perfectBonus += 0.5;
    }
  });
  if (HABITS.length === 0) return 0;
  const raw = (doneCount + perfectBonus) / (HABITS.length * 1.5); // ~0..1
  return clamp01(raw);
}

// ---- ENGINE: READINESS & STRATEGY ----
function computeReadiness(day) {
  // Positiiviset signaalit
  const posAvg =
    (day.energy + day.focus + day.motivation + day.confidence) / (4 * 10);

  // Stressi & vaikeus penaltiot
  const stressPenalty = (day.stress - 5) / 20; // -0.25..+0.25
  const difficultyPenalty = (day.difficulty - 5) / 22; // -0.22..+0.22

  let sleepBonus = 0;
  if (day.sleep === "good") sleepBonus = 0.08;
  else if (day.sleep === "bad") sleepBonus = -0.12;

  const bodyPenalty = (day.bodyLoad - 5) / 22;

  // Habit-bonus
  const habitScore = computeHabitScoreForDay(day); // 0..1
  const habitBonus = habitScore * 0.08; // max +8%

  let readiness =
    posAvg + sleepBonus - stressPenalty - difficultyPenalty - bodyPenalty + habitBonus;
  readiness = clamp01(readiness);
  day.readiness = Math.round(readiness * 100);

  // Hard day -logiikka
  const isHard =
    day.difficulty >= 7 ||
    (day.energy <= 4 && day.stress >= 7) ||
    (day.sleep === "bad" && day.stress >= 6);
  day.hardDay = !!isHard;

  const { strategy, pitPlan } = buildStrategy(day, habitScore);
  day.strategy = strategy;
  day.pitPlan = pitPlan;
}

function buildStrategy(day, habitScore) {
  const r = day.readiness;
  const hard = day.hardDay;
  const lines = [];
  const pit = [];

  if (hard) {
    lines.push("Tämä on HARD DAY -tila. Tavoite: ehjänä maaliin + yksi pieni voitto.");
  } else if (day.goal === "push" && r >= 70) {
    lines.push("Auto on kilpailukykyinen. PB-päivä on realistinen mieli–keho -pakettiin.");
  } else if (day.goal === "progress") {
    lines.push("Fokus: pieni, selkeä kehitys yhdellä alueella – ei täydellisyyttä.");
  } else {
    lines.push("Fokus: pidä auto radalla ilman isoja virheitä.");
  }

  const habitPct = Math.round(habitScore * 100);
  if (habitPct >= 66) {
    lines.push(
      `Habit-stack on vahva (${habitPct} %). Päivän suoritus rakentuu jo rutiinin päälle – älä riko ketjua.`
    );
  } else if (habitPct >= 33) {
    lines.push(
      `Habitteja on jo alussa (${habitPct} %). Lisää yksi habit tänään, älä yritä täydellistä pakettia.`
    );
  } else {
    lines.push(
      `Habitstack on vielä matala (${habitPct} %). Yksi tehty habit vaikeana päivänä on arvokkaampi kuin viisi helppona.`
    );
  }

  if (hard) {
    lines.push("Stint-suositus: 2–3 lyhyttä jaksoa, ei kokopäivän täyskaasua.");
    pit.push("2 x 20–25 min keskittynyt työ (ei somea). ");
    pit.push("1 x 10–15 min kevyt, palauttava stintti (kävely, venyttely, hengitys). ");
    pit.push("Kulta sääntö: 1) lyhyet stintit 2) ei tulospaineita 3) sulje 1 selkeä häiriö. ");
  } else if (r >= 75) {
    lines.push("Stint-suositus: voimakkaampi kisa, hyödynnä kunto ja habit-bonus.");
    pit.push("3 x 35–45 min syvää fokusta, välissä 8–10 min tauko. ");
    pit.push("Yksi “push lap” -hetki, jossa teet jotain tavallista rohkeamman liikkeen. ");
  } else {
    lines.push("Stint-suositus: kontrolloitu päivä, ei maksimaalista riskiä.");
    pit.push("2 x 30 min fokusoitu stintti päivän tärkeimpiin asioihin. ");
    pit.push("1 x 15–20 min huoltojakso (liike + rauhoittava hengitys). ");
  }

  return {
    strategy: lines.join(" "),
    pitPlan: pit.join(""),
  };
}

// ---- PIT RADIO ----
function updatePitRadio(day) {
  const statusEl = document.getElementById("pitStatus");
  const msgEl = document.getElementById("pitMessage");
  if (!statusEl || !msgEl) return;

  const r = day.readiness;
  const hard = day.hardDay;

  const habitScore = computeHabitScoreForDay(day);
  const habitPct = Math.round(habitScore * 100);

  if (hard) {
    statusEl.textContent = `VARIKKO: HARD DAY MODE – readiness ${r} %`;
    let msg = "Kuljettaja, tämä on raskas rata tänään. ";
    if (day.energy <= 4) {
      msg += "Fuel matala, älä luota pelkkään tahdonvoimaan – tee lyhyitä stinttejä, joilla on selkeä alku ja loppu. ";
    }
    if (day.stress >= 7) {
      msg += "Liikennettä paljon radalla (stressi korkea). Nosta näkyvyys: 5–10 min kävely tai hengitys ennen isoja päätöksiä. ";
    }
    if (habitPct > 0) {
      msg += `Vaikeasta päivästä huolimatta habitstack ${habitPct} %. Yksi tehty kortti on jo voitto. `;
    } else {
      msg += "Varikko suosittelee: aloita tänään yhdestä habit-kortista, ei paketista. ";
    }
    msg += "Varikko: hyväksy hard mode, älä tuomitse itseäsi.";
    msgEl.textContent = msg;
  } else {
    statusEl.textContent = `VARIKKO: READY – readiness ${r} %`;
    let msg = "Auto on ajokunnossa. ";
    if (r >= 75) {
      msg += "Päivä näyttää vahvalta – tämä on hyvä hetki testata rajoja turvallisesti. ";
    } else {
      msg += "Aja siististi, ilman turhaa riskiä. ";
    }
    if (habitPct >= 50) {
      msg += `Habitit tukevat kisaa (${habitPct} %). Jatka korttien keräämistä pitkin päivää. `;
    } else {
      msg += "Nosta päivää tekemällä 1–2 habit-korttia valmiiksi. ";
    }
    msgEl.textContent = msg;
  }
}

// ---- RENDER TODAY ----
function renderToday() {
  if (!todayDay) return;
  const d = todayDay;

  computeReadiness(d);

  const dateLabel = document.getElementById("todayDateLabel");
  if (dateLabel) {
    dateLabel.textContent = `Päivä: ${formatFi(d.date)} ${
      d.finalized ? "· LUKITTU" : ""
    }`;
  }
  const readinessEl = document.getElementById("readinessValue");
  if (readinessEl) readinessEl.textContent = `${d.readiness} %`;

  // Tagit
  const dayModeTag = document.getElementById("dayModeTag");
  if (dayModeTag) {
    let txt = "MODE: ";
    if (d.dayType === "practice") txt += "HARJOITUS";
    else if (d.dayType === "qualifying") txt += "KARSINTA";
    else if (d.dayType === "safety") txt += "SAFETY CAR";
    else txt += "RACE";
    dayModeTag.textContent = txt;
  }
  const hardTag = document.getElementById("hardDayTag");
  if (hardTag) {
    hardTag.textContent = d.hardDay ? "PÄIVÄ: HARD DAY" : "PÄIVÄ: NORMAALI";
  }

  const habitSummaryTag = document.getElementById("habitSummaryTag");
  if (habitSummaryTag) {
    const habitScore = computeHabitScoreForDay(d);
    const habitPct = Math.round(habitScore * 100);
    let txt = `HABIT: ${habitPct} %`;
    habitSummaryTag.textContent = txt;
  }

  // Input label helper
  const setLabel = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${val}/10`;
  };

  setLabel("difficultyLabel", d.difficulty);
  setLabel("energyLabel", d.energy);
  setLabel("focusLabel", d.focus);
  setLabel("bodyLoadLabel", d.bodyLoad);
  setLabel("stressLabel", d.stress);
  setLabel("moodLabel", d.mood);
  setLabel("motivationLabel", d.motivation);
  setLabel("confidenceLabel", d.confidence);

  const dayTypeSelect = document.querySelector("select[data-field='dayType']");
  if (dayTypeSelect) dayTypeSelect.value = d.dayType;

  const sleepSelect = document.querySelector("select[data-field='sleep']");
  if (sleepSelect) sleepSelect.value = d.sleep;

  const goalSelect = document.querySelector("select[data-field='goal']");
  if (goalSelect) goalSelect.value = d.goal;

  const sliderMap = {
    difficulty: d.difficulty,
    energy: d.energy,
    focus: d.focus,
    bodyLoad: d.bodyLoad,
    stress: d.stress,
    mood: d.mood,
    motivation: d.motivation,
    confidence: d.confidence,
  };

  Object.entries(sliderMap).forEach(([field, value]) => {
    const input = document.querySelector(`input[type="range"][data-field="${field}"]`);
    if (input) input.value = value;
  });

  const notesEl = document.getElementById("notes");
  if (notesEl) {
    notesEl.value = d.notes || "";
    notesEl.disabled = d.finalized;
  }

  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn) {
    finalizeBtn.disabled = d.finalized;
    finalizeBtn.textContent = d.finalized
      ? "Telemetria lukittu tälle päivälle"
      : "Lukitse telemetria tälle päivälle";
  }

  // Strategia
  const stintSummary = document.getElementById("stintSummary");
  const pitPlan = document.getElementById("pitPlan");
  if (stintSummary) stintSummary.textContent = d.strategy || "";
  if (pitPlan) pitPlan.textContent = d.pitPlan || "";

  updatePitRadio(d);
  renderHabitReel();
  renderHistory();
}

// ---- HABIT REEL RENDER ----
function renderHabitReel() {
  const reelEl = document.getElementById("habitReel");
  const dotsEl = document.getElementById("habitDots");
  if (!reelEl || !dotsEl || !todayDay) return;

  const habit = HABITS[currentHabitIndex];
  const state = getHabitStateForDay(todayDay, habit.id);
  const consistency = computeHabitConsistency(habit.id);

  reelEl.innerHTML = "";

  const card = document.createElement("div");
  card.className = "habit-card";
  if (state.done) card.classList.add("done");
  if (state.perfect) card.classList.add("perfect");

  const statusText = state.perfect
    ? "Perfect · tehty erittäin hyvin"
    : state.done
    ? "Tehty tälle päivälle"
    : "Ei vielä tehty";

  const consistencyText =
    consistency.totalDays > 0
      ? `Consistency: ${consistency.percent}% (${consistency.doneCount}/${consistency.totalDays} päivää)`
      : "Consistency: 0% (aloita kortin kerääminen)";

  const hintText = state.perfect
    ? "Tuplaklikkaa / tuplanapauta nollataksesi kortin."
    : state.done
    ? "Tuplaklikkaa / tuplanapauta tehdäksesi tästä 'perfect stintin'."
    : "Tuplaklikkaa / tuplanapauta merkkaamaan habit tehdyn.";

  card.innerHTML = `
    <div class="habit-card-header">
      <div class="habit-title">${habit.title}</div>
      <span class="habit-status-pill">${statusText}</span>
    </div>
    <p class="habit-desc">${habit.desc}</p>
    <div class="habit-meta">
      <span class="habit-consistency">${consistencyText}</span>
      <span class="habit-hint">${hintText}</span>
    </div>
  `;

  // Double-click / double-tap
  card.addEventListener("dblclick", () => {
    toggleHabitState();
  });

  card.addEventListener(
    "touchstart",
    (e) => {
      const now = Date.now();
      const delta = now - lastHabitTapTime;
      lastHabitTapTime = now;
      if (delta < 280) {
        e.preventDefault();
        toggleHabitState();
      }
    },
    { passive: false }
  );

  // Swipe vasen / oikea
  let touchStartX = null;
  card.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
    },
    { passive: true }
  );

  card.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX == null) return;
      const t = e.changedTouches[0];
      const deltaX = t.clientX - touchStartX;
      const threshold = 35;
      if (deltaX < -threshold) {
        nextHabit();
      } else if (deltaX > threshold) {
        prevHabit();
      }
      touchStartX = null;
    },
    { passive: true }
  );

  reelEl.appendChild(card);

  // Dots
  dotsEl.innerHTML = "";
  HABITS.forEach((h, idx) => {
    const dot = document.createElement("div");
    dot.className = "habit-dot";
    if (idx === currentHabitIndex) dot.classList.add("active");
    dotsEl.appendChild(dot);
  });
}

function nextHabit() {
  currentHabitIndex = (currentHabitIndex + 1) % HABITS.length;
  renderHabitReel();
}

function prevHabit() {
  currentHabitIndex =
    (currentHabitIndex - 1 + HABITS.length) % HABITS.length;
  renderHabitReel();
}

function toggleHabitState() {
  if (!todayDay) return;
  const habit = HABITS[currentHabitIndex];
  const state = getHabitStateForDay(todayDay, habit.id);

  // kolme tilaa: off -> done -> perfect -> off
  if (!state.done && !state.perfect) {
    state.done = true;
    state.perfect = false;
  } else if (state.done && !state.perfect) {
    state.done = true;
    state.perfect = true;
  } else {
    state.done = false;
    state.perfect = false;
  }

  scheduleRecompute();
}

// ---- HISTORY ----
function computeHabitSummaryText(day) {
  if (!day.habits) return "Habit: 0/" + HABITS.length;
  let done = 0;
  let perfect = 0;
  HABITS.forEach((h) => {
    const st = day.habits[h.id];
    if (!st) return;
    if (st.done) done += 1;
    if (st.perfect) perfect += 1;
  });
  return `Habit: ${done}/${HABITS.length} (${perfect} perfect)`;
}

function renderHistory() {
  const listEl = document.getElementById("historyList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!days.length) {
    const p = document.createElement("p");
    p.textContent = "Ei vielä telemetriaa. Aloita täyttämällä tämän päivän rata.";
    p.style.fontSize = "0.85rem";
    p.style.color = "#a7b0d9";
    listEl.appendChild(p);
    return;
  }

  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((d) => {
    computeReadiness(d);
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.dayId = d.id;

    const tag =
      d.hardDay && d.readiness >= 40
        ? "Hard day, mutta maaliin"
        : d.hardDay
        ? "Hard day"
        : d.readiness >= 70
        ? "Kova kisa"
        : "Peruspäivä";

    const habitSummary = computeHabitSummaryText(d);

    div.innerHTML = `
      <div class="history-item-date">${formatFi(d.date)}</div>
      <div class="history-item-score">Readiness ${d.readiness}%</div>
      <div class="history-item-tag">${habitSummary}</div>
      <div class="history-item-tag">${tag}</div>
    `;

    div.addEventListener("click", () => selectHistory(d.id));

    if (todayDay && d.id === todayDay.id) {
      div.classList.add("selected");
    }

    listEl.appendChild(div);
  });
}

function selectHistory(id) {
  const d = days.find((x) => x.id === id);
  if (!d) return;

  const listEl = document.getElementById("historyList");
  if (listEl) {
    listEl.querySelectorAll(".history-item").forEach((item) => {
      item.classList.remove("selected");
    });
    const active = listEl.querySelector(`[data-day-id="${id}"]`);
    if (active) active.classList.add("selected");
  }

  const detailEl = document.getElementById("historyDetail");
  if (!detailEl) return;

  computeReadiness(d);
  const habitSummary = computeHabitSummaryText(d);

  detailEl.innerHTML = `
    <h3>${formatFi(d.date)} ${d.finalized ? "· LUKITTU" : ""}</h3>
    <p><strong>Ratatyyppi:</strong> ${d.dayType}</p>
    <p><strong>Vaikeus:</strong> ${d.difficulty}/10 · <strong>Readiness:</strong> ${d.readiness}%</p>
    <p><strong>Fuel:</strong> ${d.energy}/10 · <strong>Grip:</strong> ${d.focus}/10 · <strong>Stressi:</strong> ${d.stress}/10</p>
    <p><strong>Habits:</strong> ${habitSummary}</p>
    <p><strong>Strategia:</strong> ${d.strategy || "Ei strategiaa tallennettuna."}</p>
    <p><strong>Varikkosuunnitelma:</strong> ${d.pitPlan || "Ei suunnitelmaa."}</p>
    <p><strong>Muistiinpanot:</strong> ${
      d.notes && d.notes.trim()
        ? d.notes.replace(/\n/g, "<br>")
        : "<span style='color:#6f7aa5'>Ei merkintöjä.</span>"
    }</p>
  `;
}

// ---- EXPORT ----
function exportData() {
  const json = JSON.stringify(days, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fi_varikko_telemetria_${getTodayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- VIEW SWITCH ----
function setView(view) {
  const todayView = document.getElementById("view-today");
  const histView = document.getElementById("view-history");
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach((b) => {
    const v = b.getAttribute("data-view");
    b.classList.toggle("active", v === view);
  });

  if (view === "today") {
    todayView && todayView.classList.add("active");
    histView && histView.classList.remove("active");
  } else {
    histView && histView.classList.add("active");
    todayView && todayView.classList.remove("active");
  }
}

// ---- EVENTS ----
function scheduleRecompute() {
  if (recomputeTimer) clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(() => {
    recomputeTimer = null;
    saveDays();
    renderToday();
  }, 70);
}

function handleInput(e) {
  if (!todayDay) return;
  const el = e.target;
  const field = el.getAttribute("data-field");
  if (!field) return;

  if (el.tagName === "INPUT" && el.type === "range") {
    const val = Number(el.value);
    todayDay[field] = val;

    const labelMap = {
      difficulty: "difficultyLabel",
      energy: "energyLabel",
      focus: "focusLabel",
      bodyLoad: "bodyLoadLabel",
      stress: "stressLabel",
      mood: "moodLabel",
      motivation: "motivationLabel",
      confidence: "confidenceLabel",
    };
    const labelId = labelMap[field];
    if (labelId) {
      const l = document.getElementById(labelId);
      if (l) l.textContent = `${val}/10`;
    }
  } else if (el.tagName === "SELECT") {
    todayDay[field] = el.value;
  }

  scheduleRecompute();
}

function setupEvents() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      if (view) setView(view);
    });
  });

  const inputs = document.querySelectorAll("[data-field]");
  inputs.forEach((el) => {
    if (el.tagName === "INPUT" && el.type === "range") {
      el.addEventListener("input", handleInput);
    } else if (el.tagName === "SELECT") {
      el.addEventListener("change", handleInput);
    }
  });

  const notesEl = document.getElementById("notes");
  if (notesEl) {
    notesEl.addEventListener("input", (e) => {
      if (!todayDay) return;
      todayDay.notes = e.target.value;
      saveDays();
    });
  }

  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!todayDay) return;
      todayDay.finalized = true;
      todayDay.finalizedAt = new Date().toISOString();
      saveDays();
      renderToday();
      setStatus("Päivän telemetria lukittu pakkaan.");
    });
  }

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }

  // Double-click zoom koko päivän kortille
  const dayCard = document.getElementById("todayCard");
  if (dayCard) {
    dayCard.addEventListener("dblclick", () => {
      dayCard.classList.toggle("zoom");
    });
  }
}

// ---- INIT ----
document.addEventListener("DOMContentLoaded", () => {
  days = loadDays();
  ensureToday();
  renderToday();
  setupEvents();
  setStatus("Valmis. Telemetria ja habit-kortit tallentuvat automaattisesti.");
});
