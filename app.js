/* ---------- date helpers (local time, not UTC) ---------- */
function localDateStr(d = new Date()){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseLocalDate(str){
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(str, n){
  const d = parseLocalDate(str);
  d.setDate(d.getDate()+n);
  return localDateStr(d);
}
function daysBetween(a,b){ // b - a, in days
  return Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86400000);
}
// Monday-start week key for a given date string
function weekStart(str){
  const d = parseLocalDate(str);
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (dow === 0 ? -6 : 1 - dow); // shift to Monday
  d.setDate(d.getDate()+diff);
  return localDateStr(d);
}
function fmtDay(str){
  return parseLocalDate(str).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
}
function fmtShort(str){
  return parseLocalDate(str).toLocaleDateString(undefined, {month:'short', day:'numeric'});
}

/* ================= PROGRAM (weeks / phases) ================= */
const PROGRAM_KEY = 'runready_program_v1';
let PROGRAM = null;

const PHASE_INFO = {
  'Base Building': {strengthDays:2, color:'#1F8A8A', note:'Build the habit — two strength sessions and a daily stretch routine.'},
  'Build':          {strengthDays:3, color:'#C2571B', note:'Add a third strength day. Keep stretching every day.'},
  'Peak':           {strengthDays:3, color:'#B4223C', note:'Highest training load — hold moves a little longer and stay consistent with stretching.'},
  'Taper':          {strengthDays:2, color:'#1F8A8A', note:'Pull strength volume back. Stay loose with daily stretching.'},
  'Race Week':      {strengthDays:1, color:'#14315C', note:'Rest those muscles. Light stretching only, and dial in your fueling.'}
};

function loadProgramConfig(){
  try { return JSON.parse(localStorage.getItem(PROGRAM_KEY)); } catch(e){ return null; }
}
function saveProgramConfig(cfg){
  localStorage.setItem(PROGRAM_KEY, JSON.stringify(cfg));
  PROGRAM = buildProgram(cfg);
}

function computePhaseSchedule(totalWeeks){
  if(totalWeeks<=0) return [];
  if(totalWeeks===1) return ['Race Week'];
  let taperCount = totalWeeks>=6 ? 2 : (totalWeeks>=4 ? 1 : 0);
  let remaining = totalWeeks - 1 - taperCount;
  if(remaining<0){ taperCount = totalWeeks-1; remaining = 0; }
  let peakCount = remaining>0 ? Math.min(remaining, Math.max(1, Math.round(remaining*0.25))) : 0;
  let remaining2 = remaining - peakCount;
  let buildCount = remaining2>0 ? Math.min(remaining2, Math.max(1, Math.round(remaining2*0.5))) : 0;
  let baseCount = remaining2 - buildCount;
  const arr = [];
  for(let i=0;i<baseCount;i++) arr.push('Base Building');
  for(let i=0;i<buildCount;i++) arr.push('Build');
  for(let i=0;i<peakCount;i++) arr.push('Peak');
  for(let i=0;i<taperCount;i++) arr.push('Taper');
  arr.push('Race Week');
  return arr;
}

function slotPattern(n){
  if(n===0) return [];
  if(n===1) return [2];        // Tue
  if(n===2) return [1,4];      // Mon, Thu
  if(n===3) return [1,3,5];    // Mon, Wed, Fri
  return [1,2,3,4,5].slice(0,n);
}

function buildProgram(cfg){
  if(!cfg || !cfg.raceDate) return null;
  const startMonday = weekStart(cfg.startDate || localDateStr());
  const raceMonday = weekStart(cfg.raceDate);
  let totalWeeks = Math.round((parseLocalDate(raceMonday) - parseLocalDate(startMonday)) / (7*86400000)) + 1;
  totalWeeks = Math.max(1, totalWeeks);
  const phases = computePhaseSchedule(totalWeeks);
  let toggle = 0;
  const weeks = [];
  for(let i=0;i<totalWeeks;i++){
    const monday = addDays(startMonday, i*7);
    const dates = Array.from({length:7}, (_,d)=>addDays(monday,d));
    const phase = phases[i];
    const info = PHASE_INFO[phase];
    const slots = slotPattern(info.strengthDays);
    const strengthDays = [];
    slots.forEach(slotDow=>{
      const dateForSlot = dates.find(d=>{
        const dow = parseLocalDate(d).getDay();
        const mondayIndexed = dow===0 ? 7 : dow;
        return mondayIndexed === slotDow;
      });
      if(dateForSlot && dateForSlot <= cfg.raceDate){
        const type = toggle % 2 === 0 ? 'leg' : 'core';
        toggle++;
        strengthDays.push({date:dateForSlot, type});
      }
    });
    weeks.push({index:i+1, monday, dates, phase, info, strengthDays});
  }
  return {config:cfg, startMonday, raceMonday, totalWeeks, weeks, raceDate:cfg.raceDate};
}

function currentWeekObj(){
  if(!PROGRAM) return null;
  const t = localDateStr();
  let w = PROGRAM.weeks.find(w => t >= w.monday && t <= addDays(w.monday,6));
  if(!w) w = (t < PROGRAM.startMonday) ? PROGRAM.weeks[0] : PROGRAM.weeks[PROGRAM.weeks.length-1];
  return w;
}
function scheduledStrengthForDate(dateStr){
  if(!PROGRAM) return null;
  const w = PROGRAM.weeks.find(w => dateStr >= w.monday && dateStr <= addDays(w.monday,6));
  if(!w) return null;
  const found = w.strengthDays.find(sd=>sd.date===dateStr);
  return found ? found.type : null;
}
function scheduledStrengthToday(){ return scheduledStrengthForDate(localDateStr()); }

/* ---------- state / storage ---------- */
const STORE_KEY = 'runready_log_v1';
function loadLog(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e){ return {}; }
}
function saveLog(log){ localStorage.setItem(STORE_KEY, JSON.stringify(log)); }
function blankEntry(){ return { stretch:[], strength:[], nutrition:{protein:false, veggies:false, hydration:false} }; }
function todayEntry(){
  const log = loadLog();
  const t = localDateStr();
  if(!log[t]){ log[t] = blankEntry(); saveLog(log); }
  return log[t];
}
function updateToday(mutator){
  const log = loadLog();
  const t = localDateStr();
  if(!log[t]) log[t] = blankEntry();
  mutator(log[t]);
  saveLog(log);
  renderHome();
}

