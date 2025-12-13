const STORAGE_KEY = "fi_varikko_v3_complete";

let days = [];
let today = null;
let lastTap = 0;

function iso() { return new Date().toISOString().slice(0, 10); }
function fiDate(x) { const [y,m,d] = x.split("-"); return `${d}.${m}.${y}`; }
function clamp(v, a=0, b=1) { return Math.min(b, Math.max(a, v)); }

const GROUPS = [
  {
    id:"mind", title:"Mind & Focus", w:1.3,
    habits:[
      {id:"mind_breath_3",t:"Breathing 3 min",d:"Short reset"},
      {id:"mind_focus_1",t:"Focus 20 min",d:"Deep work"},
      {id:"mind_medit_5",t:"Meditation 5 min",d:"Calm reset"},
      {id:"mind_journal",t:"Journaling",d:"Clarity"},
      {id:"mind_read_5",t:"Read 5 min",d:"Input"},
      {id:"mind_visual",t:"Visualisation",d:"Future self"},
    ]
  },
  {
    id:"body", title:"Body & Energy", w:1.3,
    habits:[
      {id:"body_walk",t:"Walk 10 min",d:"Movement"},
      {id:"body_mobility",t:"Mobility",d:"Loosen up"},
      {id:"body_strength",t:"Strength",d:"Training"},
      {id:"body_cold",t:"Cold shower",d:"Reset"},
      {id:"body_water",t:"Hydration",d:"Fuel"},
      {id:"body_sleep",t:"Sleep 7h+",d:"Recovery"},
    ]
  },
  {
    id:"discipline", title:"Discipline", w:1.3,
    habits:[
      {id:"disc_no_phone",t:"No morning phone",d:"Clean start"},
      {id:"disc_keep_promise",t:"Kept promise",d:"Identity"},
      {id:"disc_do_hard",t:"Did hard thing",d:"Grit"},
      {id:"disc_single_task",t:"Single-task",d:"Control"},
      {id:"disc_no_excuse",t:"No excuses",d:"Ownership"},
    ]
  }
];

const BAD = [
  {id:"bad_doom",t:"Doomscroll",p:3},
  {id:"bad_sugar",t:"Sugar hit",p:2},
  {id:"bad_sleep",t:"Late sleep",p:3},
  {id:"bad_multitask",t:"Multitask",p:2},
  {id:"bad_drama",t:"Drama",p:3},
];

function createDay(date){
  const habits={}; GROUPS.forEach(g=>g.habits.forEach(h=>{
    habits[h.id]={done:false,total:0,mastered:false,masteredAt:null,deltaSum:0,deltaCount:0,hardCount:0};
  }));
  const bad={}; BAD.forEach(b=>bad[b.id]={done:false});
  return {
    id:"day_"+date,
    date,
    difficulty:5, energy:5, stress:5, mood:5, motivation:5,
    sleep:"ok",
    readiness:50,
    momentum:0,
    habits, bad,
    notes:"",
    finalized:false
  };
}

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(days)); }
function load(){
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch{ return []; }
}

function ensureToday(){
  const d=iso();
  let day=days.find(x=>x.date===d);
  if(!day){
    day=createDay(d);
    days.push(day);
  }
  today=day;
  save();
}

function streakOfficial(id, ref){
  let s=0; let dt=new Date(ref);
  function f(d){return d.toISOString().slice(0,10);}
  while(true){
    const day=days.find(x=>x.date===f(dt));
    if(!day||!day.finalized||!day.habits[id]?.done) break;
    s++; dt.setDate(dt.getDate()-1);
  }
  return s;
}

function streakPreview(id){
  const base=streakOfficial(id,today.date);
  if(today.finalized) return base;
  return today.habits[id].done?base+1:base;
}

function habitSummary(day){
  let done=0,total=0;
  GROUPS.forEach(g=>g.habits.forEach(h=>{
    total++; if(day.habits[h.id].done) done++;
  }));
  return {done,total};
}

function badPenalty(day){
  let p=0,c=0;
  BAD.forEach(b=>{
    if(day.bad[b.id].done){ p+=b.p; c++; }
  });
  return {count:c, penalty:p};
}

