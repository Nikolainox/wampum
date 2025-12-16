// app.js
const STORAGE_KEY = "life_deck_v4_timeblocks";
const VERSION = 4;

const GOLD_STREAK = 7;
const GOLD_TOTAL = 14;

const DOUBLE_TAP_MS = 260;
const LONG_PRESS_MS = 520;

const MC_RUNS = 500;
const LOOKBACK_DAYS = 30;
const PRED_DAYS = 7;

let app = { version: VERSION, days: [], today: null };

const TIMEBLOCKS = [
  { id:"morning", title:"Morning", habits:[
    ["Water + salt",2],["Sunlight 5–10 min",3],["No phone 30 min",5],["Breathing 3 min",2],["Walk 10 min",3],
    ["Plan top task",4],["Cold face / splash",2],["Protein breakfast",3],["Coffee after 60 min",2],["Gratitude x3",2],
    ["Journal 3 lines",3],["Mobility 5 min",3],["Make bed",1],["One hard choice",4],["Silence 2 min",2]
  ]},
  { id:"midday", title:"Midday", habits:[
    ["Single focus 20 min",5],["Single focus 45 min",7],["Walk 10 min",3],["Stretch 3 min",2],["Hydration",2],
    ["Whole meal",4],["No doomscroll",5],["Inbox 5 min",3],["Posture reset",2],["Micro-breaks",2],
    ["Deep work 30 min",7],["Skill practice 20 min",6],["Sunlight break",3],["Breathing reset",2],["Say no once",4]
  ]},
  { id:"day", title:"Day", habits:[
    ["Strength 20 min",8],["Zone2 20 min",7],["Core 10 min",5],["Project push 45 min",8],["Ship something",9],
    ["Build asset",8],["Network ping",4],["No complaining",4],["Delayed dopamine",6],["No multitask",5],
    ["Finish one task",6],["Hard thing 1 min start",5],["Keep promise",6],["Clean space 10 min",4],["Nature 10 min",4]
  ]},
  { id:"evening", title:"Evening", habits:[
    ["Slow evening",5],["No screen 30 min",7],["Light walk",3],["Stretch evening",4],["Hot shower",3],
    ["Tea ritual",2],["Plan tomorrow 3 min",4],["Journal 10 min",6],["Read fiction",4],["Calm music",3],
    ["Body scan 5 min",4],["Breathing box 3 min",3],["Gratitude person",3],["Warm light only",2],["Tidy 3 min",2]
  ]},
  { id:"night", title:"Night", habits:[
    ["Sleep routine",8],["Early bedtime",9],["No late screen",7],["Breathing before sleep",4],["NSDR 10 min",6],
    ["Body scan 15 min",7],["Noise off",3],["Dark room",3],["Cool room",3],["Tomorrow setup",4],
    ["Compassion",3],["Do nothing 10 min",4],["No caffeine after 14:00",5],["No sugar late",5],["Sleep 7h+",9]
  ]}
];

function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.style.display="none", 1400);
}

function todayISO(){ return new Date().toISOString().slice(0,10); }
function safeParse(raw){ try{return JSON.parse(raw);}catch{return null;} }

function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(app)); }catch{} }
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  const parsed = safeParse(raw);
  if(!parsed || typeof parsed !== "object") return;
  if(!Array.isArray(parsed.days)) parsed.days = [];
  parsed.version = VERSION;
  app = parsed;
}

function ensureToday(){
  const d = todayISO();
  let day = app.days.find(x=>x.date===d);
  if(!day){
    day = {
      date:d, finalized:false,
      telemetry:{ energy:5, stress:5, mood:5, motivation:5, difficulty:5, sleep:"ok" },
      notes:"",
      active:[],
      done:{},
      selectedCount:{},
      history:[],
      summary:null,
      score:0
    };
    app.days.push(day);
  }
  if(!Array.isArray(day.active)) day.active = [];
  if(!day.done || typeof day.done !== "object") day.done = {};
  if(!day.selectedCount || typeof day.selectedCount !== "object") day.selectedCount = {};
  if(!Array.isArray(day.history)) day.history = [];
  if(!day.telemetry) day.telemetry = { energy:5, stress:5, mood:5, motivation:5, difficulty:5, sleep:"ok" };
  if(!("notes" in day)) day.notes = "";
  if(!("score" in day)) day.score = 0;
  app.today = day;
}

