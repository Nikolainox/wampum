const STORAGE_KEY = "spatial_peak_latest_v1";
const VERSION = 1;

const DOUBLE_TAP_MS = 260;
const LONG_PRESS_MS = 520;

const MIN_HAND = 3;
const MAX_HAND = 5;

const LOOKBACK_DAYS = 60;
const MC_RUNS = 700;

const LIVES_WEEKLY_MAX = 5;
const LIFE_LOSS_MAX_PER_DAY = 2;

const BLOCKS = [
  {id:"morning", title:"Morning"},
  {id:"midday", title:"Midday"},
  {id:"day", title:"Day"},
  {id:"evening", title:"Evening"},
  {id:"night", title:"Night"}
];

const TRACKS = ["focus","food","habit","train","sleep"];
const TRACK_COLOR = {
  focus:"rgba(94,231,255,0.95)",
  food:"rgba(255,155,95,0.90)",
  habit:"rgba(170,120,255,0.92)",
  train:"rgba(90,255,170,0.90)",
  sleep:"rgba(90,180,255,0.92)"
};

function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
function clampInt(x,a,b){ return Math.round(clamp(Number(x||0),a,b)); }
function isoToday(){ return new Date().toISOString().slice(0,10); }
function safeParse(s){ try{return JSON.parse(s);}catch{return null;} }
function $(id){ return document.getElementById(id); }
function $all(sel){ return [...document.querySelectorAll(sel)]; }
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

const LIB = [
  mk("morning","Meditation 5 min",{cost:1,pot:4,tags:["focus","habit"],relBase:0.62}),
  mk("morning","Breathing 3 min",{cost:1,pot:2,tags:["focus","habit"],relBase:0.70}),
  mk("morning","Sunlight 10 min",{cost:1,pot:3,tags:["habit","sleep"],relBase:0.66}),
  mk("morning","No phone 30 min",{cost:2,pot:5,tags:["focus","habit"],relBase:0.58}),
  mk("morning","Protein breakfast",{cost:2,pot:4,tags:["food","habit"],relBase:0.60}),
  mk("morning","Water + salt",{cost:1,pot:2,tags:["food","habit"],relBase:0.72}),
  mk("morning","Walk 10 min",{cost:2,pot:3,tags:["train","habit"],relBase:0.60}),
  mk("morning","Plan top task",{cost:2,pot:5,tags:["focus","habit"],relBase:0.55}),
  mk("morning","Cold splash",{cost:2,pot:3,tags:["habit"],relBase:0.56}),
  mk("morning","Journal 3 lines",{cost:1,pot:3,tags:["focus","habit"],relBase:0.60}),

  mk("midday","Single focus 20 min",{cost:3,pot:6,tags:["focus"],relBase:0.52}),
  mk("midday","Whole meal",{cost:2,pot:5,tags:["food"],relBase:0.62}),
  mk("midday","No doomscroll",{cost:2,pot:6,tags:["focus","habit"],relBase:0.55}),
  mk("midday","Stretch 3 min",{cost:1,pot:2,tags:["train","habit"],relBase:0.70}),
  mk("midday","Hydration",{cost:1,pot:2,tags:["food"],relBase:0.72}),
  mk("midday","Skill practice 20 min",{cost:4,pot:7,tags:["focus"],relBase:0.46}),
  mk("midday","Inbox 5 min",{cost:2,pot:3,tags:["habit"],relBase:0.60}),
  mk("midday","Posture reset",{cost:1,pot:2,tags:["habit"],relBase:0.74}),

  mk("day","Strength 20 min",{cost:6,pot:9,tags:["train"],relBase:0.35}),
  mk("day","Zone2 20 min",{cost:5,pot:8,tags:["train"],relBase:0.40}),
  mk("day","Core 10 min",{cost:3,pot:5,tags:["train"],relBase:0.54}),
  mk("day","Ship something",{cost:6,pot:10,tags:["focus"],relBase:0.32}),
  mk("day","Project push 45 min",{cost:6,pot:9,tags:["focus"],relBase:0.35}),
  mk("day","No multitask",{cost:2,pot:5,tags:["focus","habit"],relBase:0.58}),
  mk("day","Clean space 10 min",{cost:2,pot:3,tags:["habit"],relBase:0.60}),
  mk("day","Nature 10 min",{cost:2,pot:4,tags:["sleep","habit"],relBase:0.58}),

  mk("evening","No screen 30 min",{cost:3,pot:8,tags:["sleep","habit"],relBase:0.44}),
  mk("evening","Plan tomorrow 3 min",{cost:2,pot:6,tags:["focus","habit"],relBase:0.56}),
  mk("evening","Body scan 5 min",{cost:2,pot:6,tags:["sleep","focus"],relBase:0.52}),
  mk("evening","Stretch evening",{cost:2,pot:4,tags:["train","sleep"],relBase:0.56}),
  mk("evening","Read fiction",{cost:2,pot:5,tags:["sleep","focus"],relBase:0.54}),
  mk("evening","Light walk",{cost:2,pot:3,tags:["train","sleep"],relBase:0.62}),

  mk("night","Sleep routine",{cost:3,pot:9,tags:["sleep","habit"],relBase:0.42}),
  mk("night","Early bedtime",{cost:4,pot:10,tags:["sleep"],relBase:0.34}),
  mk("night","NSDR 10 min",{cost:2,pot:7,tags:["sleep","focus"],relBase:0.50}),
  mk("night","No caffeine after 14:00",{cost:2,pot:6,tags:["sleep","food"],relBase:0.58}),
  mk("night","No sugar late",{cost:2,pot:5,tags:["sleep","food"],relBase:0.56}),
  mk("night","Dark room",{cost:1,pot:5,tags:["sleep"],relBase:0.62}),
];