function baseReadiness(day){
  const base=(day.energy+(11-day.stress)+day.mood+day.motivation)/40;
  let sleep=0;
  if(day.sleep==="good") sleep=0.08;
  else if(day.sleep==="bad") sleep=-0.12;
  const diff=(day.difficulty-5)/25;
  return Math.round(clamp(base+sleep-diff)*100);
}

function habitScore(day){
  const s=habitSummary(day);
  return s.total?s.done/s.total:0;
}

function calcReadiness(day){
  const b=baseReadiness(day);
  const h=habitScore(day);
  const bonus=h*15;
  const r=clamp((b+bonus)/100)*100;
  day.readiness=Math.round(r);
  const hard =
    day.difficulty>=7 ||
    (day.energy<=4 && day.stress>=7) ||
    (day.sleep==="bad" && day.stress>=6);
  day.hard=hard;
  return {b,h};
}

function freq30(id,ref){
  const sorted=[...days].sort((a,b)=>a.date<b.date?-1:1);
  const i=sorted.findIndex(x=>x.date===ref);
  const arr=sorted.slice(Math.max(0,i-30),i);
  if(!arr.length) return 0;
  let c=0;
  arr.forEach(d=>{ if(d.finalized&&d.habits[id]?.done) c++; });
  return c/arr.length;
}

function calcMomentum(day,b,h){
  const delta=day.readiness-b;
  const q=1+Math.max(-20,Math.min(20,delta))/50;
  let good=0;
  GROUPS.forEach(g=>{
    g.habits.forEach(hb=>{
      const st=day.habits[hb.id];
      if(!st.done)return;
      const s=streakOfficial(hb.id,day.date);
      const stp=day.finalized?s:(st.done?s+1:s);
      const sf=Math.min(stp/7,1.5);
      const f=freq30(hb.id,day.date);
      const c=clamp(0.5*(sf/1.5)+0.5*f);
      good+=c*q*(g.w||1.2);
    });
  });
  const bad=badPenalty(day);
  const pen=bad.penalty*2.5;
  let raw=good*25-pen*5;
  raw=Math.max(0,Math.min(100,Math.round(raw)));
  day.momentum=raw;
  return raw;
}

function MC(id,ref){
  const sorted=[...days].sort((a,b)=>a.date<b.date?-1:1);
  const i=sorted.findIndex(x=>x.date===ref);
  const arr=sorted.slice(Math.max(0,i-30),i);
  if(!arr.length) return 0;
  let t=0,s=0;
  arr.forEach(d=>{
    if(d.finalized){t++; if(d.habits[id]?.done)s++;}
  });
  const base=t?(s/t):0;
  const st=streakOfficial(id,ref);
  const sb=Math.min(st/10,0.3);
  return Math.round(clamp(base*0.7+sb)*100);
}

function agg(id){
  let tt=0, hd=0, mas=false, mat=null,ds=0,dc=0;
  days.forEach(d=>{
    const st=d.habits[id]; if(!st)return;
    tt+=st.total;
    hd+=st.hardCount;
    if(st.mastered){ mas=true; if(!mat||st.masteredAt<mat)mat=st.masteredAt; }
    ds+=st.deltaSum; dc+=st.deltaCount;
  });
  return {
    total:tt,
    hard:hd,
    mastered:mas,
    when:mat,
    delta:dc?Math.round((ds/dc)*10)/10:0
  };
}

function tile(h,st,g){
  const t=document.createElement("div");
  t.className="habit-tile";
  if(st.done)t.classList.add("done");
  const s=streakPreview(h.id);
  if(s>=7)t.classList.add("streak7");

  const head=document.createElement("div");
  head.className="habit-tile-header";
  const ti=document.createElement("div"); ti.className="habit-tile-title"; ti.textContent=h.t;
  const stx=document.createElement("div"); stx.className="habit-tile-status"; stx.textContent=st.mastered?"MASTERED":"";
  head.appendChild(ti); head.appendChild(stx);

  const body=document.createElement("div");
  body.className="habit-tile-body";
  body.textContent=h.d;

  const foot=document.createElement("div");
  foot.className="habit-tile-footer";
  const f1=document.createElement("div"); f1.textContent="Streak: "+s;
  const f2=document.createElement("div"); f2.textContent="MC: "+MC(h.id,today.date)+"%";
  foot.appendChild(f1); foot.appendChild(f2);

  t.appendChild(head); t.appendChild(body); t.appendChild(foot);

  t.addEventListener("click",()=>{
    const n=Date.now();
    if(n-lastTap<200 && !today.finalized){
      st.done=!st.done;
      if(st.done)st.total++;
      save(); renderLibrary(); updateHub(); pit("Updated.");
    }
    lastTap=n;
  });
  return t;
}