function habitKey(blockId, name){ return `${blockId}:${name}`; }
function habitValueByKey(key){
  const [bid, name] = key.split(":");
  const block = TIMEBLOCKS.find(b=>b.id===bid);
  if(!block) return 1;
  const item = block.habits.find(h=>h[0]===name);
  return item ? item[1] : 1;
}

function band(val, edges){ for(let i=0;i<edges.length;i++) if(val<=edges[i]) return i; return edges.length; }

function computeReadiness(t, doneRatio){
  const base = (t.energy + (11 - t.stress) + t.mood + t.motivation) / 40;
  let sleepAdj = 0;
  if(t.sleep==="good") sleepAdj = 0.08;
  else if(t.sleep==="bad") sleepAdj = -0.12;
  const diffPenalty = (t.difficulty - 5)/25;
  const habitBonus = (doneRatio || 0) * 0.15;
  return Math.round(Math.max(0, Math.min(1, base + sleepAdj - diffPenalty + habitBonus)) * 100);
}

function computeMomentum(readiness, doneCount, activeCount){
  const ratio = activeCount ? doneCount/activeCount : 0;
  const quality = 0.7 + (readiness/100)*0.6;
  return Math.round(Math.max(0, Math.min(100, (ratio*100)*quality)));
}

function getLookbackDays(refDate, n){
  const sorted = [...app.days].sort((a,b)=>a.date<b.date?-1:1);
  const idx = sorted.findIndex(x=>x.date===refDate);
  const slice = idx>=0 ? sorted.slice(Math.max(0, idx-n), idx) : sorted.slice(Math.max(0, sorted.length-n));
  return slice.filter(d=>d.finalized);
}

function overallProbDone(habitKey){
  const look = getLookbackDays(app.today.date, LOOKBACK_DAYS);
  let trials=0, success=0;
  for(const d of look){
    const sel = d.selectedCount?.[habitKey] ? 1 : 0;
    if(!sel) continue;
    trials++;
    if(d.history?.some(x=>x.k===habitKey && x.done)) success++;
  }
  const alpha=1, beta=1;
  return (success+alpha)/(trials+alpha+beta);
}

function bayesProbDone(habitKey, ctx){
  const look = getLookbackDays(app.today.date, LOOKBACK_DAYS);
  let trials=0, success=0;

  const rb = band(ctx.readiness, [35,50,65,80]);
  const sb = band(ctx.stress, [3,5,7,9]);
  const eb = band(ctx.energy, [3,5,7,9]);

  for(const d of look){
    const r = d.summary?.readiness ?? 50;
    const t = d.telemetry || {};
    const rb2 = band(r, [35,50,65,80]);
    const sb2 = band(t.stress ?? 5, [3,5,7,9]);
    const eb2 = band(t.energy ?? 5, [3,5,7,9]);
    if(rb2!==rb || sb2!==sb || eb2!==eb) continue;

    const sel = d.selectedCount?.[habitKey] ? 1 : 0;
    if(!sel) continue;
    trials++;
    if(d.history?.some(x=>x.k===habitKey && x.done)) success++;
  }

  const alpha=1,beta=1;
  const pCtx = (success+alpha)/(trials+alpha+beta);
  const pAll = overallProbDone(habitKey);
  return 0.65*pCtx + 0.35*pAll;
}

