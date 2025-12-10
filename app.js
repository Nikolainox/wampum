const STORAGE_KEY = "fi_varikko_library_elite_v2";

const HABIT_GROUPS = [
  {
    id: "mind",
    title: "Mind & Focus",
    directionWeight: 1.3,
    habits: [
      { id: "mind_breath_3", title: "Hengitys 3 min", desc: "Lyhyt hengitysharjoitus." },
      { id: "mind_breath_10", title: "Hengitys 10 min", desc: "Syvempi hengityssessio." },
      { id: "mind_focus_1", title: "Fokus-stintti 20 min", desc: "Keskeytyksetön työblokki." },
      { id: "mind_focus_2", title: "Fokus-stintti 40 min", desc: "Syvä keskittyminen." },
      { id: "mind_medit_5", title: "Meditaatio 5 min", desc: "Nopea mielen nollaus." },
      { id: "mind_medit_15", title: "Meditaatio 15 min", desc: "Pidempi rauhoittuminen." },
      { id: "mind_journal_3", title: "3 riviä journalia", desc: "Kirjoitit ajatuksia ylös." },
      { id: "mind_journal_dump", title: "Brain dump", desc: "Tyhjensit pään paperille." },
      { id: "mind_no_morning_scroll", title: "Ei aamusomea", desc: "Aamu ilman scrolleja." },
      { id: "mind_evening_reflect", title: "Illan reflektio", desc: "Lyhyt päivän arvio." },
      { id: "mind_read_5", title: "Lukeminen 5 min", desc: "Kirja tai artikkeli." },
      { id: "mind_read_20", title: "Lukeminen 20 min", desc: "Syvempi oppiminen." },
      { id: "mind_gratitude_3", title: "3 kiitollisuutta", desc: "Mistä olit kiitollinen." },
      { id: "mind_stress_release", title: "Stressin purku", desc: "Kirjoitit tai puhuit ulos." },
      { id: "mind_visualize", title: "Visualisaatio", desc: "Mielikuva halutusta tulevaisuudesta." },
      { id: "mind_silence", title: "Hiljainen hetki", desc: "5 min ilman ärsykkeitä." },
      { id: "mind_top_task_touch", title: "Tärkein tehtävä aloitettu", desc: "Kosketit tärkeintä asiaa." },
      { id: "mind_planning_10", title: "10 min suunnittelu", desc: "Päivän suunnittelu." },
      { id: "mind_problem_solve", title: "Ongelman ratkaisu", desc: "Työstät yhtä haastetta." },
      { id: "mind_learning_note", title: "Oppimismuistiinpano", desc: "Kirjoitit mitä opit." }
    ]
  },
  {
    id: "body",
    title: "Body & Performance",
    directionWeight: 1.3,
    habits: [
      { id: "body_walk_10", title: "Kävely 10 min", desc: "Kevyt liike." },
      { id: "body_walk_30", title: "Kävely 30 min", desc: "Pidempi lenkki." },
      { id: "body_mobility_5", title: "Mobility 5 min", desc: "Lyhyt liikkuvuussetti." },
      { id: "body_mobility_15", title: "Mobility 15 min", desc: "Koko kehon avaus." },
      { id: "body_sweat", title: "Hikoilu", desc: "Fyysinen rasitus." },
      { id: "body_strength", title: "Voimatreeni", desc: "Painot tai kehonpaino." },
      { id: "body_activation", title: "Aamun aktivointi", desc: "Kehon käynnistys." },
      { id: "body_cold_shower", title: "Cold shower", desc: "Kylmäaltistus." },
      { id: "body_sauna", title: "Sauna", desc: "Palauttava lämpö." },
      { id: "body_water", title: "Vesi & elektrolyytit", desc: "Nesteytys." },
      { id: "body_protein", title: "Proteiiniannos", desc: "Riittävä proteiini." },
      { id: "body_meal_quality", title: "Fiksu ateria", desc: "Hyvä ravinto." },
      { id: "body_sleep_7", title: "Uni 7h+", desc: "Riittävä lepo." },
      { id: "body_sleep_consistent", title: "Unirytmi", desc: "Sama nukkumaanmeno." },
      { id: "body_winddown", title: "Iltarutiini", desc: "Rauhoittava ilta." },
      { id: "body_posture_reset", title: "Ryhtireset", desc: "Korjasit asentoa." },
      { id: "body_micro_breaks", title: "Mikrotauot", desc: "Tauot istumisesta." },
      { id: "body_sunlight", title: "Päivänvalo", desc: "Ulkoilu/aurinko." },
      { id: "body_heart_rate_down", title: "Syke alas", desc: "Hengityksellä tai levolla." },
      { id: "body_recovery_block", title: "Palautumisblokki", desc: "Jotain keholle palauttavaa." }
    ]
  },
  {
    id: "discipline",
    title: "Discipline & Identity",
    directionWeight: 1.3,
    habits: [
      { id: "disc_keep_promise", title: "Pidit lupauksen", desc: "Itsellesi tai muille." },
      { id: "disc_do_hard", title: "Valitsit vaikeamman", desc: "Teit vaikean asian." },
      { id: "disc_no_alc", title: "Ei alkoholia", desc: "Päivä ilman alkoholia." },
      { id: "disc_no_morning_scroll", title: "Ei aamusomea", desc: "Aamu ilman ruutua." },
      { id: "disc_skip_bad", title: "Skippasit huonon tavan", desc: "Jätit jotain haitallista tekemättä." },
      { id: "disc_clean_3", title: "Siivoaminen 3 min", desc: "Pieni järjestysliike." },
      { id: "disc_single_task", title: "Single-tasking", desc: "Teit yhden asian loppuun." },
      { id: "disc_no_drama", title: "Ei draamaa", desc: "Et lähtenyt mukaan." },
      { id: "disc_future_self", title: "Tulevan itsen teko", desc: "Teit jotain pitkälle tulevaisuudelle." },
      { id: "disc_tiny_win", title: "Pieni voitto", desc: "Teit vähän epämukavaa." },
      { id: "disc_show_up", title: "Ilmestyit paikalle", desc: "Menit vaikka ei huvittanut." },
      { id: "disc_consistent_time", title: "Sama aloitusaika", desc: "Rutiinin aloitus samaan aikaan." },
      { id: "disc_delay_dopamine", title: "Dopamiinin viivästys", desc: "Siirsit palkintoa." },
      { id: "disc_boundaries", title: "Rajat", desc: "Sanoit ei, kun piti." },
      { id: "disc_no_excuses", title: "Ei tekosyitä", desc: "Et syyttänyt olosuhteita." },
      { id: "disc_micro_commit", title: "1 min commit", desc: "Aloitit minuutilla." },
      { id: "disc_finishing", title: "Valmistelu", desc: "Teit loppuun asti." },
      { id: "disc_habit_chain", title: "Habit chain", desc: "Useampi hyvä tapa putkeen." },
      { id: "disc_identity_move", title: "Identity move", desc: "Toimit kuten vahvempi versiosi." },
      { id: "disc_no_quit", title: "Ei luovutusta", desc: "Et lopettanut kesken." }
    ]
  },
  {
    id: "purpose",
    title: "Purpose & Long Game",
    directionWeight: 1.2,
    habits: [
      { id: "pur_project_10", title: "Projektityö 10 min", desc: "Pieni eteneminen." },
      { id: "pur_project_30", title: "Projektityö 30 min", desc: "Syvempi askel." },
      { id: "pur_read_goal", title: "Tavoitelukeminen", desc: "Luit tärkeää asiaa." },
      { id: "pur_network", title: "Yhteys ihmiseen", desc: "Yksi kontakti." },
      { id: "pur_money_move", title: "Rahat liikkeessä", desc: "Pieni raha-askel." },
      { id: "pur_vision_view", title: "Vision katsominen", desc: "Näin suuntani." },
      { id: "pur_weekly_direction", title: "Viikkosuunta", desc: "Päivitit suuntaa." },
      { id: "pur_deep_work", title: "Deep work", desc: "Syvä työblokki." },
      { id: "pur_skill_practice", title: "Taitoharjoittelu", desc: "Hieman joka päivä." },
      { id: "pur_long_term_yes", title: "Pitkän pelin kyllä", desc: "Yksi iso valinta." },
      { id: "pur_long_term_no", title: "Pitkän pelin ei", desc: "Kieltäydyit." },
      { id: "pur_side_project", title: "Sivuprojekti", desc: "Liikuit projektia." },
      { id: "pur_refine_plan", title: "Suunnitelman hienosäätö", desc: "Paransit suuntaa." },
      { id: "pur_output", title: "Tuotos", desc: "Tuotit sisältöä." },
      { id: "pur_teach", title: "Opetit jotakin", desc: "Jaot osaamista." },
      { id: "pur_legacy", title: "Legacy move", desc: "Teko josta olet ylpeä." },
      { id: "pur_value_add", title: "Arvon luonti", desc: "Loit arvoa päivän aikana." },
      { id: "pur_journal_future", title: "Tulevan itsen kirje", desc: "Kirjoitit itselle tulevaisuuteen." },
      { id: "pur_tomorrow_plan", title: "Huomisen suunnitelma", desc: "Valmistelit huomisen." },
      { id: "pur_course_progress", title: "Kurssin eteneminen", desc: "Pieni askel opiskelussa." }
    ]
  },
  {
    id: "recovery",
    title: "Recovery & Emotion",
    directionWeight: 1.4,
    habits: [
      { id: "rec_walk_calm", title: "Rauhallinen kävely", desc: "Palauttava liike." },
      { id: "rec_stretch", title: "Kevyt venyttely", desc: "Rentoutus." },
      { id: "rec_music", title: "Rauhoittava musiikki", desc: "Hetki rauhaa." },
      { id: "rec_breath_box", title: "Box breathing", desc: "4-4-4-4 hengitys." },
      { id: "rec_nap", title: "Power nap", desc: "5–20 min lepo." },
      { id: "rec_social_safe", title: "Turvallinen juttelu", desc: "Tunteiden jakaminen." },
      { id: "rec_cry", title: "Tunteen purku", desc: "Päästit läpi tunteen." },
      { id: "rec_no_caffeine_pm", title: "Ei kofeiinia iltapäivällä", desc: "Uni kiittää." },
      { id: "rec_no_screen_evening", title: "Ei ruutua illalla", desc: "Paras unirytmi." },
      { id: "rec_hot_cold", title: "Lämpö/kylmä", desc: "Sauna + kylmä." },
      { id: "rec_bath", title: "Lämmin suihku/kylpy", desc: "Palauttava hetki." },
      { id: "rec_gratitude_person", title: "Kiitollisuus ihmisestä", desc: "Tiedostit hyvän." },
      { id: "rec_nature", title: "Luontokontakti", desc: "Hetki ulkona." },
      { id: "rec_slow_morning", title: "Hidas aamu", desc: "Lempi-startti." },
      { id: "rec_slow_evening", title: "Hidas ilta", desc: "Rauha ennen unta." },
      { id: "rec_joy_moment", title: "Pieni ilo", desc: "Pieni mutta merkittävä kokemus." },
      { id: "rec_body_scan", title: "Body scan", desc: "Kehon läpikäynti." },
      { id: "rec_zero_input", title: "Zero-input", desc: "Ei podcasteja/videoita." },
      { id: "rec_compassion", title: "Myötätunto", desc: "Puhuit lempeästi itselle." }
    ]
  }
];

