// popup.js — Gentle Browse v5
// Keyboard shortcuts, no health tab

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
  { key:'focus_mode',     label:'Focus mode',      desc:'Dims the page around main content',     shortcut:'Alt+F' },
  { key:'low_stim',       label:'Low-stimulation', desc:'Blacks out images, stops animations',   shortcut:'Alt+L' },
  { key:'reduce_clutter', label:'Clear clutter',   desc:'Hides ads, sidebars, pop-ups',          shortcut:'Alt+C' },
  { key:'chunk_mode',     label:'Chunk content',   desc:'Numbers headings to break up pages',    shortcut:'Alt+K' },
  { key:'dyslexia_ruler', label:'Reading ruler',   desc:'A bar follows your mouse while reading',shortcut:'Alt+R' },
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
let _sumMode = 'tldr'

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
  registerKeyboardShortcuts()
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
function registerKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    if (!e.altKey) return
    const map = {
      f: 'focus_mode',
      l: 'low_stim',
      c: 'reduce_clutter',
      k: 'chunk_mode',
      r: 'dyslexia_ruler',
    }
    const key = e.key.toLowerCase()
    if (map[key]) {
      e.preventDefault()
      profile[map[key]] = !profile[map[key]]
      await save()
      sendToPage()
      render()
      // Flash confirmation
      showShortcutToast(FEATURES.find(f => f.key === map[key])?.label, profile[map[key]])
    }
    // Alt+T = start/pause timer
    if (key === 't') {
      e.preventDefault()
      pomRunning ? pomPause() : pomStart()
    }
    // Alt+S = summarize
    if (key === 's') {
      e.preventDefault()
      activeTab = 'summarize'
      render()
      setTimeout(() => doSummarize(), 100)
    }
  })
}

function showShortcutToast(label, isOn) {
  const existing = document.getElementById('gb-toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.id = 'gb-toast'
  toast.style.cssText = `
    position:fixed;bottom:52px;left:50%;transform:translateX(-50%);
    background:var(--text);color:var(--cream);
    padding:6px 14px;border-radius:20px;font-size:11px;font-weight:500;
    white-space:nowrap;z-index:9999;pointer-events:none;
    animation:fadeup 0.15s ease;
  `
  toast.textContent = `${label}: ${isOn ? 'on' : 'off'}`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 1800)
}

// ── Render ────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('root').innerHTML = buildHTML()
  attachEvents()
  updateSiteHost()
}

