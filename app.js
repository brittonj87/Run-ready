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

    const weekDeficit = weeklyDeficitTotal(w.dates);
    document.getElementById('hp-week-deficit').textContent = `${Math.round(weekDeficit).toLocaleString()}/3.5k`;
  } else {
    document.getElementById('home-daytype').textContent = sType ? (sType==='leg'?'Leg Day':'Core Day') + ' + Stretch' : "Today's Plan";
  }

  document.getElementById('hp-stretch').textContent = `${entry.stretch.length}/${STRETCHES.length}`;
  const nutVals = Object.values(entry.nutrition);
  const nutPct = Math.round((nutVals.filter(Boolean).length/nutVals.length)*100);

  // Today's stretch card
  document.getElementById('home-stretch-meta').textContent = `${entry.stretch.length}/${STRETCHES.length} done · ~10 min`;
  const stretchDone = entry.stretch.length===STRETCHES.length;
  document.getElementById('home-stretch-check').classList.toggle('done', stretchDone);
  document.getElementById('home-stretch-check').textContent = stretchDone ? '✓' : '→';

  // Today's strength card — auto-complete when no strength is scheduled today
  const strengthTotal = sType ? STRENGTH.filter(x=>x.cat===sType).length : 0;
  document.getElementById('home-strength-icon').textContent = sType==='leg' ? '🦵' : sType==='core' ? '🔥' : '😌';
  document.getElementById('home-strength-name').textContent = sType ? (sType==='leg'?'Leg Day':'Core Day') : 'Rest — no strength today';
  document.getElementById('home-strength-meta').textContent = sType ? `${entry.strength.length}/${strengthTotal} done` : (hasProgram ? 'Recovery — stretching only' : 'Set up a program to schedule strength days');
  const strengthDone = hasProgram && (!sType || entry.strength.length===strengthTotal);
  document.getElementById('home-strength-check').classList.toggle('done', !!strengthDone);
  document.getElementById('home-strength-check').textContent = strengthDone ? '✓' : '→';

  document.getElementById('home-nutrition-meta').textContent = `${nutVals.filter(Boolean).length} of ${nutVals.length} done`;
  document.getElementById('home-nutrition-check').classList.toggle('done', nutPct===100);
  document.getElementById('home-nutrition-check').textContent = nutPct===100 ? '✓' : '→';

  renderHomeWeekCal();
}