const BAD_HABITS = [
  { id: "bad_morning_phone", title: "Puhelin heti herätessä", penalty: 2 },
  { id: "bad_morning_scroll", title: "Aamuscrolli yli 20 min", penalty: 2 },
  { id: "bad_doomscroll", title: "Doomscroll 45+ min", penalty: 3 },
  { id: "bad_late_caffeine", title: "Kofeiini myöhään", penalty: 2 },
  { id: "bad_sugar_spike", title: "Sokeripiikki", penalty: 2 },
  { id: "bad_junk_food", title: "Roskajunkki", penalty: 2 },
  { id: "bad_sleep_late", title: "Valvoit liian myöhään", penalty: 3 },
  { id: "bad_no_sleep_rhythm", title: "Ei uniritmiä", penalty: 2 },
  { id: "bad_zero_movement", title: "Ei liikettä tänään", penalty: 2 },
  { id: "bad_posture_all_day", title: "Huono ryhti koko päivän", penalty: 2 },
  { id: "bad_stress_no_release", title: "Et purkanut stressiä", penalty: 2 },
  { id: "bad_drama", title: "Turha draama", penalty: 3 },
  { id: "bad_multitask", title: "Multitaskaus tärkeässä", penalty: 2 },
  { id: "bad_procrastination", title: "Viivyttely tärkeässä", penalty: 3 },
  { id: "bad_overcommit", title: "Liikaa lupauksia", penalty: 2 },
  { id: "bad_social_overload", title: "Liikaa somea", penalty: 2 },
  { id: "bad_env_clutter", title: "Täysi kaaos ympäristössä", penalty: 2 },
  { id: "bad_negative_selftalk", title: "Negatiivinen itsepuhe", penalty: 3 },
  { id: "bad_zero_boundaries", title: "Ei rajoja", penalty: 2 },
  { id: "bad_skip_meal", title: "Unohdit syödä", penalty: 2 },
  { id: "bad_binge_video", title: "Binge-videoilua", penalty: 2 },
  { id: "bad_alcohol", title: "Alkoholi yli suunnitelman", penalty: 3 },
  { id: "bad_overwork", title: "Yli 12h työpäivä", penalty: 2 },
  { id: "bad_zero_reflection", title: "Ei reflektiota", penalty: 1 },
  { id: "bad_emotional_avoid", title: "Tunteen pakoilu", penalty: 2 }
];

