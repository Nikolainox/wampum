// ---- KONFIGURAATIO ----
const STORAGE_KEY = "mbmf_cards_v2";

let cards = [];
let todayCard = null;
let recomputeTimer = null;

// ---- UTILS ----
function getTodayDateISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFi(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

function setStatus(message) {
  const el = document.getElementById("statusMessage");
  if (el) el.textContent = message;
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

function pseudoRandom(n) {
  const x = Math.sin(n * 999.999) * 10000;
  return x - Math.floor(x);
}

// ---- LOCALSTORAGE ----
function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("LocalStorage load error:", e);
    setStatus("LocalStorage ei saatavilla, data säilyy vain istunnon ajan.");
    return [];
  }
}

function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    setStatus("Tallennettu.");
  } catch (e) {
    console.error("LocalStorage save error:", e);
    setStatus("Virhe tallentaessa localStorageen.");
  }
}

// ---- DATA MALLI ----
function defaultCard(dateISO) {
  return {
    id: "card_" + dateISO,
    date: dateISO,
    mind: {
      focus: 5,
      friction: 5,
      intensity: 5,
      mode: "normal",
      score: 5,
    },
    body: {
      energy: 5,
      soreness: 5,
      sleepQuality: 5,
      sleepHours: 7,
      nutrition: "ok",
      score: 5,
    },
    mental: {
      stress: 5,
      positivity: 5,
      tone: "controlled",
      redFlag: "none",
      score: 5,
    },
    fitness: {
      strength: 5,
      endurance: 5,
      mobility: 5,
      rpe: 5,
      score: 5,
    },
    behavior: {
      startLatency: 5,
      interruptions: 5,
      distraction: 5,
      pattern: "builder",
    },
    environment: {
      energy: 5,
      workspace: "neutral",
      social: "neutral",
    },
    motivation: {
      goalClarity: 5,
      commitment: 5,
      passion: 5,
    },
    notes: "",
    finalized: false,
    createdAt: new Date().toISOString(),
  };
}

function ensureTodayCard() {
  const todayISO = getTodayDateISO();
  let found = cards.find((c) => c.date === todayISO);
  if (!found) {
    found = defaultCard(todayISO);
    cards.push(found);
    saveCards();
  }
  todayCard = found;
}

// ---- SCORE & ENGINE ----
function computeSectionScores(card) {
  // Mind
  const mindModeBonus =
    card.mind.mode === "deep" ? 2 : card.mind.mode === "normal" ? 1 : 0;
  const mindFocus = card.mind.focus;
  const mindFrictionInv = 11 - card.mind.friction;
  const mindIntensity = card.mind.intensity;
  card.mind.score = Math.round(
    (mindFocus + mindFrictionInv + mindIntensity + mindModeBonus) / 4
  );

  // Body
  const energy = card.body.energy;
  const sorenessInv = 11 - card.body.soreness;
  const sleepQ = card.body.sleepQuality;
  const sleepH = card.body.sleepHours;
  let sleepScore = 5;
  if (sleepH >= 7 && sleepH <= 9) sleepScore = 9;
  else if (sleepH >= 6 && sleepH < 7) sleepScore = 7;
  else if (sleepH > 9 && sleepH <= 10) sleepScore = 7;
  else if (sleepH >= 5 && sleepH < 6) sleepScore = 5;
  else sleepScore = 3;
  const nutritionBonus =
    card.body.nutrition === "ok" ? 2 : card.body.nutrition === "over" ? -1 : -1;
  card.body.score = Math.round(
    (energy + sorenessInv + sleepQ + sleepScore + nutritionBonus) / 5
  );

  // Mental
  const stressInv = 11 - card.mental.stress;
  const positivity = card.mental.positivity;
  let toneAdj = 0;
  if (card.mental.tone === "calm") toneAdj = 2;
  else if (card.mental.tone === "controlled") toneAdj = 1;
  else if (card.mental.tone === "irritated") toneAdj = -1;
  else if (card.mental.tone === "anxious") toneAdj = -2;
  let redFlagAdj = 0;
  if (card.mental.redFlag === "avoidance") redFlagAdj = -1;
  else if (card.mental.redFlag === "restless") redFlagAdj = -1;
  else if (card.mental.redFlag === "aggressive") redFlagAdj = -2;
  card.mental.score = Math.round(
    (stressInv + positivity + 5 + toneAdj + redFlagAdj) / 4
  );

  // Fitness
  const strength = card.fitness.strength;
  const endurance = card.fitness.endurance;
  const mobility = card.fitness.mobility;
  const rpe = card.fitness.rpe;
  const rpeAdj = rpe >= 4 && rpe <= 7 ? 1 : rpe > 7 ? -1 : 0;
  card.fitness.score = Math.round(
    (strength + endurance + mobility + 5 + rpeAdj) / 4
  );
}