function renderMaster(){
  const box=document.createElement("div");
  box.className="habit-row";
  const title=document.createElement("div");
  title.className="habit-row-title";
  title.textContent="Mastered";
  box.appendChild(title);

  const strip=document.createElement("div");
  strip.className="habit-row-strip";

  GROUPS.forEach(g=>{
    g.habits.forEach(h=>{
      const a=agg(h.id);
      if(!a.mastered)return;
      const t=document.createElement("div"); t.className="habit-tile streak7";
      const head=document.createElement("div"); head.className="habit-tile-header";
      const ti=document.createElement("div"); ti.className="habit-tile-title"; ti.textContent=h.t;
      const st=document.createElement("div"); st.className="habit-tile-status"; st.textContent="MASTERED";
      head.appendChild(ti); head.appendChild(st);
      const body=document.createElement("div"); body.className="habit-tile-body";
      body.innerHTML=`Total: ${a.total}<br>Hard: ${a.hard}<br>Δ: ${a.delta}`;
      const foot=document.createElement("div"); foot.className="habit-tile-footer";
      foot.textContent=a.when?("Unlocked "+a.when):"";
      t.appendChild(head); t.appendChild(body); t.appendChild(foot);
      strip.appendChild(t);
    });
  });
  box.appendChild(strip);
  return box;
}

function renderBad(){
  const box=document.createElement("div");
  box.className="habit-row";
  const title=document.createElement("div"); title.className="habit-row-title"; title.textContent="Bad Habits";
  box.appendChild(title);

  const strip=document.createElement("div"); strip.className="habit-row-strip";

  BAD.forEach(b=>{
    const st=today.bad[b.id];
    const t=document.createElement("div"); t.className="habit-tile";
    if(st.done)t.classList.add("done");

    t.innerHTML=
      `<div class='habit-tile-header'><div class='habit-tile-title'>${b.t}</div><div class='habit-tile-status'>-${b.p}</div></div>
       <div class='habit-tile-body'>Penalty ${b.p}</div>
       <div class='habit-tile-footer'></div>`;

    t.addEventListener("click",()=>{
      const n=Date.now();
      if(n-lastTap<200 && !today.finalized){
        st.done=!st.done;
        save(); renderLibrary(); updateHub(); pit("Updated.");
      }
      lastTap=n;
    });
    strip.appendChild(t);
  });

  box.appendChild(strip);
  return box;
}

function renderLibrary(){
  if(!today)return;
  const {b,h}=calcReadiness(today);
  calcMomentum(today,b,h);

  document.getElementById("libraryDate").textContent="Day: "+fiDate(today.date);
  const sum=habitSummary(today);
  document.getElementById("libraryHabitSummary").textContent=`${sum.done}/${sum.total}`;
  document.getElementById("libraryReadiness").textContent=`Ready ${today.readiness}%`;

  const out=document.getElementById("habitSections");
  out.innerHTML="";
  out.appendChild(renderMaster());

  GROUPS.forEach(g=>{
    const row=document.createElement("div"); row.className="habit-row";
    const title=document.createElement("div"); title.className="habit-row-title"; title.textContent=g.title;
    const strip=document.createElement("div"); strip.className="habit-row-strip";
    g.habits.forEach(h=>{
      strip.appendChild(tile(h, today.habits[h.id], g));
    });
    row.appendChild(title); row.appendChild(strip);
    out.appendChild(row);
  });

  out.appendChild(renderBad());
  updateHub();
  renderTelemetry();
}

function masteredCount(){
  let c=0;
  GROUPS.forEach(g=>g.habits.forEach(h=>{ if(agg(h.id).mastered)c++; }));
  return c;
}

function updateHub(){
  const s=habitSummary(today);
  const mas=masteredCount();
  let life=0;
  GROUPS.forEach(g=>g.habits.forEach(h=>{ life+=agg(h.id).total; }));
  document.getElementById("hubHeadline").textContent=`Readiness ${today.readiness}% · Momentum ${today.momentum}`;
  document.getElementById("hubMasteredCount").textContent=mas;
  document.getElementById("hubTodayHabits").textContent=`${s.done}/${s.total}`;
  document.getElementById("hubLifetime").textContent=life;
}

