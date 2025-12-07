// Morning Ignition OS
// Kaikki tila tallennetaan yhteen localStorage-objektiin
const STORAGE_KEY = "mios_state_v1";

let state = {
  stats: {
    totalStarts: 0,
    currentStreak: 0,
    bestStreak: 0,
    hardMornings: 0,
  },
  lastDateStarted: null,
  lastProfile: {
    body: "normal",  // low, normal, good
    mind: "normal",  // heavy, normal, clear
    intent: "build", // recovery, build, push
    difficulty: 5,
    isHard: false,
  },
  hardMarkedForToday: false,
};

// -------- UTILITIES --------
function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFiDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// -------- STORAGE --------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    // Lempeä merge, ettei mikään puuttuva kenttä riko
    state = {
      ...state,
      ...parsed,
      stats: { ...state.stats, ...(parsed.stats || {}) },
      lastProfile: { ...state.lastProfile, ...(parsed.lastProfile || {}) },
    };
  } catch (e) {
    console.error("State load error:", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("State save error:", e);
  }
}

// -------- START LOGIC --------
function handleStartClick() {
  const today = getTodayISO();
  const yesterday = yesterdayISO();
  const last = state.lastDateStarted;

  // Päivitetään streak ja starts vain jos ei jo startattu tänään
  if (last !== today) {
    state.stats.totalStarts += 1;

    if (last === yesterday) {
      state.stats.currentStreak += 1;
    } else {
      state.stats.currentStreak = 1;
    }
    if (state.stats.currentStreak > state.stats.bestStreak) {
      state.stats.bestStreak = state.stats.currentStreak;
    }

    state.lastDateStarted = today;
    state.hardMarkedForToday = false;
  }

  saveState();
  renderStats();
  showMainPanel();
  updateProfileAndCard(); // laskee heti kortin
}

function showMainPanel() {
  const startPanel = document.getElementById("startPanel");
  const mainPanel = document.getElementById("mainPanel");
  if (startPanel) startPanel.classList.add("hidden");
  if (mainPanel) mainPanel.classList.remove("hidden");

  const todayLabel = document.getElementById("todayLabel");
  if (todayLabel) {
    const today = getTodayISO();
    todayLabel.textContent = `Tänään · ${formatFiDate(today)}`;
  }
}

// -------- PROFILE & STRATEGY --------
function computeProfile(profile) {
  // Difficulty 1–10
  let difficulty = 5;

  // Keho
  if (profile.body === "low") difficulty += 2;
  else if (profile.body === "good") difficulty -= 1;

  // Mieli
  if (profile.mind === "heavy") difficulty += 2;
  else if (profile.mind === "clear") difficulty -= 1;

  // Intentio
  if (profile.intent === "recovery") difficulty -= 1;
  else if (profile.intent === "push") difficulty += 1;

  // Rajat
  if (difficulty < 1) difficulty = 1;
  if (difficulty > 10) difficulty = 10;

  const isHard = difficulty >= 7;

  // Mode-pilleri
  let modeLabel = "MODE: –";
  if (profile.intent === "recovery") modeLabel = "MODE: RECOVERY";
  else if (profile.intent === "build") modeLabel = "MODE: BUILD";
  else if (profile.intent === "push") modeLabel = "MODE: PUSH";

  // Vaikeusbadge
  let diffLabel = "Normi aamu";
  let diffTone = "neutral";
  if (difficulty <= 3) {
    diffLabel = "Kevyt aamu";
    diffTone = "easy";
  } else if (difficulty >= 7) {
    diffLabel = "Hard morning";
    diffTone = "hard";
  }

  // "Flow"-prosentti – mitä app arvioi potentiaaliksi
  // Hard aamut eivät välttämättä tarkoita huonoa suoritusta, ne vain vaativat strategiaa.
  let base = 65;
  if (profile.body === "low") base -= 10;
  if (profile.mind === "heavy") base -= 8;
  if (profile.intent === "push") base += 6;
  if (profile.intent === "recovery") base -= 4;

  if (base < 10) base = 10;
  if (base > 95) base = 95;
  const flowPercent = Math.round(base);

  // Jarvis-linja
  let jarvis = "";

  if (isHard) {
    jarvis += "Jarvis: tämä on hard morning. Tavoite ei ole olla täydellinen vaan ";
    if (profile.intent === "push") {
      jarvis += "tehdä yksi rohkea liike, vaikka fiilis ei tue. Mikroteko ensin, analyysi myöhemmin.";
    } else if (profile.intent === "recovery") {
      jarvis += "ajaa päivä läpi ehjänä. Pidä sprintit lyhyinä, älä rakenna itsellesi uusia paineita.";
    } else {
      jarvis += "pitää auto radalla ja rakentaa pieni perusta huomiselle.";
    }
  } else {
    jarvis += "Jarvis: aamu on ajokelpoinen. ";
    if (profile.intent === "push") {
      jarvis += "tämä on hyvä hetki hyödyntää energiaa. Tee yhdestä projektista selvästi parempi kuin eilen.";
    } else if (profile.intent === "build") {
      jarvis += "rakenna tänään yksi palikka eteenpäin – yksi sivu, yksi harjoitus, yksi selkeä askel.";
    } else {
      jarvis += "kunnioita palautumista, mutta älä pysähdy kokonaan: 1–2 pientä siirtoa riittää.";
    }
  }

  // Mikroteko
  const micro = pickMicroMove(profile, isHard);

  return {
    difficulty,
    isHard,
    modeLabel,
    diffLabel,
    diffTone,
    flowPercent,
    jarvisLine: jarvis,
    microMove: micro,
  };
}