function monteCarloTomorrow(keys, ctx){
  if(!keys.length) return 0;
  const threshold = Math.max(1, Math.ceil(keys.length*0.6));
  let wins=0;
  for(let i=0;i<MC_RUNS;i++){
    let done=0;
    for(const k of keys){
      const p = bayesProbDone(k, ctx);
      if(Math.random() < p) done++;
    }
    if(done>=threshold) wins++;
  }
  return Math.round((wins/MC_RUNS)*100);
}

function expectedDoneRatio(keys, ctx){
  if(!keys.length) return 0;
  let sum=0;
  for(const k of keys) sum += bayesProbDone(k, ctx);
  return sum/keys.length;
}

function computeGoldSet(){
  const totals = {};
  const streak = {};
  const gold = new Set();

  const sorted = [...app.days].filter(d=>d.finalized).sort((a,b)=>a.date<b.date?-1:1);
  for(const d of sorted){
    const selectedKeys = Object.keys(d.selectedCount||{}).filter(k=>d.selectedCount[k]>0);
    const selectedSet = new Set(selectedKeys);

    for(const k of selectedKeys) totals[k] = (totals[k]||0) + 1;

    for(const k of Object.keys(totals)){
      if(selectedSet.has(k)) streak[k] = (streak[k]||0) + 1;
      else streak[k] = 0;

      if(streak[k] >= GOLD_STREAK || (totals[k]||0) >= GOLD_TOTAL) gold.add(k);
    }
  }
  return { gold, totals, streak };
}

function setHub(readiness, momentum, tomorrowPct){
  const r = document.getElementById("hubReadiness");
  const m = document.getElementById("hubMomentum");
  const t = document.getElementById("hubTomorrow");
  if(r) r.textContent = `${readiness}%`;
  if(m) m.textContent = `${momentum}`;
  if(t) t.textContent = `${tomorrowPct}%`;
}

function setTodayLabels(){
  const d = app.today.date;
  const tl = document.getElementById("todayLabel");
  const tc = document.getElementById("todayCount");
  const ts = document.getElementById("todayScore");
  if(tl) tl.textContent = d;
  if(tc) tc.textContent = `${app.today.active.length} cards`;
  if(ts) ts.textContent = `Score ${app.today.score || 0}`;
}

function makeCard({title, desc, metaL, metaR, done, gold}){
  const el = document.createElement("div");
  el.className = "card";
  if(done) el.classList.add("done");
  if(gold) el.classList.add("gold");

  const t = document.createElement("div"); t.className="title"; t.textContent=title;
  const d = document.createElement("div"); d.className="desc"; d.textContent=desc||"";
  const m = document.createElement("div"); m.className="meta";
  const ml = document.createElement("span"); ml.textContent=metaL||"";
  const mr = document.createElement("span"); mr.textContent=metaR||"";
  m.appendChild(ml); m.appendChild(mr);

  el.appendChild(t); el.appendChild(d); el.appendChild(m);
  return el;
}

function attachTapHandlers(el, key, mode){
  let pressTimer=null;
  let longPressed=false;

  el.addEventListener("pointerdown", ()=>{
    longPressed=false;
    clearTimeout(pressTimer);
    pressTimer=setTimeout(()=>{
      longPressed=true;
      if(mode==="active"){
        removeFromToday(key);
        toast("Removed");
      }
    }, LONG_PRESS_MS);
  });

  const cancel=()=>{ clearTimeout(pressTimer); pressTimer=null; };
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("pointerleave", cancel);

  el.addEventListener("click", ()=>{
    if(longPressed) return;
    const now=Date.now();
    if(attachTapHandlers._lastKey===key && now-(attachTapHandlers._lastAt||0) <= DOUBLE_TAP_MS){
      attachTapHandlers._lastKey=null;
      attachTapHandlers._lastAt=0;
      if(mode==="library"){ addToToday(key); toast("Added"); }
      else if(mode==="active"){ toggleDone(key); }
      return;
    }
    attachTapHandlers._lastKey=key;
    attachTapHandlers._lastAt=now;
  });
}