/* ---------- navigation ---------- */
let currentStrengthTab = 'leg';
let currentPlanTab = 'upcoming';
function go(screen){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+screen).classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.screen===screen));
  if(screen==='home') renderHome();
  if(screen==='stretch') renderStretchGrid();
  if(screen==='strength'){ const sched = scheduledStrengthToday(); if(sched) currentStrengthTab = sched; document.querySelectorAll('#screen-strength .segtabs button').forEach(b=>b.classList.toggle('active', b.dataset.cat===currentStrengthTab)); renderStrengthGrid(); }
  if(screen==='nutrition') renderNutrition();
  if(screen==='plan'){ renderPlan(); renderHistory(); }
  window.scrollTo(0,0);
}
function setStrengthTab(cat){
  currentStrengthTab = cat;
  document.querySelectorAll('#screen-strength .segtabs button').forEach(b=>b.classList.toggle('active', b.dataset.cat===cat));
  renderStrengthGrid();
}
function setPlanTab(tab){
  currentPlanTab = tab;
  document.querySelectorAll('#screen-plan .segtabs button').forEach(b=>b.classList.toggle('active', b.dataset.ptab===tab));
  document.getElementById('plan-upcoming').style.display = tab==='upcoming' ? 'block' : 'none';
  document.getElementById('plan-history').style.display = tab==='history' ? 'block' : 'none';
}