function renderHomeWeekCal(){
  const t = localDateStr();
  let dates;
  if(PROGRAM){
    dates = currentWeekObj().dates;
  } else {
    const mon = weekStart(t);
    dates = Array.from({length:7}, (_,i)=>addDays(mon,i));
  }
  const dayLetters = ['M','T','W','T','F','S','S'];
  const container = document.getElementById('home-week-cal');
  container.innerHTML = dates.map((d,i)=>{
    const e = getEntryFor(d);
    const stretchOk = !!(e && e.stretch.length===STRETCHES.length);
    const sched = scheduledStrengthForDate(d);
    const strengthOk = !sched || !!(e && e.strength.length===STRENGTH.filter(x=>x.cat===sched).length);
    const complete = stretchOk && strengthOk;
    const isToday = d===t;
    return `<div class="week-cal-day">
      <div class="week-cal-label">${dayLetters[i]}</div>
      <div class="week-cal-circle ${complete?'done':''} ${isToday?'today':''}">${complete?'✓':parseLocalDate(d).getDate()}</div>
    </div>`;
  }).join('');
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
    const thumb = s.imageThumb
      ? `<img src="${s.imageThumb}" alt="${s.name}" class="diagram" style="height:56px; width:100%; object-fit:cover; object-position:top; border-radius:8px;">`
      : stretchCardThumb(s, COLOR_STRETCH);
    return `<div class="ex-card">
      <button class="complete-btn ${done?'done':''}" onclick="event.stopPropagation(); toggleStretchDone('${s.id}')">${done?'✓ Marked complete':'Mark complete'}</button>
      <div class="ex-card-body" onclick="openStretch('${s.id}')">
        <span class="tag" style="background:var(--stretch-bg); color:var(--stretch);">${s.target}</span>
        ${thumb}
        <div class="exname">${s.name}</div>
        <div class="exsub">${s.hold}</div>
      </div>
    </div>`;
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
  const demoHTML = s.image
    ? `<div class="illustrated-demo"><img src="${s.image}" alt="${s.name} demonstration"></div>`
    : buildStepPanelsHTML(stretchStepPanels(s, COLOR_STRETCH));
  body.innerHTML = `
    <button class="modal-minimize-btn" onclick="closeModal()" aria-label="Minimize">─</button>
    <button class="complete-btn ${done?'done':''}" id="modal-complete-btn" onclick="toggleStretchDone('${id}')">${done?'✓ Marked complete':'Mark complete'}</button>
    <span class="modal-tag" style="background:var(--stretch-bg); color:var(--stretch); margin-top:14px;">${s.target}</span>
    <h2>${s.name}</h2>
    <div class="meta">Hold: ${s.hold}</div>
    ${demoHTML}
    <div class="tip">💡 ${s.tip}</div>
    <button class="timer-btn" onclick="startHoldTimer(this)">⏱ Start hold timer</button>
    <div class="timer-display" style="display:none;"></div>
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
  if(btn){
    btn.classList.toggle('done', done);
    btn.textContent = done ? '✓ Marked complete' : 'Mark complete';
  }
  renderStretchGrid();
}

/* ---------- STRENGTH GRID ---------- */
function renderStrengthGrid(){
  const entry = todayEntry();
  const grid = document.getElementById('strength-grid');
  const items = STRENGTH.filter(x=>x.cat===currentStrengthTab);
  grid.innerHTML = items.map(s=>{
    const done = entry.strength.includes(s.id);
    const thumb = s.imageThumb
      ? `<img src="${s.imageThumb}" alt="${s.name}" class="diagram" style="height:56px; width:100%; object-fit:cover; object-position:top; border-radius:8px;">`
      : strengthCardThumb(s, COLOR_STRENGTH);
    return `<div class="ex-card">
      <button class="complete-btn ${done?'done':''}" onclick="event.stopPropagation(); toggleStrengthDone('${s.id}')">${done?'✓ Marked complete':'Mark complete'}</button>
      <div class="ex-card-body" onclick="openStrength('${s.id}')">
        <span class="tag" style="background:var(--strength-bg); color:var(--strength);">${s.target}</span>
        ${thumb}
        <div class="exname">${s.name}</div>
        <div class="exsub">${s.reps}</div>
      </div>
    </div>`;
  }).join('');
}

function openStrength(id){
  const s = STRENGTH.find(x=>x.id===id);
  const entry = todayEntry();
  const done = entry.strength.includes(id);
  const body = document.getElementById('modal-body');
  const demoHTML = s.image
    ? `<div class="illustrated-demo"><img src="${s.image}" alt="${s.name} demonstration"></div>`
    : buildStepPanelsHTML(strengthStepPanels(s, COLOR_STRENGTH));
  body.innerHTML = `
    <button class="modal-minimize-btn" onclick="closeModal()" aria-label="Minimize">─</button>
    <button class="complete-btn ${done?'done':''}" id="modal-complete-btn" onclick="toggleStrengthDone('${id}')">${done?'✓ Marked complete':'Mark complete'}</button>
    <span class="modal-tag" style="background:var(--strength-bg); color:var(--strength); margin-top:14px;">${s.target}</span>
    <h2>${s.name}</h2>
    <div class="meta">${s.reps}</div>
    ${demoHTML}
    <div class="tip">💡 ${s.tip}</div>
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
  if(btn){
    btn.classList.toggle('done', done);
    btn.textContent = done ? '✓ Marked complete' : 'Mark complete';
  }
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
  renderWeightSection();
  renderCalorieSection();
}
function toggleNutrition(key){
  updateToday(e=>{ e.nutrition[key] = !e.nutrition[key]; });
  renderNutrition();
}

