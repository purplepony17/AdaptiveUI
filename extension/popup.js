// popup.js — Gentle Browse extension popup

const DEFAULT = {
  display_name:'Friend',avatar:'duck',theme:'sage',
  font_size:16,line_height:1.6,column_width:70,font_family:'lexend',
  left_align:true,off_white_bg:true,focus_mode:false,low_stim:false,
  reduce_clutter:false,chunk_mode:false,laser_cursor:false,
  dyslexia_ruler:false,auto_adapt:true,sensitivity:50,
  pomodoro_work:25,pomodoro_break:5,needs:[],
}

const THEMES=[
  {id:'sage',sw:'#c4dcc6'},{id:'parchment',sw:'#d9cdb8'},
  {id:'sky',sw:'#b4cce4'},{id:'dark_moss',sw:'#2a3e2a'},
  {id:'dark_warm',sw:'#3a2c20'},{id:'high_contrast',sw:'#000'},
]

const LOAD_LABELS={ calm:'🌱 Calm', focused:'🎯 Focused', distracted:'🍃 Distracted', overwhelmed:'🌊 Overwhelmed' }
const LOAD_COLORS={ calm:'#6b9b6f', focused:'#4a7fa8', distracted:'#c8a46e', overwhelmed:'#c87a7a' }

let profile = {...DEFAULT}
let activeTab = 'quick'
let pomPhase = 'idle'
let pomSeconds = 25 * 60
let pomRunning = false
let pomSessions = 0
let pomInterval = null
let loadState = 'calm'

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const storage = typeof chrome !== 'undefined' && chrome.storage
  if (storage) {
    const r = await chrome.storage.sync.get('profile')
    if (r.profile) profile = {...DEFAULT, ...r.profile}
  } else {
    const saved = localStorage.getItem('gb_profile')
    if (saved) profile = {...DEFAULT, ...JSON.parse(saved)}
  }
  document.documentElement.setAttribute('data-theme', profile.theme)
  render()
  startLoadMonitor()
}