/* ---------- HOME ---------- */
function renderHome(){
  const t = localDateStr();
  const entry = todayEntry();
  document.getElementById('home-date').textContent = fmtDay(t);
  document.getElementById('home-streak').textContent = computeStreak();

  const hasProgram = !!PROGRAM;
  document.getElementById('hero-no-program').style.display = hasProgram ? 'none' : 'block';
  document.getElementById('hero-program').style.display = hasProgram ? 'block' : 'none';

  const sType = scheduledStrengthToday(); // 'leg' | 'core' | null

  if(hasProgram){
    const w = currentWeekObj();
    const daysToRace = daysBetween(t, PROGRAM.raceDate);
    const cd = document.getElementById('home-countdown');
    const cdl = document.getElementById('home-countdown-label');
    if(daysToRace > 0){ cd.textContent = daysToRace; cdl.textContent = 'days to race day'; }
    else if(daysToRace === 0){ cd.textContent = '🏁'; cdl.textContent = "It's race day!"; }
    else { cd.textContent = '✓'; cdl.textContent = 'Race complete'; }

    document.getElementById('home-daytype').textContent = sType ? (sType==='leg'?'Leg Day':'Core Day') + ' + Stretch' : 'Stretch Day';
    document.getElementById('home-subline').textContent = `Week ${w.index} of ${PROGRAM.totalWeeks} · ${w.phase}`;

    const weekStrengthReq = w.strengthDays.length;
    const weekStrengthDone = w.dates.filter(d=>{
      const sched = scheduledStrengthForDate(d);
      if(!sched) return false;
      const e = getEntryFor(d);
      return e && e.strength.length>0;
    }).length;
    document.getElementById('hp-week-strength').textContent = `${weekStrengthDone}/${weekStrengthReq}`;
  } else {
    document.getElementById('home-daytype').textContent = sType ? (sType==='leg'?'Leg Day':'Core Day') + ' + Stretch' : "Today's Plan";
  }

  document.getElementById('hp-stretch').textContent = `${entry.stretch.length}/${STRETCHES.length}`;
  const nutVals = Object.values(entry.nutrition);
  const nutPct = Math.round((nutVals.filter(Boolean).length/nutVals.length)*100);
  document.getElementById('hp-nutrition').textContent = nutPct+'%';

  // Today's stretch card
  document.getElementById('home-stretch-meta').textContent = `${entry.stretch.length}/${STRETCHES.length} done · ~10 min`;
  const stretchDone = entry.stretch.length===STRETCHES.length;
  document.getElementById('home-stretch-check').classList.toggle('done', stretchDone);
  document.getElementById('home-stretch-check').textContent = stretchDone ? '✓' : '→';

  // Today's strength card
  const strengthTotal = sType ? STRENGTH.filter(x=>x.cat===sType).length : 0;
  document.getElementById('home-strength-title').textContent = sType ? "Today's Strength Work" : 'Strength';
  document.getElementById('home-strength-icon').textContent = sType==='leg' ? '🦵' : sType==='core' ? '🔥' : '😌';
  document.getElementById('home-strength-name').textContent = sType ? (sType==='leg'?'Leg Day':'Core Day') : 'Rest — no strength today';
  document.getElementById('home-strength-meta').textContent = sType ? `${entry.strength.length}/${strengthTotal} done` : (hasProgram ? 'Recovery — stretching only' : 'Set up a program to schedule strength days');
  const strengthDone = sType && entry.strength.length===strengthTotal;
  document.getElementById('home-strength-check').classList.toggle('done', !!strengthDone);
  document.getElementById('home-strength-check').textContent = strengthDone ? '✓' : '→';

  document.getElementById('home-nutrition-meta').textContent = `${nutVals.filter(Boolean).length} of ${nutVals.length} done`;
  document.getElementById('home-nutrition-check').classList.toggle('done', nutPct===100);
  document.getElementById('home-nutrition-check').textContent = nutPct===100 ? '✓' : '→';
}

function getEntryFor(dateStr){
  const log = loadLog();
  return log[dateStr] || null;
}

function computeStreak(){
  const log = loadLog();
  let streak = 0;
  let d = localDateStr();
  while(true){
    const e = log[d];
    const complete = e && e.stretch.length===STRETCHES.length;
    if(complete){ streak++; d = addDays(d,-1); }
    else if(d===localDateStr()){ d = addDays(d,-1); continue; }
    else break;
  }
  return streak;
}

/* ---------- COLORS for cartoon diagrams (match CSS vars) ---------- */
const COLOR_STRETCH = '#1F8A8A';
const COLOR_STRENGTH = '#C2571B';