/* ---------- WEIGHT TRACKER ---------- */
const WEIGHT_KEY = 'runready_weight_v1';
function loadWeightData(){
  try { return JSON.parse(localStorage.getItem(WEIGHT_KEY)) || {targetWeight:null, log:{}}; }
  catch(e){ return {targetWeight:null, log:{}}; }
}
function saveWeightData(data){ localStorage.setItem(WEIGHT_KEY, JSON.stringify(data)); }

function getCurrentWeight(){
  const data = loadWeightData();
  const dates = Object.keys(data.log).sort();
  if(dates.length===0) return null;
  return data.log[dates[dates.length-1]];
}
function getTargetWeight(){ return loadWeightData().targetWeight; }

function saveTodayWeight(value){
  const v = parseFloat(value);
  const data = loadWeightData();
  if(!v || v<=0){ delete data.log[localDateStr()]; } else { data.log[localDateStr()] = v; }
  saveWeightData(data);
  renderNutrition();
}
function saveGoalWeight(value){
  const v = parseFloat(value);
  const data = loadWeightData();
  data.targetWeight = (v && v>0) ? v : null;
  saveWeightData(data);
  renderNutrition();
}

function renderWeightSection(){
  const data = loadWeightData();
  const t = localDateStr();
  const current = getCurrentWeight();
  const target = getTargetWeight();

  document.getElementById('weight-today').value = data.log[t] != null ? data.log[t] : '';
  document.getElementById('weight-goal').value = target != null ? target : '';

  // progress text
  const progressEl = document.getElementById('weight-progress-text');
  if(current != null && target != null){
    const diff = current - target;
    if(diff <= 0){
      progressEl.textContent = `🎉 Goal reached! You're at ${current} lbs.`;
    } else {
      progressEl.textContent = `${diff.toFixed(1)} lbs to go to reach your goal of ${target} lbs.`;
    }
  } else if(current != null){
    progressEl.textContent = `Current: ${current} lbs. Set a goal weight to track progress toward it.`;
  } else {
    progressEl.textContent = 'Log your weight to start tracking progress.';
  }

  // full history, most recent first (shown inside collapsible body)
  const dates = Object.keys(data.log).sort().reverse();
  const historyEl = document.getElementById('weight-history');
  const toggleLabel = document.getElementById('weight-log-toggle-label');
  toggleLabel.textContent = `Weight log (${dates.length})`;
  if(dates.length===0){
    historyEl.innerHTML = '<div class="empty-note">No entries yet.</div>';
  } else {
    const rows = dates.map((d,i)=>{
      const w = data.log[d];
      const prevDate = dates[i+1];
      let deltaHTML = '';
      if(prevDate != null){
        const delta = w - data.log[prevDate];
        if(Math.abs(delta) > 0.05){
          const cls = delta < 0 ? 'down' : 'up';
          const arrow = delta < 0 ? '▼' : '▲';
          deltaHTML = `<span class="delta ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}</span>`;
        }
      }
      return `<div class="weight-history-row"><span>${fmtDay(d)}</span><span>${w} lbs ${deltaHTML}</span></div>`;
    }).join('');
    historyEl.innerHTML = rows;
  }

  // calorie-deficit / timeline estimate
  const estimateEl = document.getElementById('weight-goal-estimate');
  if(current != null && target != null && current > target){
    const lbsToLose = current - target;
    const weeks = Math.ceil(lbsToLose / 1); // ~1 lb/week at a ~500 cal/day deficit
    estimateEl.innerHTML = `<div class="weight-goal-note">At a moderate ~500 cal/day deficit (~1 lb/week), reaching your goal (${lbsToLose.toFixed(1)} lbs to lose) would take roughly ${weeks} week${weeks===1?'':'s'}.</div>`;
  } else {
    estimateEl.innerHTML = '';
  }

  // personalized protein target
  const proteinEl = document.getElementById('protein-target');
  const proteinLabelEl = document.getElementById('protein-target-label');
  if(current != null){
    const lo = Math.round(current*0.7), hi = Math.round(current*1.0);
    proteinEl.textContent = `${lo}–${hi}g`;
    proteinLabelEl.textContent = 'protein / day for you';
  } else {
    proteinEl.textContent = '0.7–1g';
    proteinLabelEl.textContent = 'protein / lb bodyweight';
  }

  // personalized hydration baseline
  const hydrationEl = document.getElementById('hydration-baseline');
  if(current != null){
    const oz = Math.round(current*0.5);
    hydrationEl.textContent = `Baseline for you: about ${oz} oz of water daily (half your bodyweight in lbs).`;
  } else {
    hydrationEl.textContent = 'Baseline: about half your bodyweight (lbs) in ounces of water daily.';
  }

  applyCollapsibleState('weight-history', 'weight-log-chevron', weightLogOpen);
}