function pit(msg){
  const el=document.getElementById("pitMessage");
  el.textContent=msg;
}

function renderTelemetry(){
  const {b,h}=calcReadiness(today);
  calcMomentum(today,b,h);

  document.getElementById("todayDateLabel").textContent=fiDate(today.date)+(today.finalized?" · LOCKED":"");
  document.getElementById("habitSummaryTag").textContent=`Habits: ${habitSummary(today).done}`;

  const fields=["energy","stress","mood","motivation","difficulty"];
  fields.forEach(f=>{
    document.querySelector(`input[data-field="${f}"]`).value=today[f];
    document.getElementById(f+"Label").textContent=`${today[f]}/10`;
  });

  document.querySelector(`select[data-field="sleep"]`).value=today.sleep;
  document.getElementById("notes").value=today.notes||"";
}

function bindTelemetry(){
  document.querySelectorAll("input[type=range]").forEach(r=>{
    r.addEventListener("input",()=>{
      if(today.finalized)return;
      const f=r.dataset.field;
      today[f]=Number(r.value);
      document.getElementById(f+"Label").textContent=`${r.value}/10`;
      save(); renderLibrary();
    });
  });

  document.querySelectorAll("select[data-field]").forEach(s=>{
    s.addEventListener("change",()=>{
      if(today.finalized)return;
      const f=s.dataset.field;
      today[f]=s.value;
      save(); renderLibrary();
    });
  });

  document.getElementById("notes").addEventListener("input",()=>{
    if(today.finalized)return;
    today.notes=document.getElementById("notes").value;
    save();
  });
}

function finalizeToday(){
  if(today.finalized)return;

  const b=baseReadiness(today);
  const delta=today.readiness-b;
  if(today.hard){
    GROUPS.forEach(g=>g.habits.forEach(h=>{
      const st=today.habits[h.id];
      if(st.done)st.hardCount++;
    }));
  }
  GROUPS.forEach(g=>g.habits.forEach(h=>{
    const st=today.habits[h.id];
    if(st.done){
      st.deltaSum+=delta;
      st.deltaCount++;
    }
  }));

  GROUPS.forEach(g=>g.habits.forEach(h=>{
    const st=today.habits[h.id];
    const s=streakOfficial(h.id,today.date);
    if(s>=7 && !st.mastered){
      st.mastered=true;
      st.masteredAt=today.date;
    }
  }));

  today.finalized=true;
  save();
  pit("Day finalized");
  renderLibrary();
  renderHistory();
  updateHub();
}

function renderHistory(){
  const box=document.getElementById("historyList");
  box.innerHTML="";
  const sorted=[...days].sort((a,b)=>a.date<b.date?1:-1);

  sorted.forEach(d=>{
    const item=document.createElement("div");
    item.className="history-item";
    const dt=document.createElement("div");
    dt.className="history-item-date";
    dt.textContent=fiDate(d.date);
    const tg=document.createElement("div");
    tg.className="history-item-tag";
    tg.textContent=`R${d.readiness} M${d.momentum}`;
    item.appendChild(dt); item.appendChild(tg);

    item.addEventListener("click",()=>{
      document.querySelectorAll(".history-item").forEach(i=>i.classList.remove("selected"));
      item.classList.add("selected");
      document.getElementById("historyDetail").textContent=JSON.stringify(d,null,2);
    });

    box.appendChild(item);
  });
}

function bindExport(){
  document.getElementById("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(days,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="fi_varikko_data.json"; a.click();
  });
}

function bindNav(){
  document.querySelectorAll(".nav-btn").forEach(b=>{
    b.addEventListener("click",()=>{
      document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      const v=b.dataset.view;
      document.getElementById("view-"+v)?.classList.add("active");
      if(v==="telemetry") renderTelemetry();
    });
  });

  document.querySelector("[data-view='hub']").addEventListener("click",()=>{
    document.getElementById("hub").classList.add("active");
  });
}

function init(){
  days=load();
  ensureToday();
  bindTelemetry();
  bindExport();
  bindNav();
  renderLibrary();
  renderHistory();
  updateHub();
  pit("FI Varikko ready.");
}

window.addEventListener("load", init);
