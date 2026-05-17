// popup.js — Gentle Browse v6 (CSP compliant — no inline styles or style tags)

const DEFAULT = {
  display_name:'Friend', avatar:'duck', theme:'sage',
  font_size:16, line_height:1.6, column_width:70, font_family:'lexend',
  left_align:true, off_white_bg:true, focus_mode:false, low_stim:false,
  reduce_clutter:false, chunk_mode:false, dyslexia_ruler:false,
  sensitivity:50, pomodoro_work:25, pomodoro_break:5, needs:[],
}

const THEMES = [
  {id:'sage',          sw:'#c4dcc6', label:'Sage'},
  {id:'parchment',     sw:'#d9cdb8', label:'Parchment'},
  {id:'sky',           sw:'#b4cce4', label:'Sky'},
  {id:'dark_moss',     sw:'#2a3e2a', label:'Dark moss'},
  {id:'dark_warm',     sw:'#3a2c20', label:'Dark warm'},
  {id:'high_contrast', sw:'#000000', label:'High contrast'},
]

const FEATURES = [
  { key:'focus_mode',     label:'Focus mode',      desc:'Dims the page around main content',      shortcut:'Alt+F' },
  { key:'low_stim',       label:'Low-stimulation', desc:'Blacks out images, stops animations',    shortcut:'Alt+L' },
  { key:'reduce_clutter', label:'Clear clutter',   desc:'Hides ads, sidebars, pop-ups',           shortcut:'Alt+C' },
  { key:'chunk_mode',     label:'Chunk content',   desc:'Numbers headings to break up pages',     shortcut:'Alt+K' },
  { key:'dyslexia_ruler', label:'Reading ruler',   desc:'A bar follows your mouse while reading', shortcut:'Alt+R' },
]

const SHORTCUTS = [
  ['Alt+F', 'Toggle focus mode'],
  ['Alt+L', 'Toggle low-stimulation'],
  ['Alt+C', 'Toggle clear clutter'],
  ['Alt+K', 'Toggle chunk content'],
  ['Alt+R', 'Toggle reading ruler'],
  ['Alt+T', 'Start / pause timer'],
  ['Alt+S', 'Summarize selected text'],
]

const LOAD_LABELS = { calm:'Calm', focused:'Focused', distracted:'Distracted', overwhelmed:'Overwhelmed' }
const LOAD_COLORS = { calm:'#6b9b6f', focused:'#4a7fa8', distracted:'#c8a46e', overwhelmed:'#c87a7a' }

let profile = {...DEFAULT}
let activeTab = 'features'
let pomPhase = 'idle'
let pomSeconds = 25 * 60
let pomRunning = false
let pomSessions = 0
let pomInterval = null
let loadState = 'calm'
let summarizing = false
let sumMode = 'tldr'

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const isExt = typeof chrome !== 'undefined' && chrome.storage
  if (isExt) {
    const r = await chrome.storage.sync.get('profile')
    if (r.profile) profile = {...DEFAULT, ...r.profile}
    const lr = await chrome.storage.local.get('loadState')
    if (lr.loadState) loadState = lr.loadState
  } else {
    const saved = localStorage.getItem('gb_profile')
    if (saved) profile = {...DEFAULT, ...JSON.parse(saved)}
  }
  document.documentElement.setAttribute('data-theme', profile.theme)
  render()
  setupKeyboard()
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
function setupKeyboard() {
  const keyMap = { f:'focus_mode', l:'low_stim', c:'reduce_clutter', k:'chunk_mode', r:'dyslexia_ruler' }
  document.addEventListener('keydown', async (e) => {
    if (!e.altKey) return
    const k = e.key.toLowerCase()
    if (keyMap[k]) {
      e.preventDefault()
      profile[keyMap[k]] = !profile[keyMap[k]]
      await save(); sendToPage(); render()
      toast(FEATURES.find(f => f.key === keyMap[k]).label, profile[keyMap[k]])
    }
    if (k === 't') { e.preventDefault(); pomRunning ? pomPause() : pomStart() }
    if (k === 's') { e.preventDefault(); activeTab = 'summarize'; render(); setTimeout(doSummarize, 100) }
  })
}

function toast(label, isOn) {
  const el = document.getElementById('gb-toast')
  if (el) el.remove()
  const t = document.createElement('div')
  t.id = 'gb-toast'
  t.className = 'toast'
  t.textContent = label + ': ' + (isOn ? 'on' : 'off')
  document.body.appendChild(t)
  setTimeout(() => t.classList.add('toast-hide'), 1400)
  setTimeout(() => t.remove(), 1800)
}