/* ---------- STRETCH GRID ---------- */
function renderStretchGrid(){
  const entry = todayEntry();
  const grid = document.getElementById('stretch-grid');
  grid.innerHTML = STRETCHES.map(s=>{
    const done = entry.stretch.includes(s.id);
    return `<button class="ex-card" onclick="openStretch('${s.id}')" style="position:relative;">
      ${done?'<span class="donebadge">✓</span>':''}
      <span class="tag" style="background:var(--stretch-bg); color:var(--stretch);">${s.target}</span>
      ${stretchCardThumb(s, COLOR_STRETCH)}
      <div class="exname">${s.name}</div>
      <div class="exsub">${s.hold}</div>
    </button>`;
  }).join('');
}

function buildStepPanelsHTML(panels){
  return `<div class="step-panels">${panels.map((p,i)=>`
    <div class="step-panel">
      <div class="step-diagram-wrap"><span class="step-num">${i+1}</span>${p.svg}</div>
      <div class="step-text">${p.text}</div>
    </div>`).join('')}</div>`;
}

function openStretch(id){
  const s = STRETCHES.find(x=>x.id===id);
  const entry = todayEntry();
  const done = entry.stretch.includes(id);
  const body = document.getElementById('modal-body');
  const panels = stretchStepPanels(s, COLOR_STRETCH);
  body.innerHTML = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModal()">✕</button>
    <span class="modal-tag" style="background:var(--stretch-bg); color:var(--stretch);">${s.target}</span>
    <h2>${s.name}</h2>
    <div class="meta">Hold: ${s.hold}</div>
    ${buildStepPanelsHTML(panels)}
    <div class="tip">💡 ${s.tip}</div>
    <button class="timer-btn" onclick="startHoldTimer(this)">⏱ Start hold timer</button>
    <div class="timer-display" style="display:none;"></div>
    <button class="complete-btn ${done?'done':''}" id="modal-complete-btn" onclick="toggleStretchDone('${id}')">${done?'✓ Marked complete':'Mark complete'}</button>
  `;
  document.getElementById('modal-backdrop').classList.add('open');
}

function toggleStretchDone(id){
  updateToday(e=>{
    const i = e.stretch.indexOf(id);
    if(i>-1) e.stretch.splice(i,1); else e.stretch.push(id);
  });
  const entry = todayEntry();
  const done = entry.stretch.includes(id);
  const btn = document.getElementById('modal-complete-btn');
  btn.classList.toggle('done', done);
  btn.textContent = done ? '✓ Marked complete' : 'Mark complete';
  renderStretchGrid();
}

/* ---------- STRENGTH GRID ---------- */
function renderStrengthGrid(){
  const entry = todayEntry();
  const grid = document.getElementById('strength-grid');
  const items = STRENGTH.filter(x=>x.cat===currentStrengthTab);
  grid.innerHTML = items.map(s=>{
    const done = entry.strength.includes(s.id);
    return `<button class="ex-card" onclick="openStrength('${s.id}')" style="position:relative;">
      ${done?'<span class="donebadge">✓</span>':''}
      <span class="tag" style="background:var(--strength-bg); color:var(--strength);">${s.target}</span>
      ${strengthCardThumb(s, COLOR_STRENGTH)}
      <div class="exname">${s.name}</div>
      <div class="exsub">${s.reps}</div>
    </button>`;
  }).join('');
}

function openStrength(id){
  const s = STRENGTH.find(x=>x.id===id);
  const entry = todayEntry();
  const done = entry.strength.includes(id);
  const body = document.getElementById('modal-body');
  const panels = strengthStepPanels(s, COLOR_STRENGTH);
  body.innerHTML = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModal()">✕</button>
    <span class="modal-tag" style="background:var(--strength-bg); color:var(--strength);">${s.target}</span>
    <h2>${s.name}</h2>
    <div class="meta">${s.reps}</div>
    ${buildStepPanelsHTML(panels)}
    <div class="tip">💡 ${s.tip}</div>
    <button class="complete-btn ${done?'done':''}" id="modal-complete-btn" onclick="toggleStrengthDone('${id}')">${done?'✓ Marked complete':'Mark complete'}</button>
  `;
  document.getElementById('modal-backdrop').classList.add('open');
}