function mk(block,name,meta){
  return {
    id:`${block}:${name}`,
    block,
    name,
    cost: clampInt(meta.cost,1,10),
    pot: clampInt(meta.pot,1,12),
    tags: Array.isArray(meta.tags)? meta.tags.slice(0) : [],
    relBase: typeof meta.relBase==="number" ? clamp(meta.relBase,0.05,0.95) : 0.5
  };
}
function card(id){ return LIB.find(c=>c.id===id) || null; }

let app = {
  version: VERSION,
  days: [],
  calendar: { year:null, month:null },
  ui: { selectedDay:null },
  lives: { weekKey:null, remaining:LIVES_WEEKLY_MAX, lastLifeGainDay:null }
};

function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.style.display="none", 1400);
}

function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(app)); } catch {} }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  const p = safeParse(raw);
  if(!p || typeof p!=="object") return;
  if(!Array.isArray(p.days)) p.days = [];
  if(!p.calendar) p.calendar = {};
  if(!p.ui) p.ui = {};
  if(!p.lives) p.lives = { weekKey:null, remaining:LIVES_WEEKLY_MAX, lastLifeGainDay:null };
  p.version = VERSION;
  app = p;
}

function ensureToday(){
  const d = isoToday();
  let day = app.days.find(x=>x.date===d);
  if(!day){
    day = {
      date:d,
      finalized:false,
      revealed:false,
      telemetry:{ energy:5, stress:5, mood:5, motivation:5, difficulty:5, sleep:"ok" },
      notes:"",
      hand:[],
      done:{},
      selectedCount:{},
      history:[],
      score:0,
      lines:null,
      summary:null,
      lifeDelta:0
    };
    app.days.push(day);
  }
  normalizeDay(day);
  app.today = day;
}

function normalizeDay(day){
  if(!day.telemetry) day.telemetry = { energy:5, stress:5, mood:5, motivation:5, difficulty:5, sleep:"ok" };
  if(typeof day.notes!=="string") day.notes="";
  if(!Array.isArray(day.hand)) day.hand=[];
  if(!day.done || typeof day.done!=="object") day.done={};
  if(!day.selectedCount || typeof day.selectedCount!=="object") day.selectedCount={};
  if(!Array.isArray(day.history)) day.history=[];
  if(typeof day.score!=="number") day.score=0;
  if(!("finalized" in day)) day.finalized=false;
  if(!("revealed" in day)) day.revealed=false;
  if(!("lifeDelta" in day)) day.lifeDelta=0;
}

function setCalendarDefault(){
  const now = new Date();
  if(typeof app.calendar.year!=="number") app.calendar.year = now.getFullYear();
  if(typeof app.calendar.month!=="number") app.calendar.month = now.getMonth();
}

function switchView(v){
  $all(".view").forEach(x=>x.classList.remove("active"));
  const el = $(`view-${v}`);
  if(el) el.classList.add("active");

  $all(".tab").forEach(t=>t.classList.remove("active"));
  const btn = document.querySelector(`.tab[data-view="${v}"]`);
  if(btn) btn.classList.add("active");

  save();
}

function bindNav(){
  $all(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=> switchView(btn.dataset.view));
  });
}

function ctxNow(){
  const t = app.today.telemetry;
  const doneCount = app.today.hand.filter(id=>!!app.today.done[id]).length;
  const doneRatio = app.today.hand.length ? doneCount/app.today.hand.length : 0;
  const readiness = computeReadiness(t, doneRatio);
  return { readiness, stress: t.stress ?? 5, energy: t.energy ?? 5 };
}

function computeReadiness(t, doneRatio){
  const base = (t.energy + (11 - t.stress) + t.mood + t.motivation) / 40;
  let sleepAdj = 0;
  if(t.sleep==="good") sleepAdj = 0.08;
  else if(t.sleep==="bad") sleepAdj = -0.12;
  const diffPenalty = (t.difficulty - 5)/25;
  const habitBonus = (doneRatio || 0) * 0.15;
  return Math.round(clamp(base + sleepAdj - diffPenalty + habitBonus, 0, 1) * 100);
}

function computeMomentum(readiness, doneCount, handCount){
  const ratio = handCount ? doneCount/handCount : 0;
  const quality = 0.7 + (readiness/100)*0.6;
  return Math.round(clamp((ratio*100)*quality, 0, 100));
}

function getLookback(refDate, n){
  const sorted = [...app.days].sort((a,b)=>a.date<b.date?-1:1);
  const idx = sorted.findIndex(x=>x.date===refDate);
  const slice = idx>=0 ? sorted.slice(Math.max(0, idx-n), idx) : sorted.slice(Math.max(0, sorted.length-n));
  return slice.filter(d=>d.finalized);
}

function band(val, edges){
  for(let i=0;i<edges.length;i++) if(val<=edges[i]) return i;
  return edges.length;
}

function overallProbDone(id){
  const look = getLookback(app.today.date, LOOKBACK_DAYS);
  let trials=0, success=0;
  for(const d of look){
    const sel = d.selectedCount?.[id] ? 1 : 0;
    if(!sel) continue;
    trials++;
    if(d.history?.some(x=>x.id===id && x.done)) success++;
  }
  const a=1,b=1;
  return (success+a)/(trials+a+b);
}

function bayesProbDone(id, ctx){
  const look = getLookback(app.today.date, LOOKBACK_DAYS);
  let trials=0, success=0;

  const rb = band(ctx.readiness,[35,50,65,80]);
  const sb = band(ctx.stress,[3,5,7,9]);
  const eb = band(ctx.energy,[3,5,7,9]);

  for(const d of look){
    const r = d.summary?.readiness ?? 50;
    const t = d.telemetry || {};
    const rb2 = band(r,[35,50,65,80]);
    const sb2 = band(t.stress ?? 5,[3,5,7,9]);
    const eb2 = band(t.energy ?? 5,[3,5,7,9]);
    if(rb2!==rb || sb2!==sb || eb2!==eb) continue;

    const sel = d.selectedCount?.[id] ? 1 : 0;
    if(!sel) continue;
    trials++;
    if(d.history?.some(x=>x.id===id && x.done)) success++;
  }

  const a=1,b=1;
  const pCtx = (success+a)/(trials+a+b);
  const pAll = overallProbDone(id);
  return 0.65*pCtx + 0.35*pAll;
}