// ── Render ────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('root').innerHTML = `
    <div class="header">
      <span class="logo">🌱</span>
      <div>
        <div class="hname">Gentle Browse</div>
        <div class="hsite" id="site-host">Loading...</div>
      </div>
      <div class="load-pill" id="load-pill" style="background:${LOAD_COLORS[loadState]}20;color:${LOAD_COLORS[loadState]};border:1px solid ${LOAD_COLORS[loadState]}40">
        ${LOAD_LABELS[loadState]}
      </div>
    </div>

    <div class="tabs">
      <button class="tab ${activeTab==='quick'?'on':''}" onclick="switchTab('quick')">Features</button>
      <button class="tab ${activeTab==='timer'?'on':''}" onclick="switchTab('timer')">Timer</button>
      <button class="tab ${activeTab==='text'?'on':''}" onclick="switchTab('text')">Text</button>
      <button class="tab ${activeTab==='theme'?'on':''}" onclick="switchTab('theme')">Theme</button>
    </div>

    <!-- Features panel -->
    <div class="panel ${activeTab==='quick'?'on':''}" id="panel-quick">
      <div class="qgrid">
        ${qbtn('focus_mode','Focus mode')}
        ${qbtn('low_stim','Low-stim')}
        ${qbtn('reduce_clutter','Clear clutter')}
        ${qbtn('chunk_mode','Chunk it')}
        ${qbtn('laser_cursor','Laser cursor')}
        ${qbtn('dyslexia_ruler','Read ruler')}
      </div>
    </div>

    <!-- Timer panel -->
    <div class="panel ${activeTab==='timer'?'on':''}" id="panel-timer">
      <div class="timer-wrap">
        <div class="timer-phase">${pomPhase==='break'?'Break time':pomPhase==='work'?'Focus time':'Ready?'}</div>
        <div class="timer-display" id="timer-display">${fmtTime(pomSeconds)}</div>
        <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="width:${timerProgress()}%"></div></div>
        <div class="timer-btns">
          ${!pomRunning
            ? `<button class="tbtn tbtn-primary" onclick="pomStart()">${pomPhase==='idle'?'Start':'Resume'}</button>`
            : `<button class="tbtn tbtn-ghost" onclick="pomPause()">Pause</button>`
          }
          <button class="tbtn tbtn-ghost" onclick="pomSkip()">Skip</button>
          <button class="tbtn tbtn-ghost" onclick="pomReset()">Reset</button>
        </div>
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text-soft)">${pomSessions} sessions completed</div>
    </div>

    <!-- Text panel -->
    <div class="panel ${activeTab==='text'?'on':''}" id="panel-text">
      <div class="srow">
        <div class="srow-hdr"><span>Font size</span><span class="sval" id="fsv">${profile.font_size}px</span></div>
        <input type="range" min="14" max="24" step="1" value="${profile.font_size}" oninput="updateVal('font_size',+this.value,'fsv','px')">
      </div>
      <div class="srow">
        <div class="srow-hdr"><span>Line spacing</span><span class="sval" id="lhv">${profile.line_height.toFixed(1)}</span></div>
        <input type="range" min="14" max="22" step="1" value="${Math.round(profile.line_height*10)}" oninput="updateLH(+this.value)">
      </div>
      <div class="trow"><span class="tl">Left-align text</span>${sw('left_align')}</div>
      <div class="trow"><span class="tl">Off-white background</span>${sw('off_white_bg')}</div>
    </div>

    <!-- Theme panel -->
    <div class="panel ${activeTab==='theme'?'on':''}" id="panel-theme">
      <div class="tdots" style="margin-top:8px;flex-wrap:wrap;gap:8px">
        ${THEMES.map(t=>`<button class="tdot ${profile.theme===t.id?'on':''}" style="background:${t.sw};width:28px;height:28px" onclick="setTheme('${t.id}')" title="${t.id}"></button>`).join('')}
      </div>
      <div class="trow"><span class="tl">Auto-adapt</span>${sw('auto_adapt')}</div>
      <div class="trow"><span class="tl">Low-stim mode</span>${sw('low_stim')}</div>
    </div>

    <div class="footer">
      <span class="fbrand">Gentle Browse</span>
      <button class="flink" onclick="openDash()">Open dashboard</button>
    </div>
  `

  // Get current site
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({active:true,currentWindow:true}, tabs => {
      try { document.getElementById('site-host').textContent = new URL(tabs[0].url).hostname } catch(_){}
    })
  } else {
    document.getElementById('site-host').textContent = 'example.com'
  }
}

function qbtn(key, label) {
  const on = profile[key]
  return `<button class="qbtn ${on?'on':''}" onclick="toggleFeature('${key}')">
    <div class="qlabel">${label}</div>
    <div class="qstate">${on?'On':'Off'}</div>
  </button>`
}

function sw(key) {
  return `<label class="switch">
    <input type="checkbox" ${profile[key]?'checked':''} onchange="toggleFeature('${key}')">
    <span class="track"></span>
  </label>`
}

function fmtTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

function timerProgress() {
  if (pomPhase==='work') return Math.round((1 - pomSeconds/(profile.pomodoro_work*60))*100)
  if (pomPhase==='break') return Math.round((1 - pomSeconds/(profile.pomodoro_break*60))*100)
  return 0
}

// ── Events ────────────────────────────────────────────────────────────────
window.switchTab = function(id) { activeTab = id; render() }

window.toggleFeature = async function(key) {
  profile[key] = !profile[key]
  await save()
  sendToPage()
  render()
}

window.updateVal = function(key, val, displayId, unit) {
  profile[key] = val
  document.getElementById(displayId).textContent = val + unit
  save(); sendToPage()
}

window.updateLH = function(v) {
  profile.line_height = v / 10
  document.getElementById('lhv').textContent = (v/10).toFixed(1)
  save(); sendToPage()
}

window.setTheme = async function(id) {
  profile.theme = id
  document.documentElement.setAttribute('data-theme', id)
  await save(); sendToPage(); render()
}

// Pomodoro controls
window.pomStart = function() {
  if (pomPhase==='idle') { pomPhase='work'; pomSeconds=profile.pomodoro_work*60 }
  pomRunning = true
  clearInterval(pomInterval)
  pomInterval = setInterval(() => {
    pomSeconds--
    const d = document.getElementById('timer-display')
    const f = document.getElementById('timer-fill')
    if (d) d.textContent = fmtTime(pomSeconds)
    if (f) f.style.width = timerProgress() + '%'
    if (pomSeconds <= 0) {
      if (pomPhase==='work') { pomSessions++; pomPhase='break'; pomSeconds=profile.pomodoro_break*60 }
      else { pomPhase='work'; pomSeconds=profile.pomodoro_work*60 }
      render()
    }
  }, 1000)
  render()
}

window.pomPause = function() { pomRunning=false; clearInterval(pomInterval); render() }
window.pomReset = function() { pomRunning=false; clearInterval(pomInterval); pomPhase='idle'; pomSeconds=profile.pomodoro_work*60; render() }
window.pomSkip  = function() {
  clearInterval(pomInterval)
  if (pomPhase==='work') { pomSessions++; pomPhase='break'; pomSeconds=profile.pomodoro_break*60 }
  else { pomPhase='work'; pomSeconds=profile.pomodoro_work*60 }
  if (pomRunning) window.pomStart()
  else render()
}

window.openDash = function() {
  const url = 'https://adaptive-5olnpl9xm-purplepony17s-projects.vercel.app'
  if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({url})
  else window.open(url,'_blank')
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function save() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    await chrome.storage.sync.set({profile})
  } else {
    localStorage.setItem('gb_profile', JSON.stringify(profile))
  }
}

function sendToPage() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return
  chrome.tabs.query({active:true,currentWindow:true}, ([tab]) => {
    if (!tab?.id) return
    chrome.tabs.sendMessage(tab.id, {type:'GB_UPDATE', profile}).catch(()=>{
      chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']})
      chrome.scripting.insertCSS({target:{tabId:tab.id},files:['content.css']})
    })
  })
}

function startLoadMonitor() {
  // Simple load state check every 5s based on storage
  setInterval(async () => {
    const stored = await (typeof chrome!=='undefined'&&chrome.storage
      ? chrome.storage.local.get('loadState')
      : Promise.resolve({loadState:'calm'}))
    const newState = stored.loadState || 'calm'
    if (newState !== loadState) {
      loadState = newState
      const pill = document.getElementById('load-pill')
      if (pill) {
        pill.textContent = LOAD_LABELS[loadState]
        pill.style.background = LOAD_COLORS[loadState] + '20'
        pill.style.color = LOAD_COLORS[loadState]
        pill.style.border = `1px solid ${LOAD_COLORS[loadState]}40`
      }
    }
  }, 5000)
}

init()