let weightLogOpen = false;
function toggleWeightLog(){
  weightLogOpen = !weightLogOpen;
  applyCollapsibleState('weight-history', 'weight-log-chevron', weightLogOpen);
}
let calorieLogOpen = false;
function toggleCalorieLog(){
  calorieLogOpen = !calorieLogOpen;
  applyCollapsibleState('calorie-history', 'calorie-log-chevron', calorieLogOpen);
}
function applyCollapsibleState(bodyId, chevronId, open){
  const body = document.getElementById(bodyId);
  const chevron = document.getElementById(chevronId);
  if(!body || !chevron) return;
  body.style.display = open ? 'block' : 'none';
  chevron.classList.toggle('open', open);
}

/* ---------- CALORIE TRACKER ---------- */
const CALORIE_KEY = 'runready_calorie_v1';
const WEEKLY_DEFICIT_GOAL = 3500;
function loadCalorieData(){
  try { return JSON.parse(localStorage.getItem(CALORIE_KEY)) || {budget:null, dailyDeficitGoal:null, log:{}}; }
  catch(e){ return {budget:null, dailyDeficitGoal:null, log:{}}; }
}
function saveCalorieData(data){ localStorage.setItem(CALORIE_KEY, JSON.stringify(data)); }
function getCalorieBudget(){ return loadCalorieData().budget; }
function getDailyDeficitGoal(){ return loadCalorieData().dailyDeficitGoal; }

function setCalorieBudget(value){
  const v = parseFloat(value);
  const data = loadCalorieData();
  data.budget = (v && v>0) ? v : null;
  saveCalorieData(data);
  renderNutrition();
}
function setDailyDeficitGoal(value){
  const v = parseFloat(value);
  const data = loadCalorieData();
  data.dailyDeficitGoal = (v && v>0) ? v : null;
  saveCalorieData(data);
  renderNutrition();
}
// Both eating/drinking and training entries adjust the SAME running daily
// total (net calories) — the log stores one number per day, not each entry.
function addCalories(amountStr){
  const amt = parseFloat(amountStr);
  if(!amt || amt<=0) return;
  const data = loadCalorieData();
  const t = localDateStr();
  data.log[t] = (data.log[t]||0) + amt;
  saveCalorieData(data);
  renderNutrition();
}
function subtractCalories(amountStr){
  const amt = parseFloat(amountStr);
  if(!amt || amt<=0) return;
  const data = loadCalorieData();
  const t = localDateStr();
  data.log[t] = (data.log[t]||0) - amt;
  saveCalorieData(data);
  renderNutrition();
}
// Deficit for a date = budget - net calories logged that date.
// Days roll over naturally: once the date changes, new entries go under the
// new date's key and the prior date's totals are left untouched — this is
// effectively "locked in at midnight" without needing a background timer.
function getDeficitForDate(dateStr){
  const data = loadCalorieData();
  if(data.budget == null || data.log[dateStr] == null) return null;
  return data.budget - data.log[dateStr];
}
function weeklyDeficitTotal(dates){
  let total = 0;
  dates.forEach(d=>{
    const def = getDeficitForDate(d);
    if(def != null) total += def;
  });
  return total;
}
function weeklyCaloriesTotal(dates){
  const data = loadCalorieData();
  let total = 0;
  dates.forEach(d=>{ if(data.log[d] != null) total += data.log[d]; });
  return total;
}