function pickMicroMove(profile, isHard) {
  const movesHard = [
    "Täytä iso lasi vettä ja juo siitä nyt ⅓. Älä tee muuta ennen sitä.",
    "Avaa tärkein projekti, katso sitä 30 sekuntia, ja kirjoita yksi lause.",
    "Nouse seisomaan, venytä kädet ylös 10 sekunniksi ja hengitä kolme kertaa hitaasti.",
    "Sulje yksi häiriö tänään: some, ilmoitukset tai turha välilehti.",
  ];

  const movesBuild = [
    "Kirjoita 3 lauseen suunnitelma tälle päivälle projektista, joka on sinulle tärkeä.",
    "Päätä yksi konkreettinen tehtävä, joka valmistuu tänään, ja kirjoita se näkyviin.",
    "Lue 1 kappale AI/markkinointi-matskusta ja tee yksi pieni muistiinpano.",
    "Valitse yksi asia, jonka vältät tänään ensimmäiset 3 tuntia (esim. some).",
  ];

  const movesPush = [
    "Aloita 20 minuutin fokussessio heti, kun suljet tämän appin – ei somea, ei välilehtiä.",
    "Tee rohkea viesti: lähetä yhdelle ihmiselle viesti, joka vie projektia eteenpäin.",
    "Valitse yksi “liian iso” tehtävä ja pilko se kolmeen mikrosiirtoon – tee ensimmäinen heti.",
    "Käynnistä keho: 10–15 kyykkyä, 10 punnerrusta tai 2 min nopea kävely sisällä/ulkona.",
  ];

  if (isHard) {
    return movesHard[Math.floor(Math.random() * movesHard.length)];
  }

  if (profile.intent === "push") {
    return movesPush[Math.floor(Math.random() * movesPush.length)];
  }
  if (profile.intent === "build") {
    return movesBuild[Math.floor(Math.random() * movesBuild.length)];
  }

  // Recovery + ei hard
  return movesHard[Math.floor(Math.random() * movesHard.length)];
}

// -------- RENDERERS --------
function renderStats() {
  setText("statTotalStarts", state.stats.totalStarts.toString());
  setText("statCurrentStreak", state.stats.currentStreak.toString());
  setText("statBestStreak", state.stats.bestStreak.toString());
  setText("statHardMornings", state.stats.hardMornings.toString());
}

function renderProfileButtons() {
  const p = state.lastProfile;

  const setActive = (group, value) => {
    const buttons = document.querySelectorAll(`.option-btn[data-group="${group}"]`);
    buttons.forEach((btn) => {
      const v = btn.getAttribute("data-value");
      btn.classList.toggle("active", v === value);
    });
  };

  setActive("body", p.body);
  setActive("mind", p.mind);
  setActive("intent", p.intent);
}