function computeQuickTags(card) {
  // Behavior mode tag
  let modeText = "MODE: –";
  if (card.behavior.pattern === "builder") modeText = "MODE: BUILDER";
  else if (card.behavior.pattern === "responder") modeText = "MODE: RESPONDER";
  else if (card.behavior.pattern === "avoider") modeText = "MODE: AVOIDER";
  else if (card.behavior.pattern === "overdriver")
    modeText = "MODE: OVERDRIVER";

  const behaviorTag = document.getElementById("behaviorModeTag");
  if (behaviorTag) behaviorTag.textContent = modeText;

  // Environment tag
  let env = "ENV: –";
  const w = card.environment.workspace;
  const s = card.environment.social;
  if (w === "good" && s === "supportive") env = "ENV: TOWER / HIGH SUPPORT";
  else if (w === "good") env = "ENV: GOOD WORKSPACE";
  else if (w === "bad") env = "ENV: HARD MODE";
  else if (s === "draining") env = "ENV: SOCIAL DRAIN";
  else env = "ENV: NEUTRAL";

  const envTag = document.getElementById("environmentTag");
  if (envTag) envTag.textContent = env;

  // Momentum tag (motivation trend)
  const avgMot =
    (card.motivation.goalClarity +
      card.motivation.commitment +
      card.motivation.passion) /
    3;
  let mom = "MOMENTUM: –";
  if (avgMot >= 8) mom = "MOMENTUM: SURGE";
  else if (avgMot >= 6) mom = "MOMENTUM: UP";
  else if (avgMot >= 4) mom = "MOMENTUM: STEADY";
  else mom = "MOMENTUM: LOW";

  const momTag = document.getElementById("momentumTag");
  if (momTag) momTag.textContent = mom;
}

// Bayesian / Monte Carlo -henkinen performance engine
function updatePerformanceProbability() {
  if (!todayCard) return;
  const card = todayCard;
  computeSectionScores(card);

  const mindScore = card.mind.score;
  const bodyScore = card.body.score;
  const mentalScore = card.mental.score;
  const fitnessScore = card.fitness.score;

  const baseAvg = (mindScore + bodyScore + mentalScore + fitnessScore) / 4;

  // "Prior" todennäköisyys
  let prior = clamp01(baseAvg / 10);

  // Behavior & environment vaikuttaa "likelihoodiin"
  const highStartLatency = card.behavior.startLatency >= 7 ? -0.08 : 0;
  const highInterruptions = card.behavior.interruptions >= 7 ? -0.06 : 0;
  const highDistraction = card.behavior.distraction >= 7 ? -0.07 : 0;

  let envAdj = 0;
  if (card.environment.workspace === "good") envAdj += 0.05;
  if (card.environment.workspace === "bad") envAdj -= 0.05;
  if (card.environment.social === "supportive") envAdj += 0.04;
  if (card.environment.social === "draining") envAdj -= 0.06;

  const mentalPenalty =
    (card.mental.tone === "anxious" || card.mental.tone === "irritated") &&
    card.mental.stress >= 7
      ? -0.08
      : 0;

  const motivationBoost =
    (card.motivation.goalClarity +
      card.motivation.commitment +
      card.motivation.passion) /
      30 -
    0.5; // -0.5..+0.5

  let mean = prior;
  mean += highStartLatency + highInterruptions + highDistraction;
  mean += envAdj + mentalPenalty + motivationBoost * 0.4;
  mean = clamp01(mean);

  // Monte Carlo -tyyppinen simulaatio päivän varianssille
  const seed = hashString(card.date);
  const stressFactor = card.mental.stress / 10;
  const envNoise = (11 - card.environment.energy) / 20;
  const variability = 0.08 + stressFactor * 0.06 + envNoise * 0.04;

  let sum = 0;
  const runs = 128;
  for (let i = 0; i < runs; i++) {
    const r = pseudoRandom(seed + i);
    const delta = (r - 0.5) * 2 * variability;
    const p = clamp01(mean + delta);
    sum += p;
  }

  const prob = (sum / runs) * 100;
  const rounded = Math.round(prob);

  const perfEl = document.getElementById("performanceValue");
  if (perfEl) perfEl.textContent = `${rounded} %`;

  // päivitetään Jarvis-hubi
  updateJarvisHub(card, rounded);
}