// ── Render ────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('root').innerHTML = buildHTML()
  document.documentElement.setAttribute('data-theme', profile.theme)
  attachEvents()
  updateSiteHost()
}

function buildHTML() {
  const lc = LOAD_COLORS[loadState]
  return `
    <div class="header">
      <div class="logo-wrap">
        <img src="icons/icon48.png" alt="Gentle Browse" class="logo-img"
          onerror="this.style.display='none'"/>
      </div>
      <div class="header-text">
        <div class="hname">Gentle Browse</div>
        <div class="hsite" id="site-host">Loading...</div>
      </div>
      <div class="load-pill load-${loadState}">${LOAD_LABELS[loadState]}</div>
    </div>

    <div class="tabs" role="tablist">
      ${['features','summarize','timer','text','theme','keys'].map(t =>
        `<button class="tab ${activeTab===t?'on':''}" data-tab="${t}" role="tab"
          aria-selected="${activeTab===t}">${t==='keys'?'Keys':t.charAt(0).toUpperCase()+t.slice(1)}</button>`
      ).join('')}
    </div>

    <div class="panel ${activeTab==='features'?'on':''}" role="tabpanel">
      <div class="qgrid">
        ${FEATURES.map(f => `
          <button class="qbtn ${profile[f.key]?'on':''}" data-feature="${f.key}"
            aria-pressed="${!!profile[f.key]}" aria-label="${f.label}">
            <div class="qlabel">${f.label}</div>
            <div class="qdesc">${f.desc}</div>
            <div class="qfooter">
              <span class="qstate">${profile[f.key]?'ON':'OFF'}</span>
              <span class="qshortcut">${f.shortcut}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="panel ${activeTab==='summarize'?'on':''}" role="tabpanel">
      <p class="panel-hint">Highlight text on the page, choose a format, then click summarize. Shortcut: Alt+S</p>
      <div class="mode-row">
        <button class="mode-btn ${sumMode==='tldr'?'mode-on':''}" data-mode="tldr">TL;DR</button>
        <button class="mode-btn ${sumMode==='simple'?'mode-on':''}" data-mode="simple">Plain English</button>
        <button class="mode-btn ${sumMode==='steps'?'mode-on':''}" data-mode="steps">Step by step</button>
      </div>
      <button class="sum-btn" id="sum-btn" ${summarizing?'disabled':''}>
        ${summarizing?'Reading...':'Summarize selected text'}
      </button>
      <div class="sum-result ${summarizing?'on':''}" id="sum-result">
        ${summarizing?'<div class="dot-loader"><span></span><span></span><span></span></div>':''}
      </div>
    </div>

    <div class="panel ${activeTab==='timer'?'on':''}" role="tabpanel">
      <p class="panel-hint">Shortcut: Alt+T to start/pause</p>
      <div class="timer-wrap">
        <div class="timer-phase timer-phase-${pomPhase}">
          ${pomPhase==='break'?'Break time':pomPhase==='work'?'Focus time':'Ready to focus?'}
        </div>
        <div class="timer-display" id="timer-display" aria-live="polite">${fmtTime(pomSeconds)}</div>
        <div class="timer-bar">
          <div class="timer-fill timer-fill-${pomPhase}" id="timer-fill" style="width:${timerPct()}%"></div>
        </div>
        <div class="timer-btns">
          ${!pomRunning
            ? `<button class="tbtn tbtn-primary" id="pom-start">${pomPhase==='idle'?'Start focusing':'Resume'}</button>`
            : `<button class="tbtn tbtn-ghost" id="pom-pause">Pause</button>`
          }
          <button class="tbtn tbtn-ghost" id="pom-skip">Skip</button>
          <button class="tbtn tbtn-ghost" id="pom-reset">Reset</button>
        </div>
        <div class="timer-sessions">${pomSessions} ${pomSessions===1?'session':'sessions'} today</div>
      </div>
    </div>

    <div class="panel ${activeTab==='text'?'on':''}" role="tabpanel">
      <div class="srow">
        <div class="srow-hdr"><span>Font size</span><span class="sval" id="fsv">${profile.font_size}px</span></div>
        <input type="range" id="fs-slider" min="14" max="26" step="1" value="${profile.font_size}" aria-label="Font size">
      </div>
      <div class="srow">
        <div class="srow-hdr"><span>Line spacing</span><span class="sval" id="lhv">${profile.line_height.toFixed(1)}</span></div>
        <input type="range" id="lh-slider" min="14" max="24" step="1" value="${Math.round(profile.line_height*10)}" aria-label="Line spacing">
      </div>
      <div class="srow srow-last">
        <div class="srow-hdr"><span>Column width</span><span class="sval" id="cwv">${profile.column_width} ch</span></div>
        <input type="range" id="cw-slider" min="40" max="90" step="5" value="${profile.column_width}" aria-label="Column width">
      </div>
    </div>

    <div class="panel ${activeTab==='theme'?'on':''}" role="tabpanel">
      <p class="panel-hint">Applies to this page immediately.</p>
      <div class="theme-dots">
        ${THEMES.map(t => `
          <div class="theme-dot-wrap">
            <button class="tdot ${profile.theme===t.id?'on':''}"
              data-theme-id="${t.id}"
              aria-pressed="${profile.theme===t.id}"
              aria-label="${t.label} theme"
              style="background-color:${t.sw}"></button>
            <span class="tdot-label">${t.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="theme-toggle-row">
        <span class="ttl">Low-stimulation</span>
        <label class="switch" aria-label="Low stimulation">
          <input type="checkbox" id="sw-ls" ${profile.low_stim?'checked':''} data-key="low_stim">
          <span class="track"></span>
        </label>
      </div>
    </div>

    <div class="panel ${activeTab==='keys'?'on':''}" role="tabpanel">
      <p class="panel-hint">Use these on any website. On Mac, use Option instead of Alt.</p>
      <div class="shortcuts-list">
        ${SHORTCUTS.map(([key, desc]) => `
          <div class="shortcut-row">
            <span class="shortcut-desc">${desc}</span>
            <kbd class="shortcut-key">${key}</kbd>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <span class="fbrand">Gentle Browse</span>
      <button class="flink" id="open-dash">Open dashboard</button>
    </div>
  `
}

// ── Events ────────────────────────────────────────────────────────────────
function attachEvents() {
  document.querySelectorAll('.tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render() })
  })
  document.querySelectorAll('.qbtn[data-feature]').forEach(btn => {
    btn.addEventListener('click', async () => {
      profile[btn.dataset.feature] = !profile[btn.dataset.feature]
      await save(); sendToPage(); render()
    })
  })
  document.querySelectorAll('.tdot[data-theme-id]').forEach(dot => {
    dot.addEventListener('click', async () => {
      profile.theme = dot.dataset.themeId
      document.documentElement.setAttribute('data-theme', profile.theme)
      await save(); sendToPage(); render()
    })
  })
  document.querySelectorAll('input[data-key]').forEach(inp => {
    inp.addEventListener('change', async () => {
      profile[inp.dataset.key] = inp.checked
      await save(); sendToPage()
    })
  })
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      sumMode = btn.dataset.mode
      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('mode-on', b.dataset.mode === sumMode)
      })
    })
  })
  document.getElementById('sum-btn')?.addEventListener('click', doSummarize)
  document.getElementById('fs-slider')?.addEventListener('input', async function() {
    profile.font_size = Number(this.value)
    document.getElementById('fsv').textContent = this.value + 'px'
    await save(); sendToPage()
  })
  document.getElementById('lh-slider')?.addEventListener('input', async function() {
    profile.line_height = Number(this.value) / 10
    document.getElementById('lhv').textContent = profile.line_height.toFixed(1)
    await save(); sendToPage()
  })
  document.getElementById('cw-slider')?.addEventListener('input', async function() {
    profile.column_width = Number(this.value)
    document.getElementById('cwv').textContent = this.value + ' ch'
    await save(); sendToPage()
  })
  document.getElementById('pom-start')?.addEventListener('click', pomStart)
  document.getElementById('pom-pause')?.addEventListener('click', pomPause)
  document.getElementById('pom-skip')?.addEventListener('click', pomSkip)
  document.getElementById('pom-reset')?.addEventListener('click', pomReset)
  document.getElementById('open-dash')?.addEventListener('click', openDash)
}

// ── Summarize ─────────────────────────────────────────────────────────────
async function doSummarize() {
  let selectedText = ''
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true})
    if (tab?.id) {
      try {
        const r = await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>window.getSelection()?.toString()||''})
        selectedText = r?.[0]?.result || ''
      } catch(e) {}
    }
  }
  const resultEl = document.getElementById('sum-result')
  if (!selectedText.trim()) {
    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = 'No text selected. Highlight some text on the page first, then click Summarize.' }
    return
  }
  summarizing = true
  const btn = document.getElementById('sum-btn')
  if (btn) btn.disabled = true
  if (resultEl) { resultEl.className = 'sum-result on'; resultEl.innerHTML = '<div class="dot-loader"><span></span><span></span><span></span></div>' }

  const prompts = {
    tldr:   `Summarize in 2-3 short plain English sentences. No jargon:\n\n${selectedText.slice(0,3000)}`,
    simple: `Rewrite simply. Max 15 words per sentence. Keep all key info:\n\n${selectedText.slice(0,3000)}`,
    steps:  `Break into 3-6 numbered steps with short headings:\n\n${selectedText.slice(0,3000)}`,
  }

  try {
    const stored = typeof chrome !== 'undefined' && chrome.storage ? await chrome.storage.sync.get('openai_key') : {}
    const openaiKey = stored?.openai_key || null
    let result = ''
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+openaiKey},
        body:JSON.stringify({model:'gpt-4o-mini',max_tokens:400,messages:[{role:'user',content:prompts[sumMode]}]})
      })
      const data = await res.json()
      result = data.choices?.[0]?.message?.content || 'No response from AI.'
    } else {
      const sentences = selectedText.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+/g) || []
      if (sumMode === 'tldr') result = sentences.slice(0,3).join(' ').trim() || selectedText.slice(0,200)
      else if (sumMode === 'steps') result = sentences.slice(0,6).map((s,i)=>`${i+1}. ${s.trim()}`).join('\n')
      else result = sentences.slice(0,5).join(' ').trim()
      result += '\n\n(Add an OpenAI key for AI summaries — see dashboard settings)'
    }
    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = result }
  } catch(e) {
    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = 'Could not connect. Check your internet.' }
  } finally {
    summarizing = false
    if (btn) btn.disabled = false
  }
}

// ── Pomodoro ──────────────────────────────────────────────────────────────
function pomStart() {
  if (pomPhase==='idle') { pomPhase='work'; pomSeconds=(profile.pomodoro_work||25)*60 }
  pomRunning = true
  clearInterval(pomInterval)
  pomInterval = setInterval(() => {
    pomSeconds--
    const d = document.getElementById('timer-display')
    const f = document.getElementById('timer-fill')
    if (d) d.textContent = fmtTime(pomSeconds)
    if (f) f.style.width = timerPct() + '%'
    if (pomSeconds<=0) {
      if (pomPhase==='work') { pomSessions++; pomPhase='break'; pomSeconds=(profile.pomodoro_break||5)*60 }
      else { pomPhase='work'; pomSeconds=(profile.pomodoro_work||25)*60 }
      render()
    }
  }, 1000)
  render()
}
function pomPause() { pomRunning=false; clearInterval(pomInterval); render() }
function pomReset() { pomRunning=false; clearInterval(pomInterval); pomPhase='idle'; pomSeconds=(profile.pomodoro_work||25)*60; render() }
function pomSkip() {
  clearInterval(pomInterval)
  if (pomPhase==='work') { pomSessions++; pomPhase='break'; pomSeconds=(profile.pomodoro_break||5)*60 }
  else { pomPhase='work'; pomSeconds=(profile.pomodoro_work||25)*60 }
  if (pomRunning) pomStart(); else render()
}
function fmtTime(s) { return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0') }
function timerPct() {
  const total = pomPhase==='work'?(profile.pomodoro_work||25)*60:(profile.pomodoro_break||5)*60
  return pomPhase==='idle'?0:Math.round((1-pomSeconds/total)*100)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function openDash() {
  const url = 'https://adaptive-841pp8vsf-purplepony17s-projects.vercel.app'
  if (typeof chrome!=='undefined'&&chrome.tabs) chrome.tabs.create({url})
  else window.open(url,'_blank')
}
async function save() {
  if (typeof chrome!=='undefined'&&chrome.storage) await chrome.storage.sync.set({profile})
  else localStorage.setItem('gb_profile',JSON.stringify(profile))
}
function sendToPage() {
  if (typeof chrome==='undefined'||!chrome.tabs) return
  chrome.tabs.query({active:true,currentWindow:true},([tab])=>{
    if (!tab?.id) return
    chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']})
      .then(()=>chrome.scripting.insertCSS({target:{tabId:tab.id},files:['content.css']})
        .then(()=>chrome.tabs.sendMessage(tab.id,{type:'GB_UPDATE',profile}))
      ).catch(e=>console.log('GB:',e))
  })
}
function updateSiteHost() {
  if (typeof chrome!=='undefined'&&chrome.tabs) {
    chrome.tabs.query({active:true,currentWindow:true},tabs=>{
      try { const el=document.getElementById('site-host'); if(el) el.textContent=new URL(tabs[0].url).hostname } catch(_){}
    })
  }
}

init()