function toggleStrengthDone(id){
  updateToday(e=>{
    const i = e.strength.indexOf(id);
    if(i>-1) e.strength.splice(i,1); else e.strength.push(id);
  });
  const entry = todayEntry();
  const done = entry.strength.includes(id);
  const btn = document.getElementById('modal-complete-btn');
  btn.classList.toggle('done', done);
  btn.textContent = done ? '✓ Marked complete' : 'Mark complete';
  renderStrengthGrid();
}

/* ---------- TIMER ---------- */
function startHoldTimer(btn){
  const wrap = btn.parentElement;
  const display = wrap.querySelector('.timer-display');
  let seconds = 60;
  display.style.display = 'block';
  display.textContent = seconds + 's';
  btn.textContent = '⏸ Restart timer';
  if(btn._interval) clearInterval(btn._interval);
  btn._interval = setInterval(()=>{
    seconds--;
    if(seconds<=0){ display.textContent = 'Done! 🎉'; clearInterval(btn._interval); return; }
    display.textContent = seconds + 's';
  },1000);
}

/* ---------- NUTRITION ---------- */
const NUTRITION_ITEMS = [
  {key:'protein', label:'Protein at every meal', sub:'Aim for a palm-sized portion or more'},
  {key:'veggies', label:'Veggies + fiber', sub:'At least 2 servings today'},
  {key:'hydration', label:'Hydration goal met', sub:'Water throughout the day, more if you ran'},
];
function renderNutrition(){
  const entry = todayEntry();
  const list = document.getElementById('nutrition-checklist');
  list.innerHTML = NUTRITION_ITEMS.map(item=>{
    const checked = !!entry.nutrition[item.key];
    return `<div class="checklist-item" onclick="toggleNutrition('${item.key}')">
      <div class="cbox ${checked?'checked':''}">${checked?'✓':''}</div>
      <div><div class="ctext">${item.label}</div><div class="csub">${item.sub}</div></div>
    </div>`;
  }).join('');
}
function toggleNutrition(key){
  updateToday(e=>{ e.nutrition[key] = !e.nutrition[key]; });
  renderNutrition();
}

/* ---------- PLAN (weekly requirements) ---------- */
function renderPlan(){
  const noProgram = document.getElementById('plan-no-program');
  const list = document.getElementById('plan-weeks-list');
  const sub = document.getElementById('plan-hero-sub');
  if(!PROGRAM){
    noProgram.style.display = 'block';
    list.innerHTML = '';
    sub.textContent = 'Set a race date to see your weekly plan.';
    return;
  }
  noProgram.style.display = 'none';
  sub.textContent = `${PROGRAM.totalWeeks}-week program · Race day ${fmtShort(PROGRAM.raceDate)}`;
  const t = localDateStr();
  const wd = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  list.innerHTML = PROGRAM.weeks.map(w=>{
    const isCurrent = t>=w.monday && t<=addDays(w.monday,6);
    const dayPills = w.dates.map(d=>{
      const sched = scheduledStrengthForDate(d);
      const e = getEntryFor(d);
      const done = e && sched && e.strength.length>0;
      const isToday = d===t;
      const dow = parseLocalDate(d).getDay();
      let cls = 'wd-pill';
      if(sched) cls += ' scheduled';
      if(done) cls += ' pastdone';
      if(isToday) cls += ' today';
      return `<div class="${cls}">${wd[dow===0?7:dow]}</div>`;
    }).join('');
    const strengthLabel = w.strengthDays.length>0
      ? `${w.strengthDays.length} strength day${w.strengthDays.length>1?'s':''}: ${w.strengthDays.map(sd=>fmtDay(sd.date).split(',')[0]+' ('+(sd.type==='leg'?'Leg':'Core')+')').join(' · ')}`
      : 'No strength days — recovery focus';
    return `<div class="week-card ${isCurrent?'current':''}">
      <div class="week-card-top">
        <div class="week-num">Week ${w.index} of ${PROGRAM.totalWeeks}</div>
        <div class="week-dates">${fmtShort(w.monday)} – ${fmtShort(addDays(w.monday,6))}</div>
      </div>
      <span class="phase-badge" style="background:${w.info.color};">${w.phase}</span>
      <div class="week-note">${w.info.note}</div>
      <div class="week-req-row"><span class="wdot" style="background:var(--strength);"></span>${strengthLabel}</div>
      <div class="week-req-row"><span class="wdot" style="background:var(--stretch);"></span>Daily stretch routine (all 7 days)</div>
      <div class="week-days-mini">${dayPills}</div>
    </div>`;
  }).join('');
}