// ---- JARVIS HUB ----
function generateJarvisMessage(card, probability) {
  computeSectionScores(card);
  const mind = card.mind.score;
  const body = card.body.score;
  const mental = card.mental.score;
  const fitness = card.fitness.score;

  const sections = [
    { key: "Mind", value: mind },
    { key: "Body", value: body },
    { key: "Mental", value: mental },
    { key: "Fitness", value: fitness },
  ];
  sections.sort((a, b) => a.value - b.value);
  const weakest = sections[0];

  const env = card.environment;
  const mot = card.motivation;
  const behavior = card.behavior;

  let msg = "";

  if (probability >= 80) {
    msg += `Tämän päivän performance-arvio on ${probability} %. Jarvis: sinulla on kilpailukunto. `;
  } else if (probability >= 60) {
    msg += `Performance-arvio ${probability} %. Hyvä lähtötaso, mutta pientä säätöä tarvitaan. `;
  } else if (probability >= 40) {
    msg += `Performance-arvio ${probability} %. Päivä on "hard mode". Tehdään siitä silti voitettavissa oleva. `;
  } else {
    msg += `Performance-arvio ${probability} %. Jarvis: tänään fokus on selviytymisessä, ei maksimituloksessa. `;
  }

  if (weakest.key === "Body") {
    msg += `Body on heikoin lenkki (${body}/10). Suositus: `;
    if (card.body.sleepHours < 6) {
      msg += `priorisoi tänään uni (30–60 min aikaisempi nukkumaanmeno) ja tee vain kevyt treeni + liikkuvuus. `;
    } else if (card.fitness.rpe > 7) {
      msg += `pidä palauttava päivä: kävely, kevyt venyttely, ei raskaampaa kuormaa. `;
    } else {
      msg += `tee 20–30 minuutin perusvoimaharjoitus (koko kroppa, 2–3 kierrosta) ja jätä 1–2 toistoa varastoon. `;
    }
  } else if (weakest.key === "Mind") {
    msg += `Mind on tänään matalampi (${mind}/10). Suositus: `;
    if (behavior.startLatency >= 7) {
      msg += `tee yksi 5 minuutin mikrosessio heti kun suljet sovelluksen – ei suunnittelua, vain aloitus. `;
    } else {
      msg += `lukitse yksi tärkeä tehtävä 25 minuutiksi (ei somea, ei välilehtiä), ja lopeta siihen. Yksi laserisku riittää. `;
    }
  } else if (weakest.key === "Mental") {
    msg += `Mental-kuorma on korkea (${mental}/10 vastapainona stressille ${card.mental.stress}/10). Suositus: `;
    if (card.mental.redFlag === "aggressive" || card.mental.redFlag === "restless") {
      msg += `lisää kehoon liikettä ennen päätöksiä: 10–15 min kävely tai kevyt hikijakso ennen kuin teet isoja ratkaisuja. `;
    } else {
      msg += `kirjoita 3 lausetta: mikä on päivän tärkein asia, mitä voit jättää pois ja mitä voit tehdä hitaammin. `;
    }
  } else if (weakest.key === "Fitness") {
    msg += `Fitness on tämän päivän bottleneck (${fitness}/10). Suositus: `;
    msg += `tee tänään progressiotreeni vain yhdelle alueelle (esim. jalat tai selkä) ja seuraa samaa liikettä viikon ajan, jotta trendi näkyy datassa. `;
  }

  if (env.workspace === "bad" || env.social === "draining") {
    msg += `Ympäristö-signaali: hard mode. Jarvis ehdottaa: tee tärkein asia fyysisesti eri paikassa tai eri ajassa kuin häiriöt. `;
  }

  const avgMot =
    (mot.goalClarity + mot.commitment + mot.passion) / 3;
  if (avgMot >= 7) {
    msg += `Motivaatio on kunnossa (${avgMot.toFixed(1)}/10). Tee tänään yksi rohkea liike, joka normaalisti jäisi odottamaan "parempaa hetkeä".`;
  } else if (avgMot <= 4) {
    msg += `Motivaatio on matala (${avgMot.toFixed(1)}/10). Jarvis: pienennä tehtävät niin pieniksi, ettei ego ehdi valittaa. 1–2 mikrovoittoa riittää.`;
  }

  return msg.trim();
}

function updateJarvisHub(card, probability) {
  const statusEl = document.getElementById("jarvisStatus");
  const msgEl = document.getElementById("jarvisMessage");
  if (!statusEl || !msgEl) return;

  const avg =
    (card.mind.score +
      card.body.score +
      card.mental.score +
      card.fitness.score) /
    4;

  statusEl.textContent = `Keskitaso ${avg.toFixed(1)}/10 · reaaliaikainen suositus käynnissä`;
  msgEl.textContent = generateJarvisMessage(card, probability);
}