let days = [];
let todayDay = null;
let lastTapTime = 0;

function forEachHabit(cb) {
  HABIT_GROUPS.forEach(g => g.habits.forEach(h => cb(h, g)));
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatFi(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function loadDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDays() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  } catch {}
}

function createEmptyHabitsState() {
  const obj = {};
  forEachHabit(h => {
    obj[h.id] = {
      done: false,
      totalCompletions: 0,
      mastered: false,
      masteredAt: null,
      readinessDeltaSum: 0,
      readinessDeltaCount: 0,
      hardDayCount: 0
    };
  });
  return obj;
}

function createEmptyBadHabitsState() {
  const obj = {};
  BAD_HABITS.forEach(b => {
    obj[b.id] = { done: false };
  });
  return obj;
}

function defaultDay(dateISO) {
  return {
    id: "day_" + dateISO,
    date: dateISO,
    dayType: "race",
    difficulty: 5,
    energy: 5,
    stress: 5,
    mood: 5,
    sleep: "ok",
    motivation: 5,
    readiness: 50,
    momentum: 0,
    hardDay: false,
    habits: createEmptyHabitsState(),
    badHabits: createEmptyBadHabitsState(),
    notes: "",
    strategy: "",
    pitPlan: "",
    finalized: false,
    createdAt: new Date().toISOString()
  };
}