/* ---------- HISTORY (inside Plan tab) ---------- */
function renderHistory(){
  const log = loadLog();
  const dates = Object.keys(log).sort().reverse();
  document.getElementById('stat-streak').textContent = computeStreak();
  const totalSessions = dates.reduce((sum,d)=> sum + (log[d].stretch.length>0?1:0) + (log[d].strength.length>0?1:0), 0);
  document.getElementById('stat-total').textContent = totalSessions;
  const weeks = new Set(dates.map(d=>weekStart(d)));
  document.getElementById('stat-weeks').textContent = weeks.size;

  const container = document.getElementById('history-weeks');
  if(dates.length===0){
    container.innerHTML = '<div class="empty-note">Nothing logged yet — complete today\'s routine to get started.</div>';
    return;
  }
  const byWeek = {};
  dates.forEach(d=>{
    const wk = weekStart(d);
    if(!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(d);
  });
  const weekKeys = Object.keys(byWeek).sort().reverse();
  container.innerHTML = weekKeys.map(wk=>{
    const days = byWeek[wk].sort();
    const rows = days.map(d=>{
      const e = log[d];
      const stretchOn = e.stretch.length>0;
      const strengthOn = e.strength.length>0;
      const nutVals = Object.values(e.nutrition);
      const nutOn = nutVals.filter(Boolean).length>0;
      return `<div class="day-row">
        <div class="day-date">${parseLocalDate(d).toLocaleDateString(undefined,{weekday:'short', day:'numeric'})}</div>
        <div class="day-icons">
          <div class="dicon ${stretchOn?'on-stretch':''}" title="Stretch">🧘</div>
          <div class="dicon ${strengthOn?'on-strength':''}" title="Strength">💪</div>
          <div class="dicon ${nutOn?'on-nutrition':''}" title="Nutrition">🥗</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="week-block">
      <div class="week-label">Week of ${fmtShort(wk)}</div>
      <div class="card">${rows}</div>
    </div>`;
  }).join('');
}

/* ---------- SETUP MODAL ---------- */
function openSetup(){
  const cfg = loadProgramConfig() || {};
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Set up your program</h2>
    <div class="meta">This builds your week-by-week stretch &amp; strength plan.</div>
    <div class="form-row">
      <label>Program start date</label>
      <input type="date" id="setup-start" value="${cfg.startDate || localDateStr()}">
    </div>
    <div class="form-row">
      <label>Race date</label>
      <input type="date" id="setup-race" value="${cfg.raceDate || ''}">
    </div>
    <div class="form-error" id="setup-error">Race date must be after the start date.</div>
    <button class="save-btn" onclick="saveSetup()">Save program</button>
    ${cfg.raceDate ? '<button class="timer-btn" style="margin-top:10px;" onclick="closeModal()">Cancel</button>' : ''}
  `;
  document.getElementById('modal-backdrop').classList.add('open');
}
function saveSetup(){
  const startDate = document.getElementById('setup-start').value;
  const raceDate = document.getElementById('setup-race').value;
  const err = document.getElementById('setup-error');
  if(!raceDate || !startDate || raceDate < startDate){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  saveProgramConfig({startDate, raceDate});
  closeModal();
  renderHome();
  if(document.getElementById('screen-plan').classList.contains('active')) renderPlan();
}

/* ---------- MODAL ---------- */
function closeModal(){
  document.getElementById('modal-backdrop').classList.remove('open');
}

/* ---------- INIT ---------- */
PROGRAM = buildProgram(loadProgramConfig());
todayEntry();
renderHome();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