// ---- RENDER: TODAY ----
function renderTodayCard() {
  if (!todayCard) return;
  const card = todayCard;

  computeSectionScores(card);
  computeQuickTags(card);

  const dateLabel = document.getElementById("todayDateLabel");
  if (dateLabel) {
    dateLabel.textContent = `Päivä: ${formatDateFi(card.date)} ${
      card.finalized ? "· FINALISOITU" : ""
    }`;
  }

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("mindScoreLabel", `${card.mind.score}/10`);
  setText("bodyScoreLabel", `${card.body.score}/10`);
  setText("mentalScoreLabel", `${card.mental.score}/10`);
  setText("fitnessScoreLabel", `${card.fitness.score}/10`);

  setText("mindValue", card.mind.score);
  setText("bodyValue", card.body.score);
  setText("mentalValue", card.mental.score);
  setText("fitnessValue", card.fitness.score);

  const setGlow = (id, score) => {
    const el = document.getElementById(id);
    if (!el) return;
    const intensity = 0.2 + (score / 10) * 0.6;
    el.style.boxShadow = `0 0 18px rgba(90, 125, 255, ${intensity})`;
  };
  setGlow("holoMind", card.mind.score);
  setGlow("holoBody", card.body.score);
  setGlow("holoMental", card.mental.score);
  setGlow("holoFitness", card.fitness.score);

  const inputs = document.querySelectorAll("[data-section][data-field]");
  inputs.forEach((input) => {
    const section = input.getAttribute("data-section");
    const field = input.getAttribute("data-field");
    if (!section || !field) return;
    const sectionObj = card[section];
    if (!sectionObj || typeof sectionObj !== "object") return;

    const value = sectionObj[field];
    if (value == null) return;

    if (input.type === "range" || input.type === "number") {
      input.value = value;
      const labelId = input.getAttribute("data-label-id");
      if (labelId) {
        const labelEl = document.getElementById(labelId);
        if (labelEl) {
          if (input.type === "number") labelEl.textContent = String(value);
          else labelEl.textContent = `${value}/10`;
        }
      }
    } else if (input.tagName === "SELECT") {
      input.value = value;
    }
  });

  const notesEl = document.getElementById("notes");
  if (notesEl) {
    notesEl.value = card.notes || "";
    notesEl.disabled = card.finalized;
  }

  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn) {
    finalizeBtn.disabled = card.finalized;
    finalizeBtn.textContent = card.finalized
      ? "Päivä on jo pakassa"
      : "Finalisoi päivä ja lisää pakkaan";
  }

  updatePerformanceProbability(); // kutsuu myös updateJarvisHub
  renderHistoryDeck();
}

// ---- RENDER: HISTORY ----
function renderHistoryDeck() {
  const listEl = document.getElementById("historyList");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.textContent = "Ei vielä yhtään korttia pakassa.";
    empty.style.fontSize = "0.9rem";
    empty.style.color = "#a7b0d9";
    listEl.appendChild(empty);
    return;
  }

  cards.forEach((c) => computeSectionScores(c));

  const sorted = [...cards].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((card) => {
    const avg =
      (card.mind.score +
        card.body.score +
        card.mental.score +
        card.fitness.score) /
      4;

    const item = document.createElement("div");
    item.className = "history-item";
    item.dataset.cardId = card.id;

    const tag =
      avg >= 8
        ? "Peak day"
        : avg >= 6
        ? "Solid"
        : avg >= 4
        ? "Grinding"
        : "Hard mode";

    item.innerHTML = `
      <div class="history-item-date">${formatDateFi(card.date)}</div>
      <div class="history-item-score">Avg ${avg.toFixed(1)}/10</div>
      <div class="history-item-tag">${tag}</div>
    `;

    item.addEventListener("click", () => selectHistoryItem(card.id));

    if (todayCard && card.id === todayCard.id) {
      item.classList.add("selected");
    }

    listEl.appendChild(item);
  });
}

