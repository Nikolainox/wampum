const STORAGE_KEY = "life_deck_v1";

let state = {
  days: [],
  today: null
};

const GOLD_THRESHOLD = 7;

const CATEGORIES = [
  {
    id: "mind",
    title: "Mind",
    habits: [
      "Breathing 1 min","Breathing 5 min","Meditation","Thought dump",
      "No morning phone","Read 5 pages","Silence","Visualize",
      "One hard thought","Focus 20 min","Focus 40 min","Gratitude",
      "Journal 3 lines","No news","Mindful walk"
    ]
  },
  {
    id: "body",
    title: "Body",
    habits: [
      "Walk 10 min","Walk 30 min","Mobility","Stretch",
      "Cold shower","Strength","Light sweat","Hydration",
      "Protein intake","Sleep routine","Early bedtime","Posture reset",
      "Sunlight","Breathing before sleep","Relax muscles"
    ]
  },
  {
    id: "discipline",
    title: "Discipline",
    habits: [
      "No excuses","Kept promise","Did hard thing","Single task",
      "No multitask","One boundary","Start uncomfortable",
      "Finish task","No doomscroll","Delayed dopamine",
      "Showed up","No complaining","Minimal day","Clean space","Plan tomorrow"
    ]
  },
  {
    id: "recovery",
    title: "Recovery",
    habits: [
      "Slow evening","No screen 30 min","Calm music","Nature",
      "Hot shower","Cold exposure","Breathing box","Body scan",
      "Nap","Stretch evening","Light walk","Gratitude person",
      "Emotional release","Compassion","Do nothing"
    ]
  }
];

function todayISO() {
  return new Date().toISOString().slice(0,10);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  state = JSON.parse(raw);
}

function createDay(date) {
  return {
    date,
    habits: {},
    telemetry: { readiness: 50, momentum: 50 },
    finalized: false
  };
}

function ensureToday() {
  const d = todayISO();
  let day = state.days.find(x => x.date === d);
  if (!day) {
    day = createDay(d);
    state.days.push(day);
  }
  state.today = day;
}

function getHabitKey(catId, name) {
  return `${catId}:${name}`;
}

function habitState(key) {
  if (!state.today.habits[key]) {
    state.today.habits[key] = {
      state: "library",
      selectedCount: 0,
      doneToday: false
    };
  }
  return state.today.habits[key];
}

/* ---------- RENDER ---------- */

function renderHome() {
  const container = document.getElementById("activeCards");
  container.innerHTML = "";
  const active = Object.entries(state.today.habits)
    .filter(([_, h]) => h.state === "active");

  document.getElementById("emptyHome").style.display =
    active.length ? "none" : "block";

  active.forEach(([key, h]) => {
    const card = document.createElement("div");
    card.className = "card" + (h.doneToday ? " done" : "");
    card.innerHTML = `
      <div class="card-title">${key.split(":")[1]}</div>
      <div class="card-meta">
        <span>${h.doneToday ? "Done" : "Tap when done"}</span>
      </div>
    `;
    card.onclick = () => toggleDone(key);
    container.appendChild(card);
  });
}

function renderLibrary() {
  const container = document.getElementById("librarySections");
  container.innerHTML = "";

  CATEGORIES.forEach(cat => {
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = cat.title;

    const row = document.createElement("div");
    row.className = "card-row";

    cat.habits.forEach(name => {
      const key = getHabitKey(cat.id, name);
      const h = habitState(key);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-title">${name}</div>
        <div class="card-desc">Double tap to add</div>
      `;
      card.onclick = () => addToToday(key);
      row.appendChild(card);
    });

    container.appendChild(title);
    container.appendChild(row);
  });
}

function renderGold() {
  const container = document.getElementById("goldCards");
  container.innerHTML = "";

  const gold = [];
  state.days.forEach(d => {
    Object.entries(d.habits).forEach(([key, h]) => {
      if (h.selectedCount >= GOLD_THRESHOLD) gold.push(key);
    });
  });

  const unique = [...new Set(gold)];
  document.getElementById("emptyGold").style.display =
    unique.length ? "none" : "block";

  unique.forEach(key => {
    const card = document.createElement("div");
    card.className = "card gold";
    card.innerHTML = `
      <div class="card-title">${key.split(":")[1]}</div>
      <div class="card-meta">Gold habit</div>
    `;
    container.appendChild(card);
  });
}

/* ---------- ACTIONS ---------- */

function addToToday(key) {
  const h = habitState(key);
  if (h.state !== "library") return;
  h.state = "active";
  h.doneToday = false;
  renderHome();
  save();
}

function toggleDone(key) {
  const h = habitState(key);
  if (h.state !== "active") return;
  h.doneToday = !h.doneToday;
  renderHome();
  save();
}

function finalizeDay() {
  Object.values(state.today.habits).forEach(h => {
    if (h.state === "active") {
      h.selectedCount += 1;
      h.state = "library";
      h.doneToday = false;
    }
  });
  state.today.finalized = true;
  save();
  status("Day finalized");
  renderHome();
  renderGold();
}

function status(msg) {
  document.getElementById("statusMessage").textContent = msg;
}

/* ---------- NAV ---------- */

function bindNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      document.getElementById("view-" + btn.dataset.view).classList.add("active");
    };
  });
}

/* ---------- INIT ---------- */

function init() {
  load();
  ensureToday();
  bindNav();
  document.getElementById("finalizeBtn").onclick = finalizeDay;
  renderHome();
  renderLibrary();
  renderGold();
}

window.onload = init;