function buildHTML() {
  const lc = LOAD_COLORS[loadState]
  return `
    <style>
      @keyframes fadeup { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    </style>

    <div class="header">
      <div class="logo-fallback">
        <img src="icons/icon48.png" alt="" width="28" height="28"
          style="border-radius:50%;object-fit:cover"
          onerror="this.parentElement.innerHTML='<span style=font-size:16px>🌱</span>'"/>
      </div>
      <div style="flex:1;min-width:0">
        <div class="hname">Gentle Browse</div>
        <div class="hsite" id="site-host">Loading...</div>
      </div>
      <div class="load-pill" style="background:${lc}18;color:${lc};border:1px solid ${lc}35">
        ${LOAD_LABELS[loadState]}
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab ${activeTab==='features'?'on':''}" data-tab="features" role="tab">Features</button>
      <button class="tab ${activeTab==='summarize'?'on':''}" data-tab="summarize" role="tab">Summarize</button>
      <button class="tab ${activeTab==='timer'?'on':''}" data-tab="timer" role="tab">Timer</button>
      <button class="tab ${activeTab==='text'?'on':''}" data-tab="text" role="tab">Text</button>
      <button class="tab ${activeTab==='theme'?'on':''}" data-tab="theme" role="tab">Theme</button>
      <button class="tab ${activeTab==='shortcuts'?'on':''}" data-tab="shortcuts" role="tab">Keys</button>
    </div>

    <!-- Features -->
    <div class="panel ${activeTab==='features'?'on':''}" role="tabpanel">
      <div class="qgrid">
        ${FEATURES.map(f => `
          <button class="qbtn ${profile[f.key]?'on':''}" data-feature="${f.key}"
            aria-pressed="${!!profile[f.key]}" aria-label="${f.label}: ${profile[f.key]?'on':'off'}">
            <div class="qlabel">${f.label}</div>
            <div class="qdesc">${f.desc}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:4px">
              <div class="qstate">${profile[f.key]?'ON':'OFF'}</div>
              <div style="font-size:9px;color:var(--text-soft);opacity:0.7">${f.shortcut}</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Summarize -->
    <div class="panel ${activeTab==='summarize'?'on':''}" role="tabpanel">
      <p style="font-size:12px;color:var(--text-soft);line-height:1.6;margin-bottom:10px">
        Highlight text on the page, then choose a format and click summarize. Shortcut: <strong>Alt+S</strong>
      </p>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        ${['tldr','simple','steps'].map(m => `
          <button class="sum-mode-btn" data-mode="${m}"
            style="flex:1;padding:7px 4px;border:1.5px solid ${_sumMode===m?'var(--sage)':'var(--border-mid)'};
            border-radius:8px;font-size:11px;font-weight:500;
            background:${_sumMode===m?'var(--sage-pale)':'var(--surface)'};
            color:${_sumMode===m?'var(--sage)':'var(--text-mid)'};
            cursor:pointer;font-family:'Lexend',sans-serif">
            ${m==='tldr'?'TL;DR':m==='simple'?'Plain English':'Step by step'}
          </button>
        `).join('')}
      </div>
      <button class="sum-btn" id="sum-btn" ${summarizing?'disabled':''}>
        ${summarizing?'Reading...':'Summarize selected text'}
      </button>
      <div class="sum-result ${summarizing?'on':''}" id="sum-result">
        ${summarizing?'<div class="dot-loader"><span></span><span></span><span></span></div>':''}
      </div>
    </div>

    <!-- Timer -->
    <div class="panel ${activeTab==='timer'?'on':''}" role="tabpanel">
      <p style="font-size:11px;color:var(--text-soft);margin-bottom:8px">Shortcut: <strong>Alt+T</strong> to start/pause</p>
      <div class="timer-wrap">
        <div class="timer-phase" style="color:${pomPhase==='break'?'#4a7fa8':pomPhase==='work'?'var(--sage)':'var(--text-soft)'}">
          ${pomPhase==='break'?'Break time':pomPhase==='work'?'Focus time':'Ready to focus?'}
        </div>
        <div class="timer-display" id="timer-display" aria-live="polite" aria-label="Timer: ${fmtTime(pomSeconds)}">${fmtTime(pomSeconds)}</div>
        <div class="timer-bar" role="progressbar" aria-valuenow="${timerPct()}" aria-valuemin="0" aria-valuemax="100">
          <div class="timer-fill" id="timer-fill" style="width:${timerPct()}%;background:${pomPhase==='break'?'#4a7fa8':'var(--sage)'}"></div>
        </div>
        <div class="timer-btns">
          ${!pomRunning
            ? `<button class="tbtn tbtn-primary" id="pom-start">${pomPhase==='idle'?'Start focusing':'Resume'}</button>`
            : `<button class="tbtn tbtn-ghost" id="pom-pause">Pause</button>`
          }
          <button class="tbtn tbtn-ghost" id="pom-skip">Skip</button>
          <button class="tbtn tbtn-ghost" id="pom-reset">Reset</button>
        </div>
        <div style="text-align:center;font-size:11px;color:var(--text-soft);margin-top:10px">
          ${pomSessions} ${pomSessions===1?'session':'sessions'} completed today
        </div>
      </div>
    </div>

    <!-- Text -->
    <div class="panel ${activeTab==='text'?'on':''}" role="tabpanel">
      <div class="srow">
        <div class="srow-hdr"><span>Font size</span><span class="sval" id="fsv">${profile.font_size}px</span></div>
        <input type="range" id="fs-slider" min="14" max="26" step="1" value="${profile.font_size}" aria-label="Font size">
      </div>
      <div class="srow">
        <div class="srow-hdr"><span>Line spacing</span><span class="sval" id="lhv">${profile.line_height.toFixed(1)}</span></div>
        <input type="range" id="lh-slider" min="14" max="24" step="1" value="${Math.round(profile.line_height*10)}" aria-label="Line spacing">
      </div>
      <div class="srow" style="border-bottom:none">
        <div class="srow-hdr"><span>Column width</span><span class="sval" id="cwv">${profile.column_width} ch</span></div>
        <input type="range" id="cw-slider" min="40" max="90" step="5" value="${profile.column_width}" aria-label="Column width">
      </div>
    </div>

    <!-- Theme -->
    <div class="panel ${activeTab==='theme'?'on':''}" role="tabpanel">
      <p style="font-size:11px;color:var(--text-soft);margin-bottom:10px">Applies to this page immediately.</p>
      <div class="theme-dots">
        ${THEMES.map(t => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
            <button class="tdot ${profile.theme===t.id?'on':''}"
              data-theme-id="${t.id}" style="background:${t.sw}"
              aria-pressed="${profile.theme===t.id}" aria-label="${t.label} theme"></button>
            <span class="tdot-label">${t.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="theme-toggle-row">
        <span class="ttl">Low-stimulation</span>
        ${sw('low_stim','sw-ls')}
      </div>
    </div>

    <!-- Shortcuts -->
    <div class="panel ${activeTab==='shortcuts'?'on':''}" role="tabpanel">
      <p style="font-size:12px;color:var(--text-soft);line-height:1.6;margin-bottom:12px">
        Use these keyboard shortcuts on any website while the extension is active.
      </p>
      <div style="display:flex;flex-direction:column;gap:1px">
        ${[
          ['Alt+F', 'Toggle focus mode'],
          ['Alt+L', 'Toggle low-stimulation'],
          ['Alt+C', 'Toggle clear clutter'],
          ['Alt+K', 'Toggle chunk content'],
          ['Alt+R', 'Toggle reading ruler'],
          ['Alt+T', 'Start / pause timer'],
          ['Alt+S', 'Summarize selected text'],
        ].map(([key, desc]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text)">${desc}</span>
            <kbd style="font-size:10px;font-family:'Lexend',sans-serif;background:var(--surface);border:1px solid var(--border-mid);border-radius:5px;padding:3px 8px;color:var(--text-mid)">${key}</kbd>
          </div>
        `).join('')}
      </div>
      <p style="font-size:11px;color:var(--text-soft);margin-top:12px;line-height:1.5">
        On Mac, use <kbd style="font-size:10px;background:var(--surface);border:1px solid var(--border-mid);border-radius:4px;padding:2px 6px">Option</kbd> instead of Alt.
      </p>
    </div>

    <div class="footer">
      <span class="fbrand">Gentle Browse</span>
      <button class="flink" id="open-dash">Open dashboard</button>
    </div>
  `
}

function sw(key, id) {
  return `<label class="switch" aria-label="${key}"><input type="checkbox" id="${id}" ${profile[key]?'checked':''} data-key="${key}"><span class="track"></span></label>`
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

  document.querySelectorAll('.sum-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _sumMode = btn.dataset.mode
      document.querySelectorAll('.sum-mode-btn').forEach(b => {
        const on = b.dataset.mode === _sumMode
        b.style.borderColor = on ? 'var(--sage)' : 'var(--border-mid)'
        b.style.color = on ? 'var(--sage)' : 'var(--text-mid)'
        b.style.background = on ? 'var(--sage-pale)' : 'var(--surface)'
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

// ── AI Summarize ──────────────────────────────────────────────────────────
async function doSummarize() {
  let selectedText = ''
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true})
    if (tab?.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          func: () => window.getSelection()?.toString() || ''
        })
        selectedText = results?.[0]?.result || ''
      } catch(e) {}
    }
  }

  const resultEl = document.getElementById('sum-result')
  if (!selectedText.trim()) {
    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = 'No text selected. Highlight some text on the page first, then click Summarize.' }
    return
  }

  summarizing = true
  document.getElementById('sum-btn').disabled = true
  if (resultEl) { resultEl.className = 'sum-result on'; resultEl.innerHTML = '<div class="dot-loader"><span></span><span></span><span></span></div>' }

  const prompts = {
    tldr:   `Summarize in 2-3 short sentences. Plain English only. No jargon:\n\n${selectedText.slice(0,3000)}`,
    simple: `Rewrite this simply. Max 15 words per sentence. No jargon. Keep all key information:\n\n${selectedText.slice(0,3000)}`,
    steps:  `Break into 3-6 numbered steps or key points with short headings. Make it manageable:\n\n${selectedText.slice(0,3000)}`,
  }

  try {
    const openaiKey = typeof chrome !== 'undefined' && chrome.storage
      ? (await chrome.storage.sync.get('openai_key'))?.openai_key : null

    let result = ''
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},
        body:JSON.stringify({model:'gpt-4o-mini',max_tokens:400,messages:[{role:'user',content:prompts[_sumMode]}]})
      })
      const data = await res.json()
      result = data.choices?.[0]?.message?.content || ''
    } else {
      // Smart fallback — extract and format key sentences
      const sentences = selectedText.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+/g) || []
      if (_sumMode === 'tldr') {
        result = sentences.slice(0,3).join(' ').trim() || selectedText.slice(0,200)
      } else if (_sumMode === 'steps') {
        result = sentences.slice(0,6).map((s,i) => `${i+1}. ${s.trim()}`).join('\n')
      } else {
        result = sentences.slice(0,5).join(' ').trim()
      }
      result += '\n\n— Add an OpenAI key in Settings for AI-powered summaries'
    }

    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = result }
  } catch(err) {
    if (resultEl) { resultEl.className = 'sum-result on'; resultEl.textContent = 'Could not connect. Check your internet connection.' }
  } finally {
    summarizing = false
    const btn = document.getElementById('sum-btn')
    if (btn) btn.disabled = false
  }
}