function expectedDoneRatio(hand, ctx){
  if(!hand.length) return 0;
  let sum=0;
  for(const id of hand) sum += bayesProbDone(id, ctx);
  return sum/hand.length;
}

function monteCarloTomorrow(hand, ctx){
  if(!hand.length) return 0;
  const threshold = Math.max(1, Math.ceil(hand.length*0.6));
  let wins=0;
  for(let i=0;i<MC_RUNS;i++){
    let done=0;
    for(const id of hand){
      const p = bayesProbDone(id, ctx);
      if(Math.random() < p) done++;
    }
    if(done>=threshold) wins++;
  }
  return Math.round((wins/MC_RUNS)*100);
}

function recalcScore(){
  let s=0;
  for(const id of app.today.hand){
    const c = card(id);
    if(c && app.today.done[id]) s += c.pot;
  }
  app.today.score = s;
}

function addToHand(id){
  if(app.today.finalized) return;
  if(app.today.hand.includes(id)) return;
  if(app.today.hand.length >= MAX_HAND){ toast(`Max ${MAX_HAND}`); return; }
  app.today.hand.push(id);
  app.today.done[id] = false;
  recalcScore();
  renderAll();
}

function removeFromHand(id){
  if(app.today.finalized) return;
  app.today.hand = app.today.hand.filter(x=>x!==id);
  delete app.today.done[id];
  recalcScore();
  renderAll();
}

function toggleDone(id){
  if(app.today.finalized) return;
  if(!app.today.hand.includes(id)) return;
  app.today.done[id] = !app.today.done[id];
  recalcScore();
  renderAll();
}

function attachGestures(el, id, mode){
  let pressTimer=null;
  let longPressed=false;

  el.addEventListener("pointerdown", ()=>{
    longPressed=false;
    clearTimeout(pressTimer);
    pressTimer=setTimeout(()=>{
      longPressed=true;
      if(mode==="hand" || mode==="ai"){ removeFromHand(id); toast("Removed"); }
    }, LONG_PRESS_MS);
  }, {passive:true});

  const cancel=()=>{ clearTimeout(pressTimer); pressTimer=null; };
  el.addEventListener("pointerup", cancel, {passive:true});
  el.addEventListener("pointercancel", cancel, {passive:true});
  el.addEventListener("pointerleave", cancel, {passive:true});

  el.addEventListener("click", ()=>{
    if(longPressed) return;
    const now=Date.now();
    if(attachGestures._lastId===id && now-(attachGestures._lastAt||0) <= DOUBLE_TAP_MS){
      attachGestures._lastId=null;
      attachGestures._lastAt=0;
      if(mode==="lib" || mode==="ai"){ addToHand(id); toast("Added"); }
      else if(mode==="hand"){ toggleDone(id); }
      return;
    }
    attachGestures._lastId=id;
    attachGestures._lastAt=now;
  });
}

function tagsLabel(tags){
  const map={focus:"Focus",food:"Eating",habit:"Habits",train:"Workout",sleep:"Sleep"};
  return (tags||[]).map(t=>map[t]||t).join(" · ") || "General";
}

function goldCard(id){
  let comp=0, sel=0;
  for(const d of app.days){
    if(!d.finalized) continue;
    sel += (d.selectedCount?.[id] || 0);
    if(d.history?.some(x=>x.id===id && x.done)) comp++;
  }
  return comp>=7 || sel>=14;
}

function weekKeyFor(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}

function ensureLivesWeek(){
  const wk = weekKeyFor(app.today.date);
  if(app.lives.weekKey !== wk){
    app.lives.weekKey = wk;
    app.lives.remaining = LIVES_WEEKLY_MAX;
    app.lives.lastLifeGainDay = null;
  }
}

function livesDots(n){
  const on = "●".repeat(Math.max(0,n));
  const off = "○".repeat(Math.max(0, LIVES_WEEKLY_MAX - n));
  return `${on}${off}`;
}

function aiTrigger(){
  const t = app.today.telemetry;
  const ctx = ctxNow();
  const doneCount = app.today.hand.filter(id=>!!app.today.done[id]).length;

  if(ctx.readiness < 45 && (t.energy ?? 5) > 6) return "stress_override";
  if(ctx.readiness > 70 && app.today.hand.length && doneCount < 2) return "conversion_gap";
  if((t.sleep || "ok")==="bad" && (t.stress ?? 5) >= 7) return "sleep_stress";
  return null;
}

function aiInsight(trigger){
  if(trigger==="stress_override") return "Stress is cancelling your energy. Reduce cost, not effort.";
  if(trigger==="conversion_gap") return "High readiness, low execution. Decide earlier tomorrow.";
  if(trigger==="sleep_stress") return "Bad sleep + high stress: pick 3 low-cost cards and protect night.";
  return null;
}

function aiGhostCard(){
  const ctx = ctxNow();
  const handSet = new Set(app.today.hand);
  const scored = LIB
    .filter(c => !handSet.has(c.id))
    .map(c=>{
      const p = bayesProbDone(c.id, ctx);
      const utility = (c.pot * p) - (c.cost * 0.6);
      return { id:c.id, utility, p };
    })
    .sort((a,b)=>b.utility-a.utility);
  return scored[0]?.id || null;
}