function renderDayCard(profileResult) {
  const { difficulty, isHard, modeLabel, diffLabel, diffTone, flowPercent, jarvisLine, microMove } =
    profileResult;

  const badge = document.getElementById("difficultyBadge");
  if (badge) {
    badge.textContent = `${diffLabel} · diff ${difficulty}/10`;
    badge.style.borderColor =
      diffTone === "hard"
        ? "rgba(255,91,107,0.9)"
        : diffTone === "easy"
        ? "rgba(64,224,255,0.9)"
        : "rgba(255,255,255,0.2)";
  }

  const modePill = document.getElementById("modePill");
  if (modePill) {
    modePill.textContent = modeLabel;
  }

  const energyFill = document.getElementById("energyFill");
  const energyPercent = document.getElementById("energyPercent");
  if (energyFill) {
    energyFill.style.width = `${flowPercent}%`;
  }
  if (energyPercent) {
    energyPercent.textContent = `${flowPercent} %`;
  }

  const jarvisLineEl = document.getElementById("jarvisLine");
  if (jarvisLineEl) {
    jarvisLineEl.textContent = jarvisLine;
  }

  const microMoveEl = document.getElementById("microMove");
  if (microMoveEl) {
    microMoveEl.textContent = microMove;
  }

  const daySubtitle = document.getElementById("daySubtitle");
  if (daySubtitle) {
    if (isHard) {
      daySubtitle.textContent =
        "Tämä on hard aamu. Peli ei ole “kaikki tai ei mitään” – tee vain mikroteko ja yksi askel eteenpäin.";
    } else {
      daySubtitle.textContent =
        "Aamu on ajettavissa. Käytä se rakentamiseen, ei itsesi lyömiseen.";
    }
  }

  const momentumLine = document.getElementById("momentumLine");
  if (momentumLine) {
    const streak = state.stats.currentStreak;
    if (streak <= 1) {
      momentumLine.textContent =
        "Momentum alkaa tästä yhdestä aamusta. Et tarvitse eilistä, tarvitset vain startin.";
    } else {
      momentumLine.textContent = `Momentum: ${streak} aamua putkeen. Älä katkaise ketjua yhdellä huonolla fiiliksellä.`;
    }
  }
}

// Päivittää profiilin tilaan + cardin + hard-morning-laskurin
function updateProfileAndCard() {
  const profile = state.lastProfile;
  const result = computeProfile(profile);

  // Päivitä vaikeus & hard-morning logiikka statsille
  const today = getTodayISO();
  const isToday = state.lastDateStarted === today;

  if (isToday) {
    // Jos tänään ei vielä merkitty hard morningiksi ja tästä tulee hard,
    // nostetaan hardMornings kerran.
    if (result.isHard && !state.hardMarkedForToday) {
      state.stats.hardMornings += 1;
      state.hardMarkedForToday = true;
    }
  }

  renderProfileButtons();
  renderDayCard(result);
  renderStats();
  saveState();
}

// -------- EVENT HANDLERS --------
function handleOptionClick(e) {
  const btn = e.target;
  if (!(btn instanceof HTMLElement)) return;
  if (!btn.classList.contains("option-btn")) return;

  const group = btn.getAttribute("data-group");
  const value = btn.getAttribute("data-value");
  if (!group || !value) return;

  // päivitä state
  if (group === "body") state.lastProfile.body = value;
  else if (group === "mind") state.lastProfile.mind = value;
  else if (group === "intent") state.lastProfile.intent = value;

  updateProfileAndCard();
}

function initUI() {
  // Stats
  renderStats();

  // Start button
  const startBtn = document.getElementById("startButton");
  if (startBtn) {
    startBtn.addEventListener("click", handleStartClick);
  }

  // Option buttons (delegaatio)
  document.addEventListener("click", handleOptionClick);

  // Päivätilanne: jos olet jo startannut tänään, näytetään suoraan main panel
  const today = getTodayISO();
  if (state.lastDateStarted === today) {
    showMainPanel();
    updateProfileAndCard();
  } else {
    // varmistetaan, että start panel näkyy
    const startPanel = document.getElementById("startPanel");
    const mainPanel = document.getElementById("mainPanel");
    if (startPanel) startPanel.classList.remove("hidden");
    if (mainPanel) mainPanel.classList.add("hidden");
  }
}

// -------- INIT --------
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initUI();
});