function ensureToday() {
  const todayISO = getTodayISO();
  let d = days.find(x => x.date === todayISO);
  if (!d) {
    d = defaultDay(todayISO);
    days.push(d);
  }
  todayDay = d;
  saveDays();
}

function getHabitState(day, habitId) {
  if (!day.habits[habitId]) {
    day.habits[habitId] = {
      done: false,
      totalCompletions: 0,
      mastered: false,
      masteredAt: null,
      readinessDeltaSum: 0,
      readinessDeltaCount: 0,
      hardDayCount: 0
    };
  }
  return day.habits[habitId];
}

function getBadHabitState(day, badId) {
  if (!day.badHabits[badId]) {
    day.badHabits[badId] = { done: false };
  }
  return day.badHabits[badId];
}

function computeStreakOfficial(habitId, refISO) {
  let streak = 0;
  const date = new Date(refISO);
  const iso = d => d.toISOString().slice(0, 10);
  while (true) {
    const cur = iso(date);
    const day = days.find(x => x.date === cur);
    if (!day || !day.finalized) break;
    if (!day.habits[habitId]?.done) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function computeStreakPreviewToday(habitId) {
  if (!todayDay) return 0;
  const official = computeStreakOfficial(habitId, todayDay.date);
  if (todayDay.finalized) return official;
  const st = getHabitState(todayDay, habitId);
  return st.done ? official + 1 : official;
}

function computeHabitSummary(day) {
  let done = 0;
  let total = 0;
  forEachHabit(h => {
    total++;
    if (day.habits[h.id].done) done++;
  });
  return { done, total };
}

function computeBadHabitsToday(day) {
  let penalty = 0;
  let count = 0;
  BAD_HABITS.forEach(b => {
    if (day.badHabits[b.id].done) {
      count++;
      penalty += b.penalty;
    }
  });
  return { count, penalty };
}

function computeBaseReadinessNoHabits(day) {
  const base = (day.energy + (11 - day.stress) + day.mood + day.motivation) / 40;
  let sleepBonus = 0;
  if (day.sleep === "good") sleepBonus = 0.08;
  else if (day.sleep === "bad") sleepBonus = -0.12;
  const diffPenalty = (day.difficulty - 5) / 25;
  let val = base + sleepBonus - diffPenalty;
  return Math.round(clamp01(val) * 100);
}

function computeHabitScore(day) {
  const { done, total } = computeHabitSummary(day);
  return total ? done / total : 0;
}

function computeReadiness(day) {
  const base = computeBaseReadinessNoHabits(day);
  const habitScore = computeHabitScore(day);
  const bonus = habitScore * 15;
  let r = clamp01((base + bonus) / 100) * 100;
  day.readiness = Math.round(r);
  day.hardDay =
    day.difficulty >= 7 ||
    (day.energy <= 4 && day.stress >= 7) ||
    (day.sleep === "bad" && day.stress >= 6);
  return { habitScore, baseReadiness: base };
}

function computeHabit30dFrequency(habitId, refISO) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const idx = sorted.findIndex(x => x.date === refISO);
  if (idx === -1) return 0;
  const last30 = sorted.slice(Math.max(0, idx - 30), idx);
  if (!last30.length) return 0;
  let count = 0;
  last30.forEach(d => {
    if (d.finalized && d.habits[habitId]?.done) count++;
  });
  return count / last30.length;
}

function computeMomentum(day, habitScore, baseReadiness) {
  const delta = day.readiness - baseReadiness;
  const deltaNorm = Math.max(-20, Math.min(20, delta));
  const quality = 1 + deltaNorm / 50;
  let goodTotal = 0;
  HABIT_GROUPS.forEach(group => {
    group.habits.forEach(habit => {
      const st = getHabitState(day, habit.id);
      if (!st.done) return;
      const streakOfficial = computeStreakOfficial(habit.id, day.date);
      const preview = day.finalized ? streakOfficial : streakOfficial + 1;
      const streakFactor = Math.min(preview / 7, 1.5);
      const freq30 = computeHabit30dFrequency(habit.id, day.date);
      const consistency = clamp01(
        0.5 * (streakFactor / 1.5) + 0.5 * freq30
      );
      const direction = group.directionWeight || 1.2;
      const score = consistency * quality * direction;
      goodTotal += score;
    });
  });
  const { penalty } = computeBadHabitsToday(day);
  const badPenalty = penalty * 2.5;
  let raw = goodTotal * 25 - badPenalty * 5;
  raw = Math.max(0, Math.min(100, Math.round(raw)));
  day.momentum = raw;
  return raw;
}

function computeMonteCarloScore(habitId, refISO) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  const idx = sorted.findIndex(x => x.date === refISO);
  const last30 = sorted.slice(Math.max(0, idx - 30), idx);
  let trials = 0;
  let successes = 0;
  last30.forEach(d => {
    if (d.finalized) {
      trials++;
      if (d.habits[habitId]?.done) successes++;
    }
  });
  if (!trials) return 0;
  const base = successes / trials;
  const streak = computeStreakOfficial(habitId, refISO);
  const streakBoost = Math.min(streak / 10, 0.3);
  let p = base * 0.7 + streakBoost;
  return Math.round(clamp01(p) * 100);
}

