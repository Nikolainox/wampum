// FI VARIKKO ENGINE
const STORAGE_KEY = "fi_varikko_days_v1";

let days = [];
let todayDay = null;
let recomputeTimer = null;

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
  }
  todayDay = d;
}

// ---- ENGINE: READINESS & STRATEGY ----
function computeReadiness(day) {
  // Perus: positiiviset signaalit
  const posAvg =
    (day.energy + day.focus + day.motivation + day.confidence) / (4 * 10);

  // Stressi & vaikeus penaltiot
  const stressPenalty = (day.stress - 5) / 20; // -0.25..+0.25
  const difficultyPenalty = (day.difficulty - 5) / 22; // -0.22..+0.22

  let sleepBonus = 0;
  if (day.sleep === "good") sleepBonus = 0.08;
  else if (day.sleep === "bad") sleepBonus = -0.12;

  const bodyPenalty = (day.bodyLoad - 5) / 22;

  let readiness = posAvg + sleepBonus - stressPenalty - difficultyPenalty - bodyPenalty;
  readiness = clamp01(readiness);
  day.readiness = Math.round(readiness * 100);

  // Hard day -logiikka
  const isHard =
    day.difficulty >= 7 ||
    (day.energy <= 4 && day.stress >= 7) ||
    (day.sleep === "bad" && day.stress >= 6);
  day.hardDay = !!isHard;

  // Strategia & pit-plan
  const { strategy, pitPlan } = buildStrategy(day);
  day.strategy = strategy;
  day.pitPlan = pitPlan;
}

function buildStrategy(day) {
  const r = day.readiness;
  const hard = day.hardDay;
  const lines = [];
  const pit = [];

  // Päätavoite
  if (hard) {
    lines.push("Tämä on HARD DAY -tila. Tavoite: ehjänä maaliin + pieni voitto.");
  } else if (day.goal === "push" && r >= 70) {
    lines.push("Auto on kilpailukykyinen. PB-päivä on realistinen.");
  } else if (day.goal === "progress") {
    lines.push("Fokus: pieni, selkeä kehitys yhdellä alueella.");
  } else {
    lines.push("Fokus: pidä auto radalla ilman isoja virheitä.");
  }

  // Stintit
  if (hard) {
    // vaikea päivä
    lines.push("Stint-suositus: 2–3 lyhyttä jaksoa, ei kokopäivän täyskaasua.");
    pit.push("2 x 20–25 min keskittynyt työ (ei somea).");
    pit.push("1 x 10–15 min kevyt, palauttava stintti (kävely, venyttely, hengitys).");
  } else if (r >= 75) {
    lines.push("Stint-suositus: voimakkaampi kisa, hyödynnä kunto.");
    pit.push("3 x 35–45 min syvää fokusta, välissä 8–10 min tauko.");
    pit.push("Yksi “push lap” -hetki, jossa teet jotain tavallista rohkeamman liikkeen.");
  } else {
    lines.push("Stint-suositus: kontrolloitu päivä, ei maksimaalista riskiä.");
    pit.push("2 x 30 min fokusoitu stintti päivän tärkeimpiin asioihin.");
    pit.push("1 x 15–20 min huoltojakso (liike + rauhoittava hengitys).");
  }

  // Varikko-mentaliteetti vaikeana päivänä
  if (hard) {
    pit.push(
      "Kulta sääntö: 1) Lyhyet stintit 2) Ei tulospaineita 3) Sulje 1 asia joka häiritsee (some, chat, tms.)."
    );
  }

  return {
    strategy: lines.join(" "),
    pitPlan: pit.join(" "),
  };
}

// ---- PIT RADIO ----
function updatePitRadio(day) {
  const statusEl = document.getElementById("pitStatus");
  const msgEl = document.getElementById("pitMessage");
  if (!statusEl || !msgEl) return;

  const r = day.readiness;
  const hard = day.hardDay;

  if (hard) {
    statusEl.textContent = `VARIKKO: HARD DAY MODE – readiness ${r} %`;
    let msg = "Kuljettaja, tämä on raskas rata tänään. ";
    if (day.energy <= 4) {
      msg += "Fuel matala, älä luota pelkkään tahdonvoimaan. Tee lyhyitä stinttejä, joissa on selkeä alku ja loppu. ";
    }
    if (day.stress >= 7) {
      msg += "Liikennettä paljon radalla (stressi korkea) – nosta ensin näkyvyys: 5–10 min kävely tai hengitys ennen isoja päätöksiä. ";
    }
    msg += "Varikko suosittelee: yksi pieni voitto riittää. Ei tarvitse voittaa koko kisaa tänään.";
    msgEl.textContent = msg;
  } else {
    statusEl.textContent = `VARIKKO: READY – readiness ${r} %`;
    let msg = "Auto on ajokunnossa. ";
    if (r >= 75) {
      msg += "Tämä on hyvä hetki testata rajoja turvallisesti. ";
    } else {
      msg += "Aja siististi, ilman turhaa riskiä. ";
    }
    if (day.goal === "progress") {
      msg += "Valitse yksi juttu, jossa haluat olla päivän lopussa 1 % parempi. Tee siitä päivän pääkierros.";
    } else if (day.goal === "push") {
      msg += "Tee selkeä “push”-stintti: 30–40 min mahdollisimman hyvää suoritusta yhdestä tärkeästä asiasta.";
    } else {
      msg += "Selviytymisfokus: vältä yhdellä päätöksellä tulevia ongelmia (ei uusia sitoumuksia, ei isoja harppauksia).";
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

  // Inputit
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
  renderHistory();
}

// ---- HISTORY ----
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
    const avg = d.readiness;
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.dayId = d.id;

    const tag =
      d.hardDay && avg >= 40
        ? "Hard day, mutta maaliin"
        : d.hardDay
        ? "Hard day"
        : avg >= 70
        ? "Kova kisa"
        : "Peruspäivä";

    div.innerHTML = `
      <div class="history-item-date">${formatFi(d.date)}</div>
      <div class="history-item-score">Readiness ${avg}%</div>
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

  detailEl.innerHTML = `
    <h3>${formatFi(d.date)} ${d.finalized ? "· LUKITTU" : ""}</h3>
    <p><strong>Ratatyyppi:</strong> ${d.dayType}</p>
    <p><strong>Vaikeus:</strong> ${d.difficulty}/10 · <strong>Readiness:</strong> ${d.readiness}%</p>
    <p><strong>Fuel:</strong> ${d.energy}/10 · <strong>Grip:</strong> ${d.focus}/10 · <strong>Stressi:</strong> ${d.stress}/10</p>
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
    todayView && (todayView.classList.add("active"));
    histView && (histView.classList.remove("active"));
  } else {
    histView && (histView.classList.add("active"));
    todayView && (todayView.classList.remove("active"));
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

    // label päivitys
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

  // Double-click zoom
  const card = document.getElementById("todayCard");
  if (card) {
    card.addEventListener("dblclick", () => {
      card.classList.toggle("zoom");
    });
  }
}

// ---- INIT ----
document.addEventListener("DOMContentLoaded", () => {
  days = loadDays();
  ensureToday();
  renderToday();
  setupEvents();
  setStatus("Valmis. Telemetria tallentuu automaattisesti.");
});