function renderCalorieSection(){
  const data = loadCalorieData();
  const t = localDateStr();
  const budget = data.budget;
  const deficitGoal = data.dailyDeficitGoal;

  document.getElementById('calorie-budget').value = budget != null ? budget : '';
  document.getElementById('calorie-deficit-goal').value = deficitGoal != null ? deficitGoal : '';
  document.getElementById('calorie-add-input').value = '';
  document.getElementById('calorie-subtract-input').value = '';

  // daily budget -> weekly budget (x7)
  const summaryEl = document.getElementById('calorie-budget-summary');
  summaryEl.textContent = budget != null
    ? `Daily budget: ${budget.toLocaleString()} cal · Weekly budget: ${(budget*7).toLocaleString()} cal`
    : 'Set your daily budget to see your weekly budget.';

  const netToday = data.log[t] || 0;
  const todayText = document.getElementById('calorie-today-text');
  if(budget != null){
    const diff = budget - netToday; // positive = under budget, negative = over
    const overUnder = diff >= 0 ? `${Math.round(diff)} under budget` : `${Math.round(Math.abs(diff))} over budget`;
    todayText.textContent = `Today: ${Math.round(netToday).toLocaleString()} cal · ${overUnder}`;
    todayText.style.background = diff >= 0 ? '#EAF6ED' : '#FBEAEA';
    todayText.style.color = diff >= 0 ? 'var(--nutrition)' : '#B3261E';
  } else {
    todayText.textContent = netToday !== 0
      ? `Today: ${Math.round(netToday).toLocaleString()} cal logged. Set a budget above to compare.`
      : 'Set a budget and start logging to see today\'s totals.';
    todayText.style.background = '#EEF3F9';
    todayText.style.color = 'var(--navy)';
  }

  // trend vs personal daily deficit goal, working toward the 3,500/week target
  const trendText = document.getElementById('calorie-trend-text');
  if(budget != null && deficitGoal != null){
    const todaysDeficit = budget - netToday;
    const trendDiff = todaysDeficit - deficitGoal;
    const trendMsg = trendDiff >= 0
      ? `${Math.round(trendDiff)} cal ahead of your ${Math.round(deficitGoal)} cal/day goal`
      : `${Math.round(Math.abs(trendDiff))} cal behind your ${Math.round(deficitGoal)} cal/day goal`;
    trendText.textContent = `Trending toward 3,500/wk: ${trendMsg}`;
    trendText.style.background = trendDiff >= 0 ? '#EAF6ED' : '#FBEAEA';
    trendText.style.color = trendDiff >= 0 ? 'var(--nutrition)' : '#B3261E';
    trendText.style.display = 'block';
  } else {
    trendText.style.display = 'none';
  }

  // weekly deficit vs the 3,500 goal (uses current program week if set, else calendar week)
  let weekDates;
  if(PROGRAM){ weekDates = currentWeekObj().dates; }
  else { const mon = weekStart(t); weekDates = Array.from({length:7}, (_,i)=>addDays(mon,i)); }
  const weekDeficitTotal = weeklyDeficitTotal(weekDates);
  const weekText = document.getElementById('calorie-week-text');
  const metGoal = weekDeficitTotal >= WEEKLY_DEFICIT_GOAL;
  weekText.textContent = `This week: ${Math.round(weekDeficitTotal).toLocaleString()} / ${WEEKLY_DEFICIT_GOAL.toLocaleString()} cal deficit${metGoal ? ' — goal met! 🎉' : ''}`;
  weekText.style.background = metGoal ? '#EAF6ED' : '#FBEAEA';
  weekText.style.color = metGoal ? 'var(--nutrition)' : '#B3261E';

  // full log, most recent first — one row per day (daily totals, not entries)
  const dates = Object.keys(data.log).sort().reverse();
  const historyEl = document.getElementById('calorie-history');
  const toggleLabel = document.getElementById('calorie-log-toggle-label');
  toggleLabel.textContent = `Calorie log (${dates.length})`;
  if(dates.length===0){
    historyEl.innerHTML = '<div class="empty-note">No entries yet.</div>';
  } else {
    historyEl.innerHTML = dates.map(d=>{
      const net = data.log[d];
      const def = getDeficitForDate(d);
      let indicatorHTML = '';
      if(def != null){
        const goalForDay = deficitGoal != null ? deficitGoal : 0;
        const diff = def - goalForDay;
        const cls = diff >= 0 ? 'down' : 'up';
        const arrow = diff >= 0 ? '▼' : '▲';
        indicatorHTML = `<span class="delta ${cls}">${arrow} ${Math.abs(Math.round(diff))}</span>`;
      }
      return `<div class="weight-history-row"><span>${fmtDay(d)}</span><span>${Math.round(net).toLocaleString()} cal ${indicatorHTML}</span></div>`;
    }).join('');
  }

  applyCollapsibleState('calorie-history', 'calorie-log-chevron', calorieLogOpen);
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
    const weekCalTotal = weeklyCaloriesTotal(w.dates);
    const dailyBudget = getCalorieBudget();
    const weeklyBudget = dailyBudget != null ? dailyBudget*7 : null;
    const calLineHTML = weeklyBudget != null
      ? `<div class="week-req-row"><span class="wdot" style="background:var(--nutrition);"></span>${Math.round(weekCalTotal).toLocaleString()} / ${Math.round(weeklyBudget).toLocaleString()} cal this week</div>`
      : `<div class="week-req-row"><span class="wdot" style="background:var(--nutrition);"></span>${Math.round(weekCalTotal).toLocaleString()} cal logged this week — set a daily budget in Fuel to compare</div>`;
    return `<div class="week-card ${isCurrent?'current':''}">
      <div class="week-card-top">
        <div class="week-num">Week ${w.index} of ${PROGRAM.totalWeeks}</div>
        <div class="week-dates">${fmtShort(w.monday)} – ${fmtShort(addDays(w.monday,6))}</div>
      </div>
      <span class="phase-badge" style="background:${w.info.color};">${w.phase}</span>
      <div class="week-note">${w.info.note}</div>
      <div class="week-req-row"><span class="wdot" style="background:var(--strength);"></span>${strengthLabel}</div>
      <div class="week-req-row"><span class="wdot" style="background:var(--stretch);"></span>Daily stretch routine (all 7 days)</div>
      ${calLineHTML}
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

/* ---------- BACKUP / RESTORE ---------- */
const BACKUP_KEYS = [PROGRAM_KEY, STORE_KEY, WEIGHT_KEY, CALORIE_KEY];

function exportData(){
  const payload = { exportedAt: new Date().toISOString(), app: 'RunReady', data: {} };
  BACKUP_KEYS.forEach(k=>{
    const raw = localStorage.getItem(k);
    if(raw != null) payload.data[k] = raw;
  });
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `runready-backup-${localDateStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    let parsed;
    try { parsed = JSON.parse(e.target.result); }
    catch(err){ alert('That file doesn\'t look like a valid RunReady backup.'); return; }
    if(!parsed || !parsed.data){ alert('That file doesn\'t look like a valid RunReady backup.'); return; }
    const confirmed = confirm('Importing will overwrite all current RunReady data on this device. Continue?');
    if(!confirmed) return;
    BACKUP_KEYS.forEach(k=>{
      if(parsed.data[k] != null) localStorage.setItem(k, parsed.data[k]);
      else localStorage.removeItem(k);
    });
    alert('Import complete! Reloading the app.');
    location.reload();
  };
  reader.onerror = function(){ alert('Could not read that file.'); };
  reader.readAsText(file);
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