function addToToday(key){
  if(app.today.finalized) return;
  if(!app.today.active.includes(key)){
    app.today.active.push(key);
    app.today.done[key]=false;
    save();
    renderAll();
  }
}

function removeFromToday(key){
  if(app.today.finalized) return;
  app.today.active = app.today.active.filter(k=>k!==key);
  delete app.today.done[key];
  save();
  renderAll();
}

function toggleDone(key){
  if(app.today.finalized) return;
  if(!app.today.active.includes(key)) return;
  const next = !app.today.done[key];
  app.today.done[key] = next;

  const v = habitValueByKey(key);
  app.today.score = (app.today.score || 0) + (next ? v : -v);

  save();
  renderAll();
}

function finalizeDay(){
  if(app.today.finalized) return;

  const active=[...app.today.active];
  const hist=[];
  for(const k of active){
    app.today.selectedCount[k] = (app.today.selectedCount[k]||0)+1;
    const done=!!app.today.done[k];
    hist.push({k,done, v: habitValueByKey(k)});
  }
  app.today.history=hist;

  const doneCount = active.filter(k=>!!app.today.done[k]).length;
  const doneRatio = active.length ? doneCount/active.length : 0;

  const t = app.today.telemetry || {};
  const readiness = computeReadiness(t, doneRatio);
  const momentum = computeMomentum(readiness, doneCount, active.length);

  app.today.summary = { readiness, momentum, doneCount, activeCount: active.length, score: app.today.score || 0 };
  app.today.finalized = true;

  app.today.active=[];
  app.today.done={};

  save();
  toast("Finalized");
  renderAll();
}