function showInsightOnce(text){
  if(!text) return;
  const el = $("aiInsight");
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

function sleepBase(s){
  if(s==="good") return 78;
  if(s==="bad") return 42;
  return 60;
}

function computeLines(dayLike){
  const t = dayLike.telemetry || {};
  const baseSleep = sleepBase(t.sleep);
  const baseFocus = clampInt((t.energy*10) - (t.stress*4) + (t.mood*3), 0, 100);
  const pts = BLOCKS.map(()=>({ sleep:baseSleep, focus:baseFocus, food:50, habit:40, train:45 }));

  const hist = dayLike.history || [];
  for(const h of hist){
    if(!h.done) continue;
    const idx = BLOCKS.findIndex(b=>b.id===h.block);
    if(idx<0) continue;

    const impact = Math.round(h.pot * 2.4);
    const decay  = Math.round(impact * 0.55);

    for(let i=idx;i<pts.length;i++){
      const mult = i===idx ? 1 : (i===idx+1 ? 0.6 : 0.35);
      const bump = Math.round(impact*mult);
      if(h.tags.includes("focus")) pts[i].focus = clampInt(pts[i].focus + bump, 0, 100);
      if(h.tags.includes("food"))  pts[i].food  = clampInt(pts[i].food  + bump, 0, 100);
      if(h.tags.includes("habit")) pts[i].habit = clampInt(pts[i].habit + bump, 0, 100);
      if(h.tags.includes("train")) pts[i].train = clampInt(pts[i].train + bump, 0, 100);
      if(h.tags.includes("sleep")) pts[i].sleep = clampInt(pts[i].sleep + Math.round(decay*mult), 0, 100);
    }
  }

  for(const id of (dayLike.hand||[])){
    const c = card(id);
    if(!c) continue;
    if(c.tags.includes("focus") && c.pot>=7 && !dayLike.done?.[id]){
      for(let i=2;i<pts.length;i++) pts[i].focus = clampInt(pts[i].focus - Math.round(c.pot*2.0), 0, 100);
    }
    if(c.tags.includes("sleep") && c.pot>=7 && !dayLike.done?.[id]){
      pts[4].sleep = clampInt(pts[4].sleep - Math.round(c.pot*2.2), 0, 100);
    }
  }

  return pts;
}

function buildHoloLines(){
  const t0 = app.today.telemetry;
  const ctx0 = ctxNow();
  const hand = app.today.hand.length ? app.today.hand : bestHand(ctx0).map(x=>x.id);
  const exp = expectedDoneRatio(hand, ctx0);

  const ghost = { telemetry:t0, hand, done:{}, history:[] };
  for(const id of hand){
    const c = card(id);
    if(!c) continue;
    const p = bayesProbDone(id, ctx0);
    const done = p >= Math.max(0.45, exp*0.95);
    ghost.done[id]=done;
    ghost.history.push({ id, done, pot:c.pot, cost:c.cost, tags:c.tags, block:c.block });
  }
  return computeLines(ghost);
}

function fitCanvas(canvas){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w;
    canvas.height = h;
  }
  return { dpr, w, h };
}