// ── Pomodoro ──────────────────────────────────────────────────────────────
function pomStart() {
  if (pomPhase === 'idle') { pomPhase = 'work'; pomSeconds = (profile.pomodoro_work||25)*60 }
  pomRunning = true
  clearInterval(pomInterval)
  pomInterval = setInterval(() => {
    pomSeconds--
    const d = document.getElementById('timer-display')
    const f = document.getElementById('timer-fill')
    if (d) { d.textContent = fmtTime(pomSeconds); d.setAttribute('aria-label', 'Timer: ' + fmtTime(pomSeconds)) }
    if (f) f.style.width = timerPct() + '%'
    if (pomSeconds <= 0) {
      if (pomPhase==='work') { pomSessions++; pomPhase='break'; pomSeconds=(profile.pomodoro_break||5)*60 }
      else { pomPhase='work'; pomSeconds=(profile.pomodoro_work||25)*60 }
      // Notify
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Gentle Browse', { body: pomPhase==='break'?'Time for a break!':'Break over — ready to focus?' })
      }
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
function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }
function timerPct() {
  const total = pomPhase==='work' ? (profile.pomodoro_work||25)*60 : (profile.pomodoro_break||5)*60
  return pomPhase==='idle' ? 0 : Math.round((1-pomSeconds/total)*100)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function openDash() {
  const url = 'https://adaptive-841pp8vsf-purplepony17s-projects.vercel.app'
  if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({url})
  else window.open(url,'_blank')
}
async function save() {
  if (typeof chrome !== 'undefined' && chrome.storage) await chrome.storage.sync.set({profile})
  else localStorage.setItem('gb_profile', JSON.stringify(profile))
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