function getHabitAggregate(habitId) {
  let totalCompletions = 0;
  let hardCount = 0;
  let mastered = false;
  let masteredAt = null;
  let deltaSum = 0;
  let deltaCount = 0;
  days.forEach(d => {
    const st = d.habits?.[habitId];
    if (!st) return;
    totalCompletions += st.totalCompletions || 0;
    hardCount += st.hardDayCount || 0;
    if (st.mastered) {
      mastered = true;
      if (!masteredAt || st.masteredAt < masteredAt) {
        masteredAt = st.masteredAt;
      }
    }
    deltaSum += st.readinessDeltaSum || 0;
    deltaCount += st.readinessDeltaCount || 0;
  });
  const deltaAvg =
    deltaCount > 0 ? Math.round((deltaSum / deltaCount) * 10) / 10 : 0;
  return {
    totalCompletions,
    hardDayCount: hardCount,
    mastered,
    masteredAt,
    readinessDeltaAvg: deltaAvg
  };
}

function makeHabitTile(h, st, group) {
  const tile = document.createElement("div");
  tile.className = "habit-tile";
  if (st.done) tile.classList.add("done");
  const streak = computeStreakPreviewToday(h.id);
  if (streak >= 7) tile.classList.add("streak7");
  const header = document.createElement("div");
  header.className = "habit-tile-header";
  const title = document.createElement("div");
  title.className = "habit-tile-title";
  title.textContent = h.title;
  const status = document.createElement("div");
  status.className = "habit-tile-status";
  status.textContent = st.mastered ? "MASTERED" : "";
  header.appendChild(title);
  header.appendChild(status);
  const body = document.createElement("div");
  body.className = "habit-tile-body";
  body.textContent = h.desc;
  const footer = document.createElement("div");
  footer.className = "habit-tile-footer";
  const streakEl = document.createElement("div");
  streakEl.textContent = `Streak: ${streak}`;
  const mc = computeMonteCarloScore(h.id, todayDay.date);
  const mcEl = document.createElement("div");
  mcEl.textContent = `MC: ${mc}%`;
  footer.appendChild(streakEl);
  footer.appendChild(mcEl);
  tile.appendChild(header);
  tile.appendChild(body);
  tile.appendChild(footer);
  tile.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTapTime < 250 && !todayDay.finalized) {
      st.done = !st.done;
      if (st.done) st.totalCompletions++;
      saveDays();
      renderHabitLibrary();
      updateRealtimeHub();
      pitRadioMessage("Habit päivitetty.");
    }
    lastTapTime = now;
  });
  return tile;
}