function exportJSON(){
  const blob=new Blob([JSON.stringify(app,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="life_deck_data.json"; a.click();
}

function renderHome(goldSet){
  const rail=document.getElementById("activeRail");
  if(!rail) return;
  rail.innerHTML="";

  const active=app.today.active;
  const empty=document.getElementById("homeEmpty");
  if(empty) empty.style.display = active.length ? "none" : "block";

  for(const key of active){
    const name=key.split(":")[1];
    const done=!!app.today.done[key];
    const g=goldSet.has(key);
    const val=habitValueByKey(key);

    const card=makeCard({
      title:name,
      desc: done ? "Done today" : "Double tap to mark done",
      metaL: g ? "Gold" : "Active",
      metaR: `+${val}`,
      done,
      gold:g
    });

    attachTapHandlers(card, key, "active");
    rail.appendChild(card);
  }
}

function renderLibrary(goldSet){
  const out=document.getElementById("librarySections");
  if(!out) return;
  out.innerHTML="";

  for(const block of TIMEBLOCKS){
    const head=document.createElement("div");
    head.className="sectionTitle";
    head.textContent=block.title;

    const wrap=document.createElement("div");
    wrap.className="railWrap";

    const rail=document.createElement("div");
    rail.className="rail";

    for(const [name,val] of block.habits){
      const key=habitKey(block.id, name);
      const isGold=goldSet.has(key);

      const card=makeCard({
        title:name,
        desc:"Double tap to add to Today",
        metaL: isGold ? "Gold" : block.title,
        metaR: `+${val}`,
        gold:isGold
      });

      attachTapHandlers(card, key, "library");
      rail.appendChild(card);
    }

    wrap.appendChild(rail);
    out.appendChild(head);
    out.appendChild(wrap);
  }
}

function renderGold(goldSet, totals, streak){
  const rail=document.getElementById("goldRail");
  if(!rail) return;
  rail.innerHTML="";

  const goldKeys=[...goldSet].sort((a,b)=>a<b?-1:1);
  const gc=document.getElementById("goldCount");
  if(gc) gc.textContent = `${goldKeys.length}`;

  const empty=document.getElementById("goldEmpty");
  if(empty) empty.style.display = goldKeys.length ? "none" : "block";

  for(const key of goldKeys){
    const name=key.split(":")[1];
    const total=totals[key]||0;
    const st=streak[key]||0;
    const val=habitValueByKey(key);

    const card=makeCard({
      title:name,
      desc:"Identity locked",
      metaL:`Total ${total} • +${val}`,
      metaR:`Streak ${st}`,
      gold:true
    });

    rail.appendChild(card);
  }
}

function renderTelemetry(){
  const t=app.today.telemetry;

  const fields=["energy","stress","mood","motivation","difficulty"];
  for(const f of fields){
    const input=document.querySelector(`input[data-field="${f}"]`);
    if(input) input.value = t[f] ?? 5;
    const label=document.getElementById(`${f}Label`);
    if(label) label.textContent = `${t[f] ?? 5}/10`;
  }

  const sel=document.querySelector(`select[data-field="sleep"]`);
  if(sel) sel.value = t.sleep || "ok";
  const sleepLabel=document.getElementById("sleepLabel");
  if(sleepLabel) sleepLabel.textContent = (t.sleep || "ok").toUpperCase();

  const notes=document.getElementById("notes");
  if(notes) notes.value = app.today.notes || "";

  const qe=document.getElementById("qtEnergy");
  const qs=document.getElementById("qtStress");
  const qm=document.getElementById("qtMood");
  if(qe) qe.value = t.energy ?? 5;
  if(qs) qs.value = t.stress ?? 5;
  if(qm) qm.value = t.mood ?? 5;
  syncQuickTelemetryLabels();
}

function syncQuickTelemetryLabels(){
  const qe=document.getElementById("qtEnergy");
  const qs=document.getElementById("qtStress");
  const qm=document.getElementById("qtMood");
  const qev=document.getElementById("qtEnergyV");
  const qsv=document.getElementById("qtStressV");
  const qmv=document.getElementById("qtMoodV");
  if(qe && qev) qev.textContent = `${qe.value}`;
  if(qs && qsv) qsv.textContent = `${qs.value}`;
  if(qm && qmv) qmv.textContent = `${qm.value}`;
}

function calcCtxFromNow(readiness){
  const t=app.today.telemetry || {};
  return { readiness, stress: t.stress ?? 5, energy: t.energy ?? 5 };
}

function drawHubChart(actual, predicted){
  const canvas = document.getElementById("hubChart");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0,0,w,h);

  const padL=24, padR=18, padT=12, padB=22;
  const iw = w - padL - padR;
  const ih = h - padT - padB;

  const minY = 0;
  const maxY = 100;

  const nA = actual.length;
  const nP = predicted.length;
  const totalPoints = (nA>0 ? nA : 1) + (nP>0 ? nP : 0);

  const xAt = (i)=> padL + (totalPoints<=1?0:(i/(totalPoints-1))*iw);
  const yAt = (v)=> padT + (1 - (Math.max(minY,Math.min(maxY,v))/maxY))*ih;

  ctx.strokeStyle = "rgba(17,24,39,0.10)";
  ctx.lineWidth = 1;
  for(let g=0; g<=4; g++){
    const y = padT + (g/4)*ih;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+iw,y); ctx.stroke();
  }

  if(nA>0){
    ctx.strokeStyle = "rgba(17,24,39,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i=0;i<nA;i++){
      const x = xAt(i);
      const y = yAt(actual[i]);
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(17,24,39,0.95)";
    for(let i=0;i<nA;i++){
      const x = xAt(i);
      const y = yAt(actual[i]);
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    }
  }

  if(nP>0){
    const startIdx = Math.max(0, nA-1);
    const baseIdx = startIdx;
    const offset = baseIdx;

    ctx.save();
    ctx.setLineDash([10,8]);
    ctx.lineWidth = 4;
    const grad = ctx.createLinearGradient(padL,0,padL+iw,0);
    grad.addColorStop(0,"rgba(59,130,246,0.25)");
    grad.addColorStop(0.5,"rgba(59,130,246,0.95)");
    grad.addColorStop(1,"rgba(34,197,94,0.30)");
    ctx.strokeStyle = grad;

    ctx.beginPath();
    for(let j=0;j<nP;j++){
      const idx = offset + 1 + j;
      const x = xAt(idx);
      const y = yAt(predicted[j]);
      if(j===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function buildPredictionSeries(goldSet, readinessNow){
  const active = app.today.active;
  const keys = active.length ? active : [...goldSet].slice(0, 6);

  if(!keys.length){
    return Array(PRED_DAYS).fill(readinessNow);
  }

  const t0 = app.today.telemetry || {};
  const series = [];
  let last = readinessNow;

  for(let d=0; d<PRED_DAYS; d++){
    const drift = (d===0?0: (Math.random()*2 - 1));
    const t = {
      ...t0,
      energy: Math.max(1, Math.min(10, (t0.energy ?? 5) + drift*0.2)),
      stress: Math.max(1, Math.min(10, (t0.stress ?? 5) - drift*0.15)),
      mood: Math.max(1, Math.min(10, (t0.mood ?? 5) + drift*0.1)),
      motivation: Math.max(1, Math.min(10, (t0.motivation ?? 5) + drift*0.1)),
      difficulty: t0.difficulty ?? 5,
      sleep: t0.sleep ?? "ok"
    };

    const ctx = { readiness: last, stress: t.stress, energy: t.energy };
    const expRatio = expectedDoneRatio(keys, ctx);

    const pred = computeReadiness(t, expRatio);
    last = Math.round(0.65*last + 0.35*pred);
    series.push(last);
  }

  return series;
}

function updateScoreboardAndChart(goldSet){
  const active=app.today.active;
  const doneCount=active.filter(k=>!!app.today.done[k]).length;
  const doneRatio=active.length ? doneCount/active.length : 0;

  const t=app.today.telemetry;
  const readiness=computeReadiness(t, doneRatio);
  const momentum=computeMomentum(readiness, doneCount, active.length);

  const ctx=calcCtxFromNow(readiness);
  const keysForTomorrow = active.length ? active : [...goldSet].slice(0,6);
  const tomorrowPct = monteCarloTomorrow(keysForTomorrow, ctx);

  setHub(readiness, momentum, tomorrowPct);

  const look = getLookbackDays(app.today.date, 60);
  const actual = look.map(d => d.summary?.readiness ?? 50);
  actual.push(readiness);

  const predicted = buildPredictionSeries(goldSet, readiness);
  const actualSlice = actual.slice(Math.max(0, actual.length-14));
  drawHubChart(actualSlice, predicted);
}

function renderAll(){
  const {gold, totals, streak} = computeGoldSet();
  setTodayLabels();
  renderHome(gold);
  renderLibrary(gold);
  renderGold(gold, totals, streak);
  renderTelemetry();
  updateScoreboardAndChart(gold);
  save();
}

function switchView(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".btab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));

  const btn=document.querySelector(`.tab[data-view="${id}"]`);
  if(btn) btn.classList.add("active");
  const bbtn=document.querySelector(`.btab[data-view="${id}"]`);
  if(bbtn) bbtn.classList.add("active");

  const view=document.getElementById(`view-${id}`);
  if(view) view.classList.add("active");
}

function bindNav(){
  document.querySelectorAll(".tab, .btab").forEach(btn=>{
    btn.addEventListener("click", ()=>switchView(btn.dataset.view));
  });
}

function bindTelemetry(){
  document.querySelectorAll('input[type="range"][data-field]').forEach(input=>{
    input.addEventListener("input", ()=>{
      if(app.today.finalized) return;
      const f=input.dataset.field;
      app.today.telemetry[f]=Number(input.value);
      const label=document.getElementById(`${f}Label`);
      if(label) label.textContent=`${input.value}/10`;
      renderAll();
    });
  });

  const sel=document.querySelector('select[data-field="sleep"]');
  if(sel){
    sel.addEventListener("change", ()=>{
      if(app.today.finalized) return;
      app.today.telemetry.sleep=sel.value;
      const sleepLabel=document.getElementById("sleepLabel");
      if(sleepLabel) sleepLabel.textContent=sel.value.toUpperCase();
      renderAll();
    });
  }

  const notes=document.getElementById("notes");
  if(notes){
    notes.addEventListener("input", ()=>{
      if(app.today.finalized) return;
      app.today.notes=notes.value;
      save();
    });
  }
}

function showQuickTelemetry(show){
  const qt=document.getElementById("quickTelemetry");
  if(!qt) return;
  qt.classList.toggle("hidden", !show);
}

function bindQuickTelemetry(){
  const qe=document.getElementById("qtEnergy");
  const qs=document.getElementById("qtStress");
  const qm=document.getElementById("qtMood");

  const apply = () => {
    if(app.today.finalized) return;
    if(qe) app.today.telemetry.energy = Number(qe.value);
    if(qs) app.today.telemetry.stress = Number(qs.value);
    if(qm) app.today.telemetry.mood = Number(qm.value);
    syncQuickTelemetryLabels();
    renderAll();
  };

  if(qe) qe.addEventListener("input", apply);
  if(qs) qs.addEventListener("input", apply);
  if(qm) qm.addEventListener("input", apply);

  const close=document.getElementById("qtClose");
  const back=document.getElementById("qtBackdrop");
  if(close) close.addEventListener("click", ()=>showQuickTelemetry(false));
  if(back) back.addEventListener("click", ()=>showQuickTelemetry(false));

  const sheet=document.getElementById("qtSheet");
  if(sheet){
    let startY=null;
    sheet.addEventListener("touchstart",(e)=>{ startY=e.touches[0].clientY; }, {passive:true});
    sheet.addEventListener("touchmove",(e)=>{
      if(startY==null) return;
      const dy=e.touches[0].clientY-startY;
      if(dy>90){ startY=null; showQuickTelemetry(false); }
    }, {passive:true});
  }
}

function bindScoreboardDoubleTap(){
  const hub=document.getElementById("hubCard");
  if(!hub) return;
  let lastAt=0;

  const handle = () => {
    const now=Date.now();
    if(now-lastAt <= DOUBLE_TAP_MS){
      lastAt=0;
      showQuickTelemetry(true);
      toast("Quick Telemetry");
      return;
    }
    lastAt=now;
  };

  hub.addEventListener("click", handle);
  hub.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); handle(); }});
}

function bindButtons(){
  const fin=document.getElementById("finalizeBtn");
  const fab=document.getElementById("fabFinalize");
  if(fin) fin.addEventListener("click", finalizeDay);
  if(fab) fab.addEventListener("click", finalizeDay);

  const exp=document.getElementById("exportBtn");
  if(exp) exp.addEventListener("click", exportJSON);
}

function finalDiagnostic(){
  const ids = [
    "activeRail","librarySections","goldRail","finalizeBtn",
    "hubReadiness","hubMomentum","hubTomorrow","hubCard","hubChart",
    "quickTelemetry","qtEnergy","qtStress","qtMood","qtBackdrop","qtSheet"
  ];
  const missing = [];
  for(const id of ids) if(!document.getElementById(id)) missing.push(id);
  if(!app.today || !app.today.date) missing.push("today");
  if(!Array.isArray(app.days)) missing.push("days");

  if(missing.length) toast("DIAGNOSTIC: missing " + missing[0]);
  else toast("READY");
}

function init(){
  load();
  ensureToday();
  bindNav();
  bindTelemetry();
  bindQuickTelemetry();
  bindScoreboardDoubleTap();
  bindButtons();
  renderAll();
  finalDiagnostic();
}

window.addEventListener("load", init);