function drawSpine(actual, holo){
  const canvas = $("spineCanvas");
  const ctx = canvas.getContext("2d");
  const { w, h } = fitCanvas(canvas);
  ctx.clearRect(0,0,w,h);

  const padT=18, padB=18;
  const ih = h - padT - padB;
  const yAt = i => padT + (i/(BLOCKS.length-1))*ih;

  const beamX = Math.round(w*0.52);
  ctx.strokeStyle = "rgba(94,231,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(beamX, padT);
  ctx.lineTo(beamX, h-padB);
  ctx.stroke();

  ctx.strokeStyle = "rgba(234,240,255,0.08)";
  ctx.lineWidth = 1;
  for(let i=0;i<BLOCKS.length;i++){
    const y = yAt(i);
    ctx.beginPath();
    ctx.moveTo(beamX-18,y);
    ctx.lineTo(beamX+18,y);
    ctx.stroke();
  }

  const trackOffset = { focus:-22, food:18, habit:-10, train:30, sleep:6 };
  const drift = v => (clamp(v,0,100)-50) * 0.16;

  for(const k of TRACKS) drawLine(actual, k, TRACK_COLOR[k], false);
  if(holo) for(const k of TRACKS) drawLine(holo, k, "rgba(94,231,255,0.32)", true);

  function drawLine(lines, key, color, dashed){
    if(!lines || lines.length<2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    if(dashed) ctx.setLineDash([8,8]);

    ctx.beginPath();
    for(let i=0;i<lines.length;i++){
      const x = beamX + trackOffset[key] + drift(lines[i][key]);
      const y = yAt(i);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = dashed ? "rgba(94,231,255,0.22)" : color;
    for(let i=0;i<lines.length;i++){
      const x = beamX + trackOffset[key] + drift(lines[i][key]);
      const y = yAt(i);
      ctx.beginPath();
      ctx.arc(x,y,2.8,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function bestHand(ctx){
  return LIB.map(c=>{
    const p = bayesProbDone(c.id, ctx);
    const rel = clamp(0.3 + 0.7*p, 0, 1);
    const util = (0.62*(c.pot/12) + 0.38*rel) - 0.45*(c.cost/10);
    return { id:c.id, util, p };
  }).sort((a,b)=>b.util-a.util).slice(0,5);
}

function autoHand(){
  const ctx = { readiness: computeReadiness(app.today.telemetry,0), stress: app.today.telemetry.stress, energy: app.today.telemetry.energy };
  const scored = bestHand(ctx);

  const pick=[];
  const used=new Set();
  for(const s of scored){
    const c = card(s.id);
    if(!c) continue;
    if(pick.length>=MAX_HAND) break;
    if(used.has(c.block) && pick.length<MIN_HAND) continue;
    pick.push(c.id);
    used.add(c.block);
  }
  while(pick.length<MIN_HAND && scored[pick.length]) pick.push(scored[pick.length].id);

  app.today.hand = [...new Set(pick)].slice(0,MAX_HAND);
  app.today.done = {};
  for(const id of app.today.hand) app.today.done[id]=false;
  recalcScore();
  renderAll();
}

function dayIndex(){
  const sorted = [...app.days].sort((a,b)=>a.date<b.date?-1:1);
  const idx = sorted.findIndex(d=>d.date===app.today.date);
  return idx>=0 ? idx+1 : app.days.length;
}

function renderLives(){
  ensureLivesWeek();
  $("hudLives").textContent = `LIVES ${livesDots(app.lives.remaining)}`;
  if($("insLives")){
    $("insLives").textContent = `Week ${app.lives.weekKey} · Remaining ${app.lives.remaining}/${LIVES_WEEKLY_MAX}\nRule: lives change only on finalize (volatility).`;
  }
}

function applyLivesOnFinalize(predPct, actualPct, costSum){
  ensureLivesWeek();
  let delta = 0;

  const divergence = Math.abs(actualPct - predPct);
  const loseByDivergence = divergence >= 25 ? 1 : 0;

  const leverageMiss = topLeverageMissed();
  const loseByLeverage = leverageMiss ? 1 : 0;

  const loss = clampInt(loseByDivergence + loseByLeverage, 0, LIFE_LOSS_MAX_PER_DAY);

  if(loss > 0){
    app.lives.remaining = Math.max(0, app.lives.remaining - loss);
    delta -= loss;
  }

  const gainEligible = divergence <= 10 && costSum <= (app.today.summary?.costSum ?? costSum);
  const canGain = gainEligible && app.lives.remaining < LIVES_WEEKLY_MAX && app.lives.lastLifeGainDay !== app.today.date;
  if(canGain){
    app.lives.remaining += 1;
    app.lives.lastLifeGainDay = app.today.date;
    delta += 1;
  }

  app.today.lifeDelta = delta;
  return { divergence, loss, gain: delta>0 ? 1 : 0, leverageMiss };
}

function topLeverageMissed(){
  if(!app.today.hand.length) return null;
  const ctx = ctxNow();
  const scored = app.today.hand.map(id=>{
    const c = card(id);
    const p = bayesProbDone(id, ctx);
    const util = (c.pot * p) - (c.cost * 0.6);
    return { id, util, pot:c.pot };
  }).sort((a,b)=>b.util-a.util);
  const top2 = scored.slice(0,2).map(x=>x.id);
  const missed = top2.find(id=>!app.today.done[id]);
  return missed || null;
}

function renderHome(){
  ensureLivesWeek();
  $("todayLabel").textContent = app.today.date;

  const dayNum = dayIndex();
  $("hudDay").textContent = `DAY ${dayNum}`;

  const ctx = ctxNow();
  const doneCount = app.today.hand.filter(id=>!!app.today.done[id]).length;
  const mom = computeMomentum(ctx.readiness, doneCount, app.today.hand.length);

  $("hudReadiness").textContent = `READINESS ${ctx.readiness}%`;
  $("hudHand").textContent = `HAND ${app.today.hand.length}/5`;
  $("hudPot").textContent = `POT +${app.today.score||0}`;
  renderLives();

  $("primaryActionBtn").textContent = app.today.finalized ? "Day Locked" : "Finalize Day";
  $("primaryActionBtn").disabled = !!app.today.finalized;

  $("handSub").textContent = app.today.finalized
    ? `Locked · Momentum ${mom} · Life Δ ${app.today.lifeDelta || 0}`
    : `Double tap cards = DONE · Long press = remove · Momentum ${mom}`;

  const stack = $("handStack");
  stack.innerHTML = "";

  $("emptyHint").style.display = app.today.hand.length ? "none" : "block";

  const trig = aiTrigger();
  $("spineWrap").classList.toggle("ai-pulse", !!trig && !app.today.finalized);

  const ghostId = (!app.today.finalized && app.today.hand.length < MAX_HAND) ? aiGhostCard() : null;

  if(ghostId){
    const c = card(ghostId);
    const p = bayesProbDone(ghostId, ctx);
    const rel = Math.round(p*100);
    const el = document.createElement("div");
    el.className = "spatialCard ai";
    el.innerHTML = `
      <div class="cardTop">
        <div class="spatialTitle aiTag">${esc(c.name)}</div>
        <div class="badges">
          <span class="badge pot">Pot +${c.pot}</span>
          <span class="badge cost">Cost ${c.cost}</span>
          <span class="badge rel">Rel ${rel}%</span>
        </div>
      </div>
      <div class="spatialMeta">
        <span>${esc(c.block.toUpperCase())} · ${esc(tagsLabel(c.tags))}</span>
        <span>Double tap to ADD</span>
      </div>
    `;
    attachGestures(el, ghostId, "ai");
    stack.appendChild(el);
  }

  let activeIndex = 0;
  const firstUndone = app.today.hand.findIndex(id=>!app.today.done[id]);
  if(firstUndone >= 0) activeIndex = firstUndone;

  for(let i=0;i<app.today.hand.length;i++){
    const id = app.today.hand[i];
    const c = card(id);
    if(!c) continue;

    const p = bayesProbDone(id, ctx);
    const rel = Math.round(p*100);
    const done = !!app.today.done[id];

    const el = document.createElement("div");
    el.className = "spatialCard";
    if(done) el.classList.add("done");
    if(goldCard(id)) el.classList.add("gold");
    if(i===activeIndex && !done) el.classList.add("active");

    el.innerHTML = `
      <div class="cardTop">
        <div class="spatialTitle">${esc(c.name)}</div>
        <div class="badges">
          <span class="badge pot">Pot +${c.pot}</span>
          <span class="badge cost">Cost ${c.cost}</span>
          <span class="badge rel">Rel ${rel}%</span>
        </div>
      </div>
      <div class="spatialMeta">
        <span>${esc(c.block.toUpperCase())} · ${esc(tagsLabel(c.tags))}</span>
        <span>${done ? "DONE" : "Double tap = DONE"}</span>
      </div>
    `;
    attachGestures(el, id, "hand");
    stack.appendChild(el);
  }

  const { leverage, remove } = computeTwoIdeas(ctx);
  $("aiLeverage").textContent = leverage;
  $("aiRemove").textContent = remove;

  const liveDay = {
    telemetry: app.today.telemetry,
    hand: app.today.hand,
    done: app.today.done,
    history: app.today.hand.map(id=>{
      const c = card(id);
      return { id, done:!!app.today.done[id], pot:c?.pot||0, cost:c?.cost||0, tags:c?.tags||[], block:c?.block||"" };
    })
  };
  const actualLines = computeLines(liveDay);
  const holoLines = buildHoloLines();
  drawSpine(actualLines, holoLines);

  if(trig && !app.today.finalized){
    const text = aiInsight(trig);
    if(text) showInsightOnce(text);
  }
}

function computeTwoIdeas(ctx){
  const done=[], missed=[];
  for(const id of app.today.hand){
    const c = card(id);
    if(!c) continue;
    (app.today.done[id] ? done : missed).push(c);
  }
  done.sort((a,b)=>b.pot-a.pot);
  missed.sort((a,b)=>b.cost-a.cost);

  const leverage = done.length
    ? `${done[0].name} (Pot +${done[0].pot})`
    : (app.today.hand.length ? "Finish one card first." : "Pick a hand, then execute.");
  const remove = missed.length
    ? `${missed[0].name} (Cost ${missed[0].cost})`
    : (app.today.hand.length ? "No obvious removals today." : "—");

  if(app.today.hand.length){
    const t = app.today.telemetry;
    const c2 = { readiness: ctx.readiness, stress: t.stress ?? 5, energy: t.energy ?? 5 };
    const tom = monteCarloTomorrow(app.today.hand, c2);
    return { leverage: `${leverage} · Tomorrow ${tom}%`, remove };
  }
  return { leverage, remove };
}

function renderTelemetry(){
  const t = app.today.telemetry;
  const fields=["energy","stress","mood","motivation","difficulty"];
  for(const f of fields){
    const input = document.querySelector(`input[data-field="${f}"]`);
    if(input) input.value = t[f] ?? 5;
    const label = $(`${f}Label`);
    if(label) label.textContent = `${t[f] ?? 5}/10`;
  }
  const sel = document.querySelector(`select[data-field="sleep"]`);
  if(sel) sel.value = t.sleep || "ok";
  $("sleepLabel").textContent = (t.sleep||"ok").toUpperCase();
  $("notes").value = app.today.notes || "";

  $("qtEnergy").value = t.energy ?? 5;
  $("qtStress").value = t.stress ?? 5;
  $("qtMood").value = t.mood ?? 5;
  syncQT();
}

function renderLibrary(){
  const q = ($("search").value || "").trim().toLowerCase();
  const out = $("library");
  out.innerHTML = "";

  for(const b of BLOCKS){
    const head = document.createElement("div");
    head.className = "blockHead";
    head.innerHTML = `<div class="blockTitle">${b.title}</div><div class="pill">Double tap to add</div>`;
    out.appendChild(head);

    const rail = document.createElement("div");
    rail.className = "rail";

    const ctx = ctxNow();
    const list = LIB
      .filter(c=>c.block===b.id)
      .filter(c=>{
        if(!q) return true;
        return c.name.toLowerCase().includes(q) || c.tags.join(" ").toLowerCase().includes(q);
      });

    for(const c of list){
      const p = bayesProbDone(c.id, ctx);
      const rel = Math.round(p*100);

      const el = document.createElement("div");
      el.className = "spatialCard";
      if(goldCard(c.id)) el.classList.add("gold");

      el.innerHTML = `
        <div class="cardTop">
          <div class="spatialTitle">${esc(c.name)}</div>
          <div class="badges">
            <span class="badge pot">Pot +${c.pot}</span>
            <span class="badge cost">Cost ${c.cost}</span>
            <span class="badge rel">Rel ${rel}%</span>
          </div>
        </div>
        <div class="spatialMeta">
          <span>${esc(tagsLabel(c.tags))}</span>
          <span>${app.today.hand.includes(c.id) ? "In hand" : "Double tap to ADD"}</span>
        </div>
      `;
      attachGestures(el, c.id, "lib");
      rail.appendChild(el);
    }

    out.appendChild(rail);
  }
}

function monthLabel(y,m){ return new Date(y,m,1).toLocaleString(undefined,{month:"long",year:"numeric"}); }

function renderCalendar(){
  const grid = $("calGrid");
  grid.innerHTML = "";

  const y=app.calendar.year, m=app.calendar.month;
  $("monthLabel").textContent = monthLabel(y,m);

  const first = new Date(y,m,1);
  const startDow = first.getDay();
  const dim = new Date(y,m+1,0).getDate();
  const today = isoToday();

  for(let i=0;i<startDow;i++){
    const blank = document.createElement("div");
    blank.className = "cell";
    blank.style.visibility = "hidden";
    grid.appendChild(blank);
  }

  for(let d=1; d<=dim; d++){
    const iso = new Date(y,m,d).toISOString().slice(0,10);
    const day = app.days.find(x=>x.date===iso);
    const finalized = !!day?.finalized;

    const doneCount = day?.summary?.doneCount ?? (day?.history?.filter(h=>h.done).length || 0);
    const handCount = day?.summary?.handCount ?? (day?.hand?.length || 0);
    const readiness = day?.summary?.readiness ?? null;
    const pct = handCount ? Math.round((doneCount/handCount)*100) : 0;

    const cell = document.createElement("div");
    cell.className = "cell";
    if(iso===today) cell.classList.add("today");
    if(finalized) cell.classList.add("final");

    cell.innerHTML = `
      <div class="d">${d}</div>
      <div class="m">${finalized ? `Done ${doneCount}/${handCount}` : (handCount ? `Hand ${handCount}` : "—")}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="m">${readiness!=null ? `R ${readiness}%` : ""}</div>
    `;
    cell.addEventListener("click", ()=> inspectDay(iso));
    grid.appendChild(cell);
  }
}

function inspectDay(iso){
  app.ui.selectedDay = iso;
  const day = app.days.find(x=>x.date===iso);

  $("inspectTitle").textContent = iso;
  if(!day){
    $("inspectMeta").textContent = "No data";
    $("inspectRail").innerHTML = "";
    $("inspectNotes").textContent = "—";
    save();
    return;
  }

  const meta = day.finalized
    ? `Final · Score ${day.score||0} · Readiness ${day.summary?.readiness ?? "—"}% · Life Δ ${day.lifeDelta||0}`
    : "Not finalized";
  $("inspectMeta").textContent = meta;
  $("inspectNotes").textContent = day.notes || "—";

  const rail = $("inspectRail");
  rail.innerHTML = "";

  const items = (day.history && day.history.length)
    ? day.history
    : (day.hand||[]).map(id=>({id,done:!!day.done?.[id]}));

  for(const it of items){
    const c = card(it.id);
    if(!c) continue;
    const el = document.createElement("div");
    el.className = "spatialCard";
    if(it.done) el.classList.add("done");
    el.innerHTML = `
      <div class="cardTop">
        <div class="spatialTitle">${esc(c.name)}</div>
        <div class="badges">
          <span class="badge pot">Pot +${c.pot}</span>
          <span class="badge cost">Cost ${c.cost}</span>
        </div>
      </div>
      <div class="spatialMeta">
        <span>${esc(c.block.toUpperCase())} · ${esc(tagsLabel(c.tags))}</span>
        <span>${it.done ? "DONE" : "MISSED"}</span>
      </div>
    `;
    rail.appendChild(el);
  }

  save();
}

function renderInsights(){
  const look = getLookback(app.today.date, LOOKBACK_DAYS);

  const stats = {};
  for(const d of look){
    for(const h of (d.history||[])){
      if(!stats[h.id]) stats[h.id] = { sel:0, done:0, pot:0, cost:0 };
      stats[h.id].sel++;
      if(h.done){
        stats[h.id].done++;
        stats[h.id].pot += h.pot||0;
        stats[h.id].cost += h.cost||0;
      }
    }
  }

  const ranked = Object.entries(stats).map(([id,s])=>{
    const doneRate = s.sel ? s.done/s.sel : 0;
    const eff = (s.cost>0) ? (s.pot/s.cost) : s.pot;
    const score = 0.55*eff + 0.45*doneRate;
    return { id, score, doneRate, eff };
  }).sort((a,b)=>b.score-a.score);

  const top = ranked.slice(0,3).map(r=>{
    const c=card(r.id); if(!c) return null;
    return `${c.name} (eff ${r.eff.toFixed(2)}, done ${Math.round(r.doneRate*100)}%)`;
  }).filter(Boolean);

  const low = ranked.slice(-3).reverse().map(r=>{
    const c=card(r.id); if(!c) return null;
    return `${c.name} (eff ${r.eff.toFixed(2)}, done ${Math.round(r.doneRate*100)}%)`;
  }).filter(Boolean);

  $("insWorked").textContent = `Worked: ${top.join(" · ") || "—"}\nDidn’t: ${low.join(" · ") || "—"}`;

  const medId = "morning:Meditation 5 min";
  let withM=[], withoutM=[];
  for(const d of look){
    const had = d.history?.some(x=>x.id===medId && x.done);
    const lines = d.lines;
    if(!lines || lines.length<5) continue;
    const avgFocus = Math.round(lines.reduce((a,p)=>a+p.focus,0)/lines.length);
    (had ? withM : withoutM).push(avgFocus);
  }
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  const aW=avg(withM), aN=avg(withoutM);
  if(aW!=null && aN!=null){
    const delta=aW-aN;
    $("insCounter").textContent = `Meditation effect (Focus avg): with ${aW} vs without ${aN} (Δ ${delta>=0?"+":""}${delta}).`;
  }else{
    $("insCounter").textContent = "Collect ~10 finalized days for counterfactuals.";
  }

  const ctx = ctxNow();
  const best = bestHand(ctx).slice(0,5).map(x=>{
    const c=card(x.id);
    const p=bayesProbDone(x.id, ctx);
    return `${c.name} (Rel ${Math.round(p*100)}%, Pot +${c.pot}, Cost ${c.cost})`;
  });
  $("insTomorrow").textContent = best.join(" · ") || "—";

  renderLives();
}

function finalizeDay(){
  if(app.today.finalized) return;

  ensureLivesWeek();

  const hand = [...app.today.hand];
  const hist = [];
  let costSum = 0;
  for(const id of hand){
    const c = card(id);
    if(!c) continue;
    costSum += c.cost;
    app.today.selectedCount[id] = (app.today.selectedCount[id] || 0) + 1;
    hist.push({ id, done:!!app.today.done[id], pot:c.pot, cost:c.cost, tags:c.tags, block:c.block });
  }
  app.today.history = hist;

  const doneCount = hand.filter(id=>!!app.today.done[id]).length;
  const donePct = hand.length ? Math.round((doneCount/hand.length)*100) : 0;

  const readiness = computeReadiness(app.today.telemetry, hand.length ? doneCount/hand.length : 0);
  const momentum = computeMomentum(readiness, doneCount, hand.length);

  app.today.lines = computeLines(app.today);
  app.today.summary = { readiness, momentum, doneCount, handCount: hand.length, score: app.today.score || 0, costSum };

  const ctx = { readiness, stress: app.today.telemetry.stress ?? 5, energy: app.today.telemetry.energy ?? 5 };
  const pred = hand.length ? monteCarloTomorrow(hand, ctx) : 0;

  const { divergence, loss, gain, leverageMiss } = applyLivesOnFinalize(pred, donePct, costSum);

  app.today.finalized = true;

  let insight = null;
  if(loss>0){
    if(leverageMiss){
      const c = card(leverageMiss);
      insight = c ? `Volatility spike: missed leverage card (${c.name}).` : "Volatility spike: missed a leverage card.";
    }else{
      insight = `Volatility spike: prediction diverged by ${divergence}%.`;
    }
  }else if(gain>0){
    insight = "Stable day: prediction matched reality. Life +1.";
  }else{
    const trig = aiTrigger();
    insight = trig ? aiInsight(trig) : null;
  }
  if(insight) showInsightOnce(insight);

  toast("Finalized");
  save();
  renderAll();
  renderCalendar();
}

function reveal(){
  if(app.today.finalized){ toast("Day locked"); return; }
  app.today.revealed = true;
  toast("Reveal: mark reality");
  switchView("home");
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(app,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "spatial_peak_data.json";
  a.click();
}

function shiftMonth(delta){
  const d = new Date(app.calendar.year, app.calendar.month + delta, 1);
  app.calendar.year = d.getFullYear();
  app.calendar.month = d.getMonth();
  renderCalendar();
  save();
}

function showQT(show){ $("qt").classList.toggle("hidden", !show); }

function syncQT(){
  $("qtEnergyV").textContent = `${$("qtEnergy").value}`;
  $("qtStressV").textContent = `${$("qtStress").value}`;
  $("qtMoodV").textContent = `${$("qtMood").value}`;
}

function bindQT(){
  const apply = ()=>{
    if(app.today.finalized) return;
    app.today.telemetry.energy = Number($("qtEnergy").value);
    app.today.telemetry.stress = Number($("qtStress").value);
    app.today.telemetry.mood = Number($("qtMood").value);
    syncQT();
    renderAll();
  };
  $("qtEnergy").addEventListener("input", apply);
  $("qtStress").addEventListener("input", apply);
  $("qtMood").addEventListener("input", apply);

  $("qtClose").addEventListener("click", ()=> showQT(false));
  $("qtBack").addEventListener("click", ()=> showQT(false));

  const sheet = $("qtSheet");
  let startY=null;
  sheet.addEventListener("touchstart",(e)=>{ startY=e.touches[0].clientY; },{passive:true});
  sheet.addEventListener("touchmove",(e)=>{
    if(startY==null) return;
    const dy=e.touches[0].clientY-startY;
    if(dy>90){ startY=null; showQT(false); }
  },{passive:true});
}

function bindTelemetry(){
  $all('input[type="range"][data-field]').forEach(input=>{
    input.addEventListener("input", ()=>{
      if(app.today.finalized) return;
      const f = input.dataset.field;
      app.today.telemetry[f] = Number(input.value);
      $(`${f}Label`).textContent = `${input.value}/10`;
      renderAll();
    });
  });

  const sel = document.querySelector('select[data-field="sleep"]');
  sel.addEventListener("change", ()=>{
    if(app.today.finalized) return;
    app.today.telemetry.sleep = sel.value;
    $("sleepLabel").textContent = sel.value.toUpperCase();
    renderAll();
  });

  $("notes").addEventListener("input", ()=>{
    if(app.today.finalized) return;
    app.today.notes = $("notes").value;
    save();
  });
}

function bindButtons(){
  $("finalizeBtn").addEventListener("click", finalizeDay);
  $("primaryActionBtn").addEventListener("click", finalizeDay);
  $("revealBtn").addEventListener("click", reveal);

  $("autoHandBtn").addEventListener("click", ()=>{ if(!app.today.finalized){ autoHand(); toast("Auto-hand"); } });
  $("clearHandBtn").addEventListener("click", ()=>{
    if(app.today.finalized) return;
    app.today.hand = [];
    app.today.done = {};
    app.today.score = 0;
    renderAll();
    toast("Cleared");
  });

  $("quickTelemetryBtn").addEventListener("click", ()=> showQT(true));
  $("goLibraryBtn").addEventListener("click", ()=> switchView("library"));

  $("prevMonthBtn").addEventListener("click", ()=> shiftMonth(-1));
  $("nextMonthBtn").addEventListener("click", ()=> shiftMonth(1));

  $("search").addEventListener("input", renderLibrary);
  $("exportBtn").addEventListener("click", exportJSON);

  if($("resetLivesBtn")){
    $("resetLivesBtn").addEventListener("click", ()=>{
      app.lives.weekKey = null;
      ensureLivesWeek();
      toast("Lives reset");
      renderAll();
    });
  }
}

function renderAll(){
  renderTelemetry();
  renderHome();
  renderLibrary();
  renderInsights();
  save();
}

function finalDiagnostic(){
  const ids = [
    "todayLabel","spineCanvas","handStack",
    "finalizeBtn","primaryActionBtn","revealBtn",
    "calGrid","library","exportBtn",
    "qt","qtEnergy","qtStress","qtMood","qtBack","qtSheet",
    "hudLives"
  ];
  const missing = ids.filter(id=>!$(id));
  toast(missing.length ? ("DIAGNOSTIC: missing " + missing[0]) : "READY");
}

function init(){
  load();
  ensureToday();
  setCalendarDefault();
  ensureLivesWeek();

  bindNav();
  bindButtons();
  bindTelemetry();
  bindQT();

  renderCalendar();
  renderAll();

  window.addEventListener("resize", ()=>{ if($("view-home").classList.contains("active")) renderHome(); }, {passive:true});
  finalDiagnostic();
}

window.addEventListener("load", init);