function renderMasteredSection() {
  const container = document.createElement("div");
  container.className = "habit-row";
  const title = document.createElement("div");
  title.className = "habit-row-title";
  title.textContent = "Mastered Collection";
  container.appendChild(title);
  const strip = document.createElement("div");
  strip.className = "habit-row-strip";
  HABIT_GROUPS.forEach(group => {
    group.habits.forEach(h => {
      const agg = getHabitAggregate(h.id);
      if (!agg.mastered) return;
      const tile = document.createElement("div");
      tile.className = "habit-tile streak7";
      const header = document.createElement("div");
      header.className = "habit-tile-header";
      const nm = document.createElement("div");
      nm.className = "habit-tile-title";
      nm.textContent = h.title;
      const badge = document.createElement("div");
      badge.className = "habit-tile-status";
      badge.textContent = "MASTERED";
      header.appendChild(nm);
      header.appendChild(badge);
      const body = document.createElement("div");
      body.className = "habit-tile-body";
      body.innerHTML =
        `Suorituksia: ${agg.totalCompletions}<br>` +
        `Vaikeita päiviä: ${agg.hardDayCount}<br>` +
        `Readiness delta: ${agg.readinessDeltaAvg}`;
      const footer = document.createElement("div");
      footer.className = "habit-tile-footer";
      footer.innerHTML = `Unlck: ${
        agg.masteredAt ? agg.masteredAt.slice(5) : "-"
      }`;
      tile.appendChild(header);
      tile.appendChild(body);
      tile.appendChild(footer);
      strip.appendChild(tile);
    });
  });
  container.appendChild(strip);
  return container;
}

function renderBadHabitSection() {
  const container = document.createElement("div");
  container.className = "habit-row";
  const title = document.createElement("div");
  title.className = "habit-row-title";
  title.textContent = "Huonot Habitit";
  container.appendChild(title);
  const strip = document.createElement("div");
  strip.className = "habit-row-strip";
  BAD_HABITS.forEach(b => {
    const st = getBadHabitState(todayDay, b.id);
    const tile = document.createElement("div");
    tile.className = "habit-tile";
    if (st.done) tile.classList.add("done");
    tile.innerHTML =
      `<div class='habit-tile-header'><div class='habit-tile-title'>${b.title}</div><div class='habit-tile-status'>-${b.penalty}</div></div>` +
      `<div class='habit-tile-body'>Haittakerroin: ${b.penalty}</div>` +
      `<div class='habit-tile-footer'><span></span><span></span></div>`;
    tile.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastTapTime < 250 && !todayDay.finalized) {
        st.done = !st.done;
        saveDays();
        renderHabitLibrary();
        updateRealtimeHub();
        pitRadioMessage("Huono habit päivitetty.");
      }
      lastTapTime = now;
    });
    strip.appendChild(tile);
  });
  container.appendChild(strip);
  return container;
}

