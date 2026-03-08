/**
 * LISANDRO BUSTOS — Generador de Rutinas
 * ─────────────────────────────────────────
 * Lee todos los .xlsx de /alumnos
 * Genera una página HTML por alumno con historial de semanas
 * Hace commit + push → Netlify publica automáticamente
 * Imprime los links al final
 *
 * Uso: node generar.js
 */

const fs    = require('fs');
const path  = require('path');
const XLSX  = require('xlsx');
const { execSync } = require('child_process');

// ── CONFIG ────────────────────────────────────────────────
const CONFIG = {
  alumnosDir : path.join(__dirname, 'alumnos'),
  docsDir    : path.join(__dirname, 'docs'),
  baseUrl    : 'https://lisandrobustos.netlify.app',  // ← cambiá esto por tu URL de Netlify
};

// ─────────────────────────────────────────────────────────
//  COLORES para la terminal
// ─────────────────────────────────────────────────────────
const c = {
  green  : s => `\x1b[32m${s}\x1b[0m`,
  yellow : s => `\x1b[33m${s}\x1b[0m`,
  cyan   : s => `\x1b[36m${s}\x1b[0m`,
  bold   : s => `\x1b[1m${s}\x1b[0m`,
  red    : s => `\x1b[31m${s}\x1b[0m`,
  dim    : s => `\x1b[2m${s}\x1b[0m`,
};

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────
function toSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parsePauseSecs(p) {
  if (!p || p === '—') return 0;
  const m = String(p).match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function getLastSeries(bdg) {
  if (!bdg) return null;
  const seriesM = String(bdg).match(/x\s*\d+\s*series.*/i);
  if (!seriesM) return null;
  const loadStr = String(bdg).replace(/\s*x\s*\d+\s*series.*/i, '').trim();
  const clean   = loadStr.replace(/\([^)]*\)/g, m => m.replace(/-/g, '\u2012'));
  const parts   = clean.split(/\s+-\s+/);
  if (parts.length < 2) return null;
  const last    = parts[parts.length - 1].replace(/\u2012/g, '-').trim();
  return `${last} ${seriesM[0]}`;
}

function extractSeries(bdg) {
  const m = String(bdg).match(/x\s*(\d+)\s*series/i);
  return m ? m[1] : '';
}