function selectHistoryItem(cardId) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return;

  const listEl = document.getElementById("historyList");
  if (listEl) {
    const items = listEl.querySelectorAll(".history-item");
    items.forEach((i) => i.classList.remove("selected"));
    const selected = listEl.querySelector(`[data-card-id="${cardId}"]`);
    if (selected) selected.classList.add("selected");
  }

  const detailEl = document.getElementById("historyDetail");
  if (!detailEl) return;

  computeSectionScores(card);
  const avg =
    (card.mind.score +
      card.body.score +
      card.mental.score +
      card.fitness.score) /
    4;
  const probApprox = Math.round((avg / 10) * 100);

  detailEl.innerHTML = `
    <h3>${formatDateFi(card.date)} ${card.finalized ? "· FINALISOITU" : ""}</h3>
    <p><strong>Mind:</strong> ${card.mind.score}/10 · <strong>Body:</strong> ${card.body.score}/10</p>
    <p><strong>Mental:</strong> ${card.mental.score}/10 · <strong>Fitness:</strong> ${card.fitness.score}/10</p>
    <p><strong>Approx performance probability:</strong> ${probApprox} %</p>
    <p><strong>Mode:</strong> ${card.behavior.pattern}</p>
    <p><strong>Muistiinpanot:</strong> ${
      card.notes && card.notes.trim().length > 0
        ? card.notes.replace(/\n/g, "<br>")
        : "<span style='color:#6f7aa5'>Ei merkintöjä.</span>"
    }</p>
  `;
}

// ---- EXPORT ----
function exportData() {
  const dataStr = JSON.stringify(cards, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const todayISO = getTodayDateISO();
  a.href = url;
  a.download = `mbmf_cards_max_${todayISO}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- VIEW & SWIPE ----
function setActiveView(view) {
  const todayView = document.getElementById("view-today");
  const historyView = document.getElementById("view-history");
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach((btn) => {
    const target = btn.getAttribute("data-view");
    btn.classList.toggle("active", target === view);
  });

  const addAnimation = (el, cls) => {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 250);
  };

  if (view === "today") {
    historyView && historyView.classList.remove("active");
    todayView && todayView.classList.add("active");
    addAnimation(todayView, "swipe-right-enter");
  } else {
    todayView && todayView.classList.remove("active");
    historyView && historyView.classList.add("active");
    addAnimation(historyView, "swipe-left-enter");
  }
}

function setupSwipeNavigation() {
  let touchStartX = null;

  document.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
    },
    { passive: true }
  );

  document.addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const threshold = 60;

    if (deltaX < -threshold) {
      setActiveView("history");
    } else if (deltaX > threshold) {
      setActiveView("today");
    }
    touchStartX = null;
  });
}

function setupDoubleClickZoom() {
  const card = document.getElementById("todayCard");
  if (!card) return;
  card.addEventListener("dblclick", () => {
    card.classList.toggle("zoom");
  });
}

// ---- DEBOUNCE ----
function scheduleRecompute() {
  if (recomputeTimer) clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(() => {
    recomputeTimer = null;
    saveCards();
    renderTodayCard();
  }, 80);
}

// ---- EVENTIT ----
function handleDataInputChange(e) {
  if (!todayCard) return;
  const input = e.target;
  const section = input.getAttribute("data-section");
  const field = input.getAttribute("data-field");
  if (!section || !field) return;

  const sectionObj = todayCard[section];
  if (!sectionObj) return;

  let value;
  if (input.type === "range" || input.type === "number") {
    value = input.type === "number" ? Number(input.value) : Number(input.value);
  } else if (input.tagName === "SELECT") {
    value = input.value;
  } else return;

  sectionObj[field] = value;

  const labelId = input.getAttribute("data-label-id");
  if (labelId) {
    const labelEl = document.getElementById(labelId);
    if (labelEl) {
      if (input.type === "number") labelEl.textContent = String(value);
      else labelEl.textContent = `${value}/10`;
    }
  }

  scheduleRecompute();
}

function setupEvents() {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      if (view) setActiveView(view);
    });
  });

  const inputs = document.querySelectorAll("[data-section][data-field]");
  inputs.forEach((input) => {
    const eventName =
      input.type === "range" || input.type === "number" ? "input" : "change";
    input.addEventListener(eventName, handleDataInputChange);
  });

  const notesEl = document.getElementById("notes");
  if (notesEl) {
    notesEl.addEventListener("input", (e) => {
      if (!todayCard) return;
      todayCard.notes = e.target.value;
      saveCards();
    });
  }

  const finalizeBtn = document.getElementById("finalizeBtn");
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      if (!todayCard) return;
      todayCard.finalized = true;
      todayCard.finalizedAt = new Date().toISOString();
      saveCards();
      renderTodayCard();
      setStatus("Päivä finalisoitu ja lisätty pakkaan.");
    });
  }

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }

  setupSwipeNavigation();
  setupDoubleClickZoom();
}

// ---- INIT ----
document.addEventListener("DOMContentLoaded", () => {
  cards = loadCards();
  ensureTodayCard();
  renderTodayCard();
  setupEvents();
  setStatus("Valmis. Päiväkortti tallentuu automaattisesti.");
});