function renderHabitLibrary() {
  if (!todayDay) return;
  const { habitScore, baseReadiness } = computeReadiness(todayDay);
  computeMomentum(todayDay, habitScore, baseReadiness);
  const headerDate = document.getElementById("libraryDate");
  headerDate.textContent = "Päivä: " + formatFi(todayDay.date);
  const sum = computeHabitSummary(todayDay);
  document.getElementById("libraryHabitSummary").textContent =
    `Suoritettu: ${sum.done}/${sum.total}`;
  document.getElementById("libraryReadiness").textContent =
    `Readiness: ${todayDay.readiness}%`;
  const container = document.getElementById("habitSections");
  container.innerHTML = "";
  container.appendChild(renderMasteredSection());
  HABIT_GROUPS.forEach(group => {
    const row = document.createElement("div");
    row.className = "habit-row";
    const title = document.createElement("div");
    title.className = "habit-row-title";
    title.textContent = group.title;
    const strip = document.createElement("div");
    strip.className = "habit-row-strip";
    group.habits.forEach(h => {
      const st = getHabitState(todayDay, h.id);
      strip.appendChild(makeHabitTile(h, st, group));
    });
    row.appendChild(title);
    row.appendChild(strip);
    container.appendChild(row);
  });
  container.appendChild(renderBadHabitSection());
  updateRealtimeHub();
  renderTelemetryPanel();
}

function countMasteredCards() {
  let count = 0;
  HABIT_GROUPS.forEach(g => {
    g.habits.forEach(h => {
      if (getHabitAggregate(h.id).mastered) count++;
    });
  });
  return count;
}

function updateRealtimeHub() {
  if (!todayDay) return;
  const sum = computeHabitSummary(todayDay);
  const masteredCount = countMasteredCards();
  let lifetime = 0;
  HABIT_GROUPS.forEach(g => {
    g.habits.forEach(h => {
      lifetime += getHabitAggregate(h.id).totalCompletions;
    });
  });
  document.getElementById("hubHeadline").textContent =
    `Readiness ${todayDay.readiness}% · Momentum ${todayDay.momentum}/100 · Mastered ${masteredCount}`;
  document.getElementById("hubMasteredCount").textContent = masteredCount;
  document.getElementById("hubTodayHabits").textContent =
    `${sum.done}/${sum.total}`;
  document.getElementById("hubLifetime").textContent = lifetime;
}

function pitRadioMessage(msg) {
  const el = document.getElementById("pitMessage");
  if (el) el.textContent = msg;
}

function renderTelemetryPanel() {
  if (!todayDay) return;
  const { habitScore, baseReadiness } = computeReadiness(todayDay);
  computeMomentum(todayDay, habitScore, baseReadiness);
  const sum = computeHabitSummary(todayDay);
  const dateLabel = document.getElementById("todayDateLabel");
  const readinessValue = document.getElementById("readinessValue");
  const dayModeTag = document.getElementById("dayModeTag");
  const hardDayTag = document.getElementById("hardDayTag");
  const habitSummaryTag = document.getElementById("habitSummaryTag");
  dateLabel.textContent =
    "Päivä: " + formatFi(todayDay.date) + (todayDay.finalized ? " · LUKITTU" : "");
  readinessValue.textContent = `${todayDay.readiness}%`;
  dayModeTag.textContent = `Mode: ${todayDay.dayType}`;
  hardDayTag.textContent = todayDay.hardDay ? "Hard day" : "Normipäivä";
  habitSummaryTag.textContent =
    `Habit: ${sum.done}/${sum.total} · Momentum ${todayDay.momentum}`;
  const diffLabel = document.getElementById("difficultyLabel");
  const energyLabel = document.getElementById("energyLabel");
  const stressLabel = document.getElementById("stressLabel");
  const moodLabel = document.getElementById("moodLabel");
  const motivationLabel = document.getElementById("motivationLabel");
  diffLabel.textContent = `${todayDay.difficulty}/10`;
  energyLabel.textContent = `${todayDay.energy}/10`;
  stressLabel.textContent = `${todayDay.stress}/10`;
  moodLabel.textContent = `${todayDay.mood}/10`;
  motivationLabel.textContent = `${todayDay.motivation}/10`;
  document.querySelector("input[data-field='difficulty']").value =
    todayDay.difficulty;
  document.querySelector("input[data-field='energy']").value =
    todayDay.energy;
  document.querySelector("input[data-field='stress']").value =
    todayDay.stress;
  document.querySelector("input[data-field='mood']").value =
    todayDay.mood;
  document.querySelector("input[data-field='motivation']").value =
    todayDay.motivation;
  document.querySelector("select[data-field='dayType']").value =
    todayDay.dayType;
  document.querySelector("select[data-field='sleep']").value =
    todayDay.sleep;
  const notes = document.getElementById("notes");
  notes.value = todayDay.notes || "";
  const stintSummary = document.getElementById("stintSummary");
  const pitPlan = document.getElementById("pitPlan");
  stintSummary.textContent = todayDay.strategy || "";
  pitPlan.textContent = todayDay.pitPlan || "";
}