// ─────────────────────────────────────────────────────────
//  PARSE WORKBOOK
// ─────────────────────────────────────────────────────────
function parseWorkbook(filePath) {
  const wb    = XLSX.readFile(filePath);
  const names = wb.SheetNames;

  const ejSheet = wb.Sheets['EJERCICIOS'];
  if (!ejSheet) throw new Error(`No se encontró la pestaña "EJERCICIOS" en ${path.basename(filePath)}`);

  const ejRows = XLSX.utils.sheet_to_json(ejSheet, { defval: '' });

  // All SEMANA_ sheets, sorted
  const semanaNames = names.filter(n => n.startsWith('SEMANA_')).sort();
  if (!semanaNames.length) throw new Error(`No hay pestañas SEMANA_N en ${path.basename(filePath)}`);

  const semanas = {};
  semanaNames.forEach(s => {
    semanas[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' });
  });

  // Unique alumnos
  const alumnos = [...new Set(ejRows.map(r => r['Alumno']).filter(Boolean))];

  return { ejRows, semanas, semanaNames, alumnos };
}

// ─────────────────────────────────────────────────────────
//  BUILD ROUTINE OBJECT  (for one alumno + one semana)
// ─────────────────────────────────────────────────────────
function buildRoutine(ejRows, semRows, alumno) {
  const filtEj  = ejRows.filter(r => r['Alumno'] === alumno);
  const filtSem = semRows.filter(r => r['Alumno'] === alumno);

  // badge + pause lookup keyed by "Día||Nro"
  const badgeMap = {}, pauseMap = {};
  filtSem.forEach(r => {
    const key = `${r['Día']}||${r['Nro']}`;
    // Try multiple possible column names for the badge
    badgeMap[key] = r['Cargas / Reps / Series  ← EDITAR AQUÍ']
                 || r['Cargas / Reps / Series']
                 || r['Badge']
                 || '—';
    pauseMap[key] = String(r['Pausa'] || '—').replace(/"/g, 'seg');
  });

  const dias = [...new Set(filtEj.map(r => r['Día']).filter(Boolean))];
  const routine = {};
  const dayLabels = {};

  dias.forEach((dia, di) => {
    const dayNum  = di + 1;
    dayLabels[dayNum] = dia;
    const diaRows = filtEj.filter(r => r['Día'] === dia);
    const warmup  = diaRows.filter(r => ['Calentamiento','calentamiento','CALENTAMIENTO'].includes(r['Bloque']));
    const main    = diaRows.filter(r => !['Calentamiento','calentamiento','CALENTAMIENTO'].includes(r['Bloque']));

    const esc = s => String(s).replace(/\n/g, ' ').replace(/\r/g, '');
    const toEx = (rows, prefix) => rows.map((r, idx) => {
      const nro   = String(r['Nro'] || (idx + 1));
      const key   = `${dia}||${nro}`;
      const badge = badgeMap[key] || '—';
      const pause = pauseMap[key] || '—';
      return {
        id  : `${prefix}_${dia.replace(/\s/g,'')}_${nro}`.replace(/[^a-z0-9_]/gi, '_'),
        n   : nro + '.',
        nm  : esc(r['Nombre del Ejercicio'] || r['Nombre'] || '—'),
        bdg : esc(badge),
        pa  : esc(pause),
        nt  : esc(r['Nota Técnica'] || r['Nota'] || ''),
        yt  : String(r['Video YouTube'] || r['Video'] || '#'),
        rs  : parsePauseSecs(pause),
        se  : extractSeries(String(badge)),
      };
    });

    routine[dayNum] = {
      w : toEx(warmup, 'w'),
      m : toEx(main, 'm'),
    };
  });

  return { routine, dayLabels, dias };
}

// ─────────────────────────────────────────────────────────
//  BUILD FULL HTML FOR ONE ALUMNO
// ─────────────────────────────────────────────────────────
function buildHTML(alumno, semanaNames, semanas, ejRows) {
  const alumnoCorto = alumno.split(' ')[0];
  const alumnoSlug  = toSlug(alumno);

  // ── Build per-semana routine objects ──
  const semanaDataArr = semanaNames.map(semName => {
    const semRows       = semanas[semName];
    const { routine, dayLabels, dias } = buildRoutine(ejRows, semRows, alumno);
    return { semName, routine, dayLabels, dias };
  });

  // Current = last semana
  const current    = semanaDataArr[semanaDataArr.length - 1];
  const historical = semanaDataArr.slice(0, -1).reverse(); // most recent first

  // ── Build day-page HTML for a given routine ──
  function buildDayPages(routine, dias, prefix) {
    return dias.map((dia, di) => {
      const dayNum   = di + 1;
      const isActive = dayNum === 1 ? ' active' : '';
      return `<div class="day-pg${isActive}" id="${prefix}day${dayNum}">
  <div class="sec-label">Movilidad / Activación</div>
  <div id="${prefix}c-d${dayNum}-w"></div>
  <div class="sec-label" style="margin-top:8px">Bloque Fuerza</div>
  <div id="${prefix}c-d${dayNum}-m"></div>
</div>`;
    }).join('\n');
  }

  // ── Build history accordion HTML ──
  function buildHistoryHTML() {
    if (!historical.length) return '';
    const items = historical.map((h, hi) => {
      const label = h.semName.replace('_', ' ');
      const dayPages = buildDayPages(h.routine, h.dias, `h${hi}_`);
      const tabBtns  = h.dias.map((dia, di) =>
        `<button class="tab${di===0?' active':''}" data-hday="${hi}_${di+1}" onclick="switchHDay(${hi},${di+1})">${dia}</button>`
      ).join('');
      return `
<div class="hist-item">
  <div class="hist-header" onclick="toggleHist(${hi})">
    <span class="hist-label">${label}</span>
    <span class="hist-chevron" id="hchev-${hi}">▾</span>
  </div>
  <div class="hist-body" id="hbody-${hi}">
    <div class="hist-tabs">
      <div class="tabs-wrap" style="padding:8px 12px 10px;background:var(--expand-bg)">
        ${tabBtns}
      </div>
    </div>
    <div class="hist-content">
      ${dayPages}
      <div class="done-screen" id="h${hi}doneScreen" style="padding:40px 20px"></div>
    </div>
    <div class="hist-js" data-routine='${JSON.stringify(h.routine)}' data-semkey="${h.semName}" data-hi="${hi}"></div>
  </div>
</div>`;
    }).join('');

    return `
<div class="history-section">
  <div class="history-title">
    <span>📅 Historial de semanas anteriores</span>
  </div>
  ${items}
</div>`;
  }

  // ── Serialize routine to JS ──
  function routineToJS(routine, varName) {
    return `const ${varName} = ${JSON.stringify(routine)};`;
  }

  const currentDayPages = buildDayPages(current.routine, current.dias, '');
  const currentDayTabs  = current.dias.map((dia, di) =>
    `<button class="tab${di===0?' active':''}" data-day="${di+1}" onclick="switchDay(${di+1})">${dia}</button>`
  ).join('\n  ');


const CARD_JS = fs.readFileSync(path.join(__dirname, 'scripts', 'card.js'), 'utf8');


  const historyHTML = buildHistoryHTML();

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>${alumno} — Planificación</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
${CSS}
/* ── HISTORY STYLES ── */
.history-section{max-width:720px;margin:0 auto;padding:0 12px 32px;}
.history-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--sec-lbl);padding:20px 0 12px;display:flex;align-items:center;gap:10px;}
.history-title::after{content:'';flex:1;height:1px;background:var(--ireg-border);}
.hist-item{background:var(--card-bg);border-radius:12px;margin-bottom:8px;overflow:hidden;box-shadow:var(--card-shadow);}
.hist-header{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;cursor:pointer;border-bottom:1px solid transparent;transition:all 0.2s;}
.hist-header:hover{background:rgba(34,197,94,0.04);}
.hist-label{font-size:13px;font-weight:600;color:#1a1a1a;}
.hist-chevron{font-size:16px;color:var(--sec-lbl);transition:transform 0.25s;}
.hist-chevron.open{transform:rotate(180deg);}
.hist-body{max-height:0;overflow:hidden;transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1);}
.hist-body.open{max-height:4000px;}
.hist-content{padding:0 12px 12px;}
.hist-js{display:none;}
</style>
</head>
<body>

<div class="header">
  <div class="header-brand">Lisandro Bustos <span>·</span></div>
  <div class="header-sub">Entrenamiento Personalizado</div>
  <div class="header-divider"></div>
  <div class="header-athlete-name">${alumno}</div>
  <div class="header-session" id="sesLabel">${current.semName.replace('_',' ')}</div>
</div>
<div class="prog-wrap">
  <div class="prog-track" style="margin-top:8px">
    <div class="prog-fill" id="progFill"></div>
  </div>
</div>
<div class="tabs-wrap">
  ${currentDayTabs}
  <button class="btn-theme" id="btnTheme" onclick="toggleTheme()">☀️ Claro</button>
</div>

<div class="content">
  ${currentDayPages}
  <div class="done-screen" id="doneScreen">
    <div class="done-icon">🏆</div>
    <div class="done-title">¡Sesión completa!</div>
    <div class="done-sub">¡Excelente trabajo, ${alumnoCorto}!</div>
  </div>
</div>

${historyHTML}

<div class="t-overlay" id="tOverlay">
  <div class="t-modal">
    <div class="t-lbl">Tiempo de descanso</div>
    <div class="t-name" id="tName">—</div>
    <div class="t-digs" id="tDigs">01:30</div>
    <div class="t-btns">
      <button class="btn-tc btn-tc-skip" onclick="skipTimer()">⚡ Saltar</button>
      <button class="btn-tc btn-tc-close" onclick="closeTimer()">Cerrar</button>
    </div>
  </div>
</div>
<div class="fin-bar">
  <button class="btn-fin" id="btnFin" onclick="finishSession()">Finalizar sesión</button>
</div>

<script>
// ── CURRENT ROUTINE DATA ──
${routineToJS(current.routine, 'routine')}
const DAY_LABELS   = ${JSON.stringify(current.dayLabels)};
const ALUMNO_SLUG  = '${alumnoSlug}';
const SEMANA_KEY   = '${current.semName}';
const KEY          = 'train_' + ALUMNO_SLUG + '_' + SEMANA_KEY;

// ── SHARED STATE ──
let curDay=1, timerIv=null, timerS=0;
const done=new Set();

function ls(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
function ps(p){try{localStorage.setItem(KEY,JSON.stringify({...ls(),...p}));}catch(e){}}

// ── CARD BUILDER ──
${CARD_JS}

// ── RENDER ──
function render(day){
  const d=routine[day];
  if(!d)return;
  document.getElementById('c-d'+day+'-w').innerHTML=d.w.map(e=>card(e,true)).join('');
  document.getElementById('c-d'+day+'-m').innerHTML=d.m.map(e=>card(e,false)).join('');
}
function allIds(d){return[...routine[d].w,...routine[d].m].map(e=>e.id);}
function updProg(){
  const ids=allIds(curDay);
  const n=ids.filter(id=>done.has(id)).length;
  document.getElementById('progFill').style.width=(ids.length?n/ids.length*100:0)+'%';
}

// ── INTERACTIONS ──
function toggle(id){
  const b=document.getElementById('body-'+id);
  if(!b)return;
  const wasOpen=b.classList.contains('open');
  document.querySelectorAll('.ex-body.open').forEach(x=>x.classList.remove('open'));
  if(!wasOpen)b.classList.add('open');
}
function chkToggle(id){
  const chk=document.getElementById('chk-'+id);
  const crd=document.getElementById('card-'+id);
  const wasDone=done.has(id);
  if(wasDone){done.delete(id);chk.classList.remove('checked');chk.textContent='';crd.classList.remove('done-card');}
  else{done.add(id);chk.classList.add('checked');chk.textContent='✓';crd.classList.add('done-card');saveReg(id);}
  const ex=ls()[id]||{};ps({[id]:{...ex,done:!wasDone}});updProg();
}
function markDirty(id){['rs','rr','rc','rf','rn'].forEach(p=>{const el=document.getElementById(p+'-'+id);if(el)el.classList.toggle('has-value',!!el.value);});}
function saveReg(id){
  const d={
    series:document.getElementById('rs-'+id)?.value||'',
    reps:document.getElementById('rr-'+id)?.value||'',
    carga:document.getElementById('rc-'+id)?.value||'',
    feeling:document.getElementById('rf-'+id)?.value||'',
    comments:document.getElementById('rn-'+id)?.value||'',
    savedAt:new Date().toISOString(),done:done.has(id)
  };
  ps({[id]:d});
  const dot=document.getElementById('dot-'+id);if(dot)dot.classList.add('visible');
  const fb=document.getElementById('sfb-'+id);if(fb){fb.textContent='✓ Guardado';setTimeout(()=>fb.textContent='',2200);}
}

// ── TIMER ──
function startTmr(s,name){if(timerIv)clearInterval(timerIv);timerS=s;document.getElementById('tName').textContent=name;updTmr();document.getElementById('tOverlay').classList.add('open');timerIv=setInterval(()=>{timerS--;updTmr();if(timerS<=0)skipTimer();},1000);}
function updTmr(){const m=String(Math.floor(timerS/60)).padStart(2,'0');const s=String(timerS%60).padStart(2,'0');const el=document.getElementById('tDigs');el.textContent=m+':'+s;el.classList.toggle('urgent',timerS<=10&&timerS>0);}
function skipTimer(){clearInterval(timerIv);document.getElementById('tOverlay').classList.remove('open');}
function closeTimer(){clearInterval(timerIv);document.getElementById('tOverlay').classList.remove('open');}

// ── DAY SWITCH ──
function switchDay(day){
  curDay=day;
  document.querySelectorAll('.day-pg').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('[data-day]').forEach(t=>t.classList.remove('active'));
  document.getElementById('day'+day).classList.add('active');
  document.getElementById('doneScreen').classList.remove('show');
  document.querySelector('[data-day="'+day+'"]').classList.add('active');
  document.getElementById('sesLabel').textContent=DAY_LABELS[day];
  document.getElementById('btnFin').disabled=false;
  updProg();
}

// ── FINISH ──
function finishSession(){
  allIds(curDay).forEach(id=>{if(!done.has(id))chkToggle(id);});
  document.getElementById('day'+curDay).classList.remove('active');
  document.getElementById('doneScreen').classList.add('show');
  document.getElementById('btnFin').disabled=true;
  ps({['fin_d'+curDay]:new Date().toISOString()});
}

// ── THEME ──
function toggleTheme(){
  const isDark=document.body.classList.toggle('dark');
  const btn=document.getElementById('btnTheme');
  btn.textContent=isDark?'☀️ Claro':'🌑 Oscuro';
  try{localStorage.setItem('train_theme',isDark?'dark':'light');}catch(e){}
}
(function(){
  try{const s=localStorage.getItem('train_theme');if(s==='dark')document.body.classList.add('dark');}catch(e){}
})();

// ── HISTORY ACORDEÓN ──
function toggleHist(hi){
  const body=document.getElementById('hbody-'+hi);
  const chev=document.getElementById('hchev-'+hi);
  const isOpen=body.classList.contains('open');
  body.classList.toggle('open',!isOpen);
  chev.classList.toggle('open',!isOpen);
  // Lazy-render history exercises on first open
  if(!isOpen&&!body.dataset.rendered){
    body.dataset.rendered='1';
    renderHistory(hi);
  }
}
function renderHistory(hi){
  const jsEl=document.querySelector('.hist-js[data-hi="'+hi+'"]');
  if(!jsEl)return;
  const hRoutine=JSON.parse(jsEl.dataset.routine);
  const semKey=jsEl.dataset.semkey;
  const hKey='train_'+ALUMNO_SLUG+'_'+semKey;
  const hSaved=()=>{try{return JSON.parse(localStorage.getItem(hKey)||'{}');}catch(e){return{};}};
  // Render each day
  Object.keys(hRoutine).forEach(dayNum=>{
    const d=hRoutine[dayNum];
    const wEl=document.getElementById('h'+hi+'_c-d'+dayNum+'-w');
    const mEl=document.getElementById('h'+hi+'_c-d'+dayNum+'-m');
    if(wEl)wEl.innerHTML=d.w.map(e=>cardReadonly(e,hSaved())).join('');
    if(mEl)mEl.innerHTML=d.m.map(e=>cardReadonly(e,hSaved())).join('');
  });
}
function switchHDay(hi,day){
  // Hide all day-pg inside this hist-body
  const body=document.getElementById('hbody-'+hi);
  body.querySelectorAll('.day-pg').forEach(p=>p.classList.remove('active'));
  body.querySelectorAll('[data-hday]').forEach(t=>t.classList.remove('active'));
  const pg=document.getElementById('h'+hi+'_day'+day);
  if(pg)pg.classList.add('active');
  const tb=body.querySelector('[data-hday="'+hi+'_'+day+'"]');
  if(tb)tb.classList.add('active');
}
// Read-only card for history (shows saved data, no editing)
function cardReadonly(e,saved){
  const sv=saved[e.id]||{};
  const isDone=!!sv.done;
  const lastSeries=getLastSeries(e.bdg);
  const hint=lastSeries?'<div class="inline-reg-hint">últimas series: <strong>'+lastSeries+'</strong></div>':'';
  const regBlock=(!e.bdg.includes('rep x 2')||e.se)?
    '<div class="inline-reg" style="opacity:'+(isDone?'1':'0.45')+'">'+
      '<div class="inline-reg-lbl">Registro guardado</div>'+hint+
      '<div class="inline-reg-row">'+
        '<div class="ireg-f"><label>Series</label><input type="number" value="'+(sv.series||'')+'" placeholder="—" disabled></div>'+
        '<div class="ireg-f"><label>Reps</label><input type="number" value="'+(sv.reps||'')+'" placeholder="—" disabled></div>'+
        '<div class="ireg-f"><label>Carga</label><input type="text" value="'+(sv.carga||'')+'" placeholder="—" disabled></div>'+
      '</div>'+
      (sv.comments?'<div class="ireg-f" style="margin-top:4px"><label>Comentarios</label><input type="text" value="'+(sv.comments||'')+'" disabled></div>':'')+
    '</div>':'';
  return '<div class="ex-card '+(isDone?'done-card':'')+'">'+
    '<div class="ex-row" style="cursor:default">'+
      '<div class="ex-num">'+e.n+'</div>'+
      '<div class="ex-info">'+
        '<div class="ex-name">'+e.nm+'</div>'+
        '<div><span class="ex-badge">'+e.bdg+'</span>'+(isDone?'<span class="reg-saved-dot visible"></span>':'')+' </div>'+
        '<div class="ex-pause">Pausa: '+e.pa+'</div>'+
        regBlock+
      '</div>'+
      '<div class="ex-right">'+
        '<a href="'+e.yt+'" target="_blank" rel="noopener" class="btn-vid">Ver video</a>'+
        '<div class="ex-chk '+(isDone?'checked':'')+'" style="pointer-events:none">'+(isDone?'✓':'')+'</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

// ── INIT ──
const _sv=ls();Object.keys(_sv).forEach(k=>{if(_sv[k].done)done.add(k);});
Object.keys(routine).forEach(d=>render(parseInt(d)));
updProg();
(function(){
  const btn=document.getElementById('btnTheme');if(!btn)return;
  btn.textContent=document.body.classList.contains('dark')?'☀️ Claro':'🌑 Oscuro';
})();
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────
//  CSS (shared between generator and student pages)
// ─────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --body-bg:#f4f6f3;--card-bg:#ffffff;--card-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 8px rgba(0,0,0,0.04);
    --sec-lbl:#7a8f7a;--badge-bg:#d1fae5;--badge-color:#14532d;--pause-color:#999;--ireg-border:#ebebeb;
    --ireg-lbl:#aaa;--ireg-hint:#9aaa9a;--ireg-field-lbl:#bbb;--ireg-in-bg:#f8faf8;--ireg-in-border:#e8e8e8;
    --ireg-in-color:#1a1a1a;--ireg-has-bg:#f0fdf4;--ireg-has-border:#86efac;--ireg-focus:#22c55e;
    --save-bg:#15803d;--save-fb:#15803d;--dot-color:#22c55e;--chk-bg:#22c55e;--chk-border-done:#22c55e;
    --chk-border:#ccc;--vid-bg:#166634;--expand-bg:#f1f5f1;--expand-border:#eee;--tmr-bg:#fff;
    --tmr-border:#d1e8d1;--tmr-color:#2d5a2d;--nota-bg:#fff;--nota-border:#ddeedd;
    --fin-bar-bg:#ffffff;--fin-bar-border:rgba(0,0,0,0.08);--fin-btn-bg:#15803d;--fin-btn-color:#fff;
    --done-color:#15803d;--done-sub:#555;--tab-inactive:#6b7c6b;--tab-active-bg:#22c55e;
    --tab-active-color:#111511;--prog-fill:#22c55e;--prog-track:rgba(0,0,0,0.08);
  }
  body.dark {
    --body-bg:#1a1f1a;--card-bg:#ffffff;--card-shadow:none;--sec-lbl:#888;--badge-bg:#dcfce7;
    --badge-color:#166534;--pause-color:#999;--ireg-border:#f0f0f0;--ireg-lbl:#aaa;--ireg-hint:#bbb;
    --ireg-field-lbl:#bbb;--ireg-in-bg:#fafafa;--ireg-in-border:#e8e8e8;--ireg-in-color:#222;
    --ireg-has-bg:#f0fdf4;--ireg-has-border:#bbf7d0;--ireg-focus:#4ade80;--save-bg:#1a1a1a;
    --save-fb:#16a34a;--dot-color:#4ade80;--chk-bg:#4ade80;--chk-border-done:#4ade80;--chk-border:#ccc;
    --vid-bg:#1a1a1a;--expand-bg:#f7f7f7;--expand-border:#eee;--tmr-bg:#fff;--tmr-border:#e5e7eb;
    --tmr-color:#444;--nota-bg:#fff;--nota-border:#eee;--fin-bar-bg:#2a2f2a;
    --fin-bar-border:rgba(255,255,255,0.07);--fin-btn-bg:#4ade80;--fin-btn-color:#111511;
    --done-color:#4ade80;--done-sub:#aaa;--tab-inactive:#888;--tab-active-bg:#4ade80;
    --tab-active-color:#111511;--prog-fill:#4ade80;--prog-track:rgba(255,255,255,0.08);
  }
  body{background:var(--body-bg);font-family:'Inter',sans-serif;min-height:100vh;color:#1a1a1a;transition:background .3s ease;}
  .header{background:linear-gradient(160deg,#1e2d1e 0%,#162216 100%);text-align:center;padding:20px 16px 16px;border-bottom:1px solid rgba(74,222,128,.15);position:relative;overflow:hidden;}
  .header::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(74,222,128,.09) 0%,transparent 65%);pointer-events:none;}
  .header-brand{font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fff;line-height:1.2;margin-bottom:2px;}
  .header-brand span{color:#4ade80;}
  .header-sub{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:10px;}
  .header-divider{width:28px;height:1px;background:rgba(74,222,128,.3);margin:0 auto 10px;}
  .header-athlete-name{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:1px;}
  .header-session{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.22);}
  .prog-wrap{background:#162216;padding:8px 16px 12px;transition:background .3s;}
  .prog-track{background:var(--prog-track);border-radius:99px;height:3px;overflow:hidden;}
  .prog-fill{height:100%;background:var(--prog-fill);border-radius:99px;transition:width .5s ease;width:0%;}
  .tabs-wrap{background:#162216;display:flex;gap:8px;padding:10px 16px 14px;border-bottom:1px solid rgba(74,222,128,.08);transition:background .3s;}
  .tab{padding:6px 18px;border-radius:99px;font-size:13px;font-weight:500;cursor:pointer;color:var(--tab-inactive);background:transparent;border:none;font-family:'Inter',sans-serif;transition:all .2s;}
  .tab.active{background:var(--tab-active-bg);color:var(--tab-active-color);font-weight:600;}
  .btn-theme{margin-left:auto;flex-shrink:0;padding:5px 13px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);font-family:'Inter',sans-serif;transition:all .2s;white-space:nowrap;}
  body:not(.dark) .btn-theme{border:1px solid rgba(0,0,0,.12);background:rgba(0,0,0,.04);color:rgba(0,0,0,.55);}
  body:not(.dark) .prog-wrap{background:#f0f5f0;border-bottom:1px solid rgba(0,0,0,.05);}
  body:not(.dark) .tabs-wrap{background:#f0f5f0;border-bottom:1px solid rgba(0,0,0,.07);}
  .content{max-width:720px;margin:0 auto;padding:18px 12px 96px;}
  .sec-label{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--sec-lbl);padding:4px 0 10px;margin-top:4px;}
  .ex-card{background:var(--card-bg);border-radius:12px;margin-bottom:8px;overflow:hidden;box-shadow:var(--card-shadow);}
  .ex-card.done-card .ex-row{opacity:.55;}
  .ex-row{display:flex;align-items:flex-start;gap:10px;padding:13px 14px;cursor:pointer;}
  .ex-num{font-size:13px;font-weight:600;color:#1a1a1a;flex-shrink:0;padding-top:1px;min-width:24px;}
  .ex-info{flex:1;min-width:0;}
  .ex-name{font-size:14px;font-weight:500;color:#1a1a1a;line-height:1.3;margin-bottom:5px;}
  .ex-badge{display:inline-block;background:var(--badge-bg);color:var(--badge-color);font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:4px;}
  .ex-pause{font-size:11px;color:var(--pause-color);margin-top:2px;}
  .inline-reg{margin-top:10px;padding-top:10px;border-top:1px solid var(--ireg-border);}
  .inline-reg-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ireg-lbl);margin-bottom:2px;}
  .inline-reg-hint{font-size:10px;font-weight:400;color:var(--ireg-hint);margin-bottom:8px;line-height:1.4;font-style:italic;text-transform:none;letter-spacing:0;}
  .inline-reg-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px;}
  .inline-reg-row.two-col{grid-template-columns:1fr 1fr;}
  .ireg-f{display:flex;flex-direction:column;gap:3px;}
  .ireg-f label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--ireg-field-lbl);}
  .ireg-f input,.ireg-f textarea{border:1px solid var(--ireg-in-border);border-radius:7px;padding:7px 9px;font-size:13px;font-family:'Inter',sans-serif;color:var(--ireg-in-color);background:var(--ireg-in-bg);outline:none;resize:none;transition:border-color .15s,background .15s;width:100%;}
  .ireg-f input:focus,.ireg-f textarea:focus{border-color:var(--ireg-focus);background:#fff;}
  .ireg-f input.has-value{background:var(--ireg-has-bg);border-color:var(--ireg-has-border);}
  .ireg-f input:disabled{opacity:.7;cursor:default;}
  .ireg-full{grid-column:1/-1;}
  .btn-ireg-save{width:100%;background:var(--save-bg);color:#fff;border:none;border-radius:7px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity .15s;margin-top:2px;display:flex;align-items:center;justify-content:center;gap:5px;}
  .btn-ireg-save:hover{opacity:.8;}
  .ireg-fb{font-size:11px;color:var(--save-fb);text-align:center;height:16px;margin-top:4px;}
  .reg-saved-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dot-color);margin-left:5px;vertical-align:middle;opacity:0;transition:opacity .3s;}
  .reg-saved-dot.visible{opacity:1;}
  .ex-right{display:flex;align-items:flex-start;gap:8px;flex-shrink:0;padding-top:1px;}
  .btn-vid{background:var(--vid-bg);color:#fff;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:7px 11px;border-radius:8px;text-decoration:none;white-space:nowrap;display:inline-block;transition:opacity .15s;}
  .btn-vid:hover{opacity:.78;}
  .ex-chk{width:22px;height:22px;border-radius:50%;border:2px solid var(--chk-border);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:transparent;transition:all .2s;}
  .ex-chk.checked{background:var(--chk-bg);border-color:var(--chk-border-done);color:#fff;}
  .ex-body{max-height:0;overflow:hidden;transition:max-height .3s ease;background:var(--expand-bg);}
  .ex-body.open{max-height:200px;border-top:1px solid var(--expand-border);}
  .ex-body-in{padding:12px 14px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .btn-tmr{display:inline-flex;align-items:center;gap:5px;background:var(--tmr-bg);border:1px solid var(--tmr-border);color:var(--tmr-color);font-size:12px;font-weight:500;padding:7px 12px;border-radius:7px;cursor:pointer;font-family:'Inter',sans-serif;}
  .ex-nota-expand{font-size:11px;color:#666;line-height:1.5;background:var(--nota-bg);border:1px solid var(--nota-border);border-radius:7px;padding:8px 10px;width:100%;}
  .t-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:200;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(5px);}
  .t-overlay.open{opacity:1;pointer-events:all;}
  .t-modal{background:#fff;border-radius:20px;padding:36px 48px;text-align:center;width:min(320px,90vw);transform:scale(.9);transition:transform .2s;}
  .t-overlay.open .t-modal{transform:scale(1);}
  .t-lbl{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:5px;}
  .t-name{font-size:13px;color:#444;margin-bottom:14px;font-weight:500;}
  .t-digs{font-size:72px;font-weight:700;line-height:1;color:#1a1a1a;letter-spacing:2px;margin-bottom:22px;font-variant-numeric:tabular-nums;}
  .t-digs.urgent{color:#ef4444;}
  .t-btns{display:flex;gap:8px;}
  .btn-tc{flex:1;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
  .btn-tc-skip{background:var(--fin-btn-bg);color:var(--fin-btn-color);}
  .btn-tc-close{background:#f3f4f6;color:#555;}
  .fin-bar{position:fixed;bottom:0;left:0;right:0;background:var(--fin-bar-bg);border-top:1px solid var(--fin-bar-border);padding:10px 16px 14px;z-index:90;}
  .btn-fin{width:100%;background:var(--fin-btn-bg);color:var(--fin-btn-color);border:none;border-radius:8px;padding:14px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity .15s;}
  .btn-fin:disabled{opacity:.3;cursor:default;}
  .done-screen{display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 20px;}
  .done-screen.show{display:flex;}
  .done-icon{font-size:60px;margin-bottom:18px;}
  .done-title{font-size:24px;font-weight:700;color:var(--done-color);margin-bottom:8px;}
  .done-sub{font-size:14px;color:var(--done-sub);max-width:260px;line-height:1.6;}
  .day-pg{display:none;}
  .day-pg.active{display:block;}
`;

// ─────────────────────────────────────────────────────────
//  MAIN — process all Excel files
// ─────────────────────────────────────────────────────────
function main() {
  console.log(c.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(c.bold('  LISANDRO BUSTOS — Generador de Rutinas'));
  console.log(c.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (!fs.existsSync(CONFIG.alumnosDir)) {
    console.error(c.red('❌ No existe la carpeta /alumnos'));
    process.exit(1);
  }

  const xlsxFiles = fs.readdirSync(CONFIG.alumnosDir)
    .filter(f => f.match(/\.xlsx?$/i) && !f.startsWith('~'));

  if (!xlsxFiles.length) {
    console.error(c.red('❌ No hay archivos .xlsx en /alumnos'));
    process.exit(1);
  }

  console.log(c.cyan(`📂 Encontré ${xlsxFiles.length} archivo(s) en /alumnos:\n`));

  if (!fs.existsSync(CONFIG.docsDir)) fs.mkdirSync(CONFIG.docsDir, { recursive: true });

  const links = [];

  xlsxFiles.forEach(file => {
    const filePath = path.join(CONFIG.alumnosDir, file);
    console.log(c.yellow(`  📊 Procesando: ${file}`));

    try {
      const { ejRows, semanas, semanaNames, alumnos } = parseWorkbook(filePath);

      alumnos.forEach(alumno => {
        const slug    = toSlug(alumno);
        const outDir  = path.join(CONFIG.docsDir, slug);
        const outFile = path.join(outDir, 'index.html');
        const url     = `${CONFIG.baseUrl}/${slug}`;

        fs.mkdirSync(outDir, { recursive: true });

        const html = buildHTML(alumno, semanaNames, semanas, ejRows);
        fs.writeFileSync(outFile, html, 'utf8');

        const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
        console.log(c.green(`     ✅ ${alumno} → /docs/${slug}/index.html (${sizeKB} KB)`));
        links.push({ alumno, url, slug });
      });

    } catch (err) {
      console.error(c.red(`     ❌ Error en ${file}: ${err.message}`));
    }
  });

  // ── Git commit + push ──
  console.log(c.cyan('\n📤 Publicando en GitHub/Netlify…\n'));
  try {
    execSync('git add docs/', { cwd: __dirname, stdio: 'pipe' });

    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const msg = `actualizar rutinas — ${timestamp}`;
    execSync(`git commit -m "${msg}"`, { cwd: __dirname, stdio: 'pipe' });
    execSync('git push', { cwd: __dirname, stdio: 'pipe' });
    console.log(c.green('  ✅ Push exitoso. Netlify publicará en ~30 segundos.\n'));
  } catch (err) {
    const msg = err.stdout?.toString() || err.message;
    if (msg.includes('nothing to commit')) {
      console.log(c.dim('  ℹ️  Sin cambios nuevos que publicar.\n'));
    } else {
      console.error(c.red(`  ❌ Error en git: ${msg}`));
    }
  }

  // ── Print links ──
  console.log(c.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(c.bold('  🔗 LINKS LISTOS PARA ENVIAR:\n'));
  links.forEach(({ alumno, url }) => {
    console.log(`  ${c.bold(alumno)}`);
    console.log(`  ${c.green(url)}\n`);
  });
  console.log(c.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

main();