function bindSliders() {
  document.querySelectorAll("input[type=range]").forEach(r => {
    r.addEventListener("input", () => {
      if (todayDay.finalized) return;
      const field = r.getAttribute("data-field");
      const label = document.getElementById(field + "Label");
      todayDay[field] = Number(r.value);
      if (label) label.textContent = `${r.value}/10`;
      saveDays();
      renderHabitLibrary();
    });
  });
  document.querySelectorAll("select[data-field]").forEach(sel => {
    sel.addEventListener("change", () => {
      if (todayDay.finalized) return;
      const field = sel.getAttribute("data-field");
      todayDay[field] = sel.value;
      saveDays();
      renderHabitLibrary();
    });
  });
  const notes = document.getElementById("notes");
  notes.addEventListener("input", () => {
    if (todayDay.finalized) return;
    todayDay.notes = notes.value;
    saveDays();
  });
}

function finalizeToday() {
  if (!todayDay || todayDay.finalized) return;
  const base = computeBaseReadinessNoHabits(todayDay);
  const delta = todayDay.readiness - base;
  if (todayDay.hardDay) {
    forEachHabit(h => {
      const st = getHabitState(todayDay, h.id);
      if (st.done) st.hardDayCount++;
    });
  }
  forEachHabit(h => {
    const st = getHabitState(todayDay, h.id);
    if (st.done) {
      st.readinessDeltaSum += delta;
      st.readinessDeltaCount++;
    }
  });
  forEachHabit(h => {
    const streak = computeStreakOfficial(h.id, todayDay.date);
    if (streak >= 7) {
      const st = getHabitState(todayDay, h.id);
      if (!st.mastered) {
        st.mastered = true;
        st.masteredAt = todayDay.date;
      }
    }
  });
  todayDay.finalized = true;
  saveDays();
  renderHabitLibrary();
  renderHistory();
  updateRealtimeHub();
  pitRadioMessage("Päivä lukittu.");
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));
  list.innerHTML = "";
  sorted.forEach(d => {
    const item = document.createElement("div");
    item.className = "history-item";
    const dt = document.createElement("div");
    dt.className = "history-item-date";
    dt.textContent = formatFi(d.date);
    const tag = document.createElement("div");
    tag.className = "history-item-tag";
    tag.textContent = `Ready ${d.readiness}% · Mom ${d.momentum}`;
    item.appendChild(dt);
    item.appendChild(tag);
    item.addEventListener("click", () => {
      document.querySelectorAll(".history-item").forEach(i =>
        i.classList.remove("selected")
      );
      item.classList.add("selected");
      document.getElementById("historyDetail").textContent = JSON.stringify(
        d,
        null,
        2
      );
    });
    list.appendChild(item);
  });
}

function bindExport() {
  const btn = document.getElementById("exportBtn");
  btn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(days, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FI_VARIKKO_DATA.json";
    a.click();
  });
}

function bindNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.getAttribute("data-view");
      document.querySelectorAll(".view").forEach(v =>
        v.classList.remove("active")
      );
      if (view) {
        document.getElementById("view-" + view).classList.add("active");
        if (view === "telemetry") renderTelemetryPanel();
      }
    });
  });
}

function init() {
  days = loadDays();
  ensureToday();
  bindSliders();
  bindExport();
  bindNavigation();
  const finalizeBtn = document.getElementById("finalizeBtn");
  finalizeBtn.addEventListener("click", finalizeToday);
  renderHabitLibrary();
  renderHistory();
  updateRealtimeHub();
  pitRadioMessage("FI Varikko käynnistetty.");
}

window.addEventListener("load", init);
