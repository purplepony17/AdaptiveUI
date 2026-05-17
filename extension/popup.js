// popup.js — Haven v7
// Timer runs in background service worker so it persists

const DEFAULT = {
  display_name:'Friend', theme:'sage',
  font_size:16, line_height:1.6, column_width:70, font_family:'lexend',
  left_align:true, off_white_bg:true, focus_mode:false, low_stim:false,
  reduce_clutter:false, chunk_mode:false, dyslexia_ruler:false,
  sensitivity:50, pomodoro_work:25, pomodoro_break:5, needs:[],
  extension_enabled: true,
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
  { key:'focus_mode',     label:'Focus mode',      desc:'Dims page around main content',       shortcut:'Alt+F' },
  { key:'low_stim',       label:'Low-stimulation', desc:'Blacks out images, stops animations', shortcut:'Alt+L' },
  { key:'reduce_clutter', label:'Clear clutter',   desc:'Hides ads, sidebars, pop-ups',        shortcut:'Alt+C' },
  { key:'chunk_mode',     label:'Chunk content',   desc:'Numbers headings on any page',        shortcut:'Alt+K' },
  { key:'dyslexia_ruler', label:'Reading ruler',   desc:'Bar follows your mouse while reading',shortcut:'Alt+R' },
]

const SHORTCUTS = [
  ['Alt+F','Focus mode'],['Alt+L','Low-stimulation'],['Alt+C','Clear clutter'],
  ['Alt+K','Chunk content'],['Alt+R','Reading ruler'],
  ['Alt+T','Start/pause timer'],['Alt+S','Summarize / ask AI'],
]

const LOAD_LABELS = { calm:'Calm', focused:'Focused', distracted:'Distracted', overwhelmed:'Overwhelmed' }
const LOAD_COLORS = { calm:'#6b9b6f', focused:'#4a7fa8', distracted:'#c8a46e', overwhelmed:'#c87a7a' }

let profile = {...DEFAULT}
let activeTab = 'features'
let loadState = 'calm'
let pomState = { phase:'idle', seconds:25*60, running:false, sessions:0, workMins:25, breakMins:5 }
let summarizing = false
let sumMode = 'tldr'
let chatHistory = []
let chatting = false
let pomPollInterval = null

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const r = await chrome.storage.sync.get('profile')
  if (r.profile) profile = {...DEFAULT, ...r.profile}
  const lr = await chrome.storage.local.get('loadState')
  if (lr.loadState) loadState = lr.loadState

  // Get timer state from background
  pomState = await bgMsg({type:'POM_GET'}).then(r => r?.pomState || pomState)

  document.documentElement.setAttribute('data-theme', profile.theme)
  render()
  setupKeyboard()

  // Poll timer every second while popup is open
  pomPollInterval = setInterval(async () => {
    const r = await bgMsg({type:'POM_GET'})
    if (r?.pomState) {
      pomState = r.pomState
      const d = document.getElementById('timer-display')
      const f = document.getElementById('timer-fill')
      const p = document.getElementById('timer-phase')
      if (d) d.textContent = fmtTime(pomState.seconds)
      if (f) f.style.width = timerPct() + '%'
      if (p) p.textContent = pomState.phase==='break'?'Break time':pomState.phase==='work'?'Focus time':'Ready to focus?'
    }
  }, 1000)
}

window.addEventListener('unload', () => clearInterval(pomPollInterval))

// Send message to background service worker
function bgMsg(msg) {
  return chrome.runtime.sendMessage(msg).catch(() => null)
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────
function setupKeyboard() {
  const keyMap = {f:'focus_mode',l:'low_stim',c:'reduce_clutter',k:'chunk_mode',r:'dyslexia_ruler'}
  document.addEventListener('keydown', async (e) => {
    if (!e.altKey) return
    const k = e.key.toLowerCase()
    if (keyMap[k]) {
      e.preventDefault()
      profile[keyMap[k]] = !profile[keyMap[k]]
      await save(); sendToPage(); render()
      showToast(FEATURES.find(f=>f.key===keyMap[k]).label, profile[keyMap[k]])
    }
    if (k==='t') { e.preventDefault(); pomState.running ? doPomPause() : doPomStart() }
    if (k==='s') { e.preventDefault(); activeTab='summarize'; render() }
  })
}

function showToast(label, on) {
  const old = document.getElementById('gb-toast'); if(old) old.remove()
  const t = document.createElement('div')
  t.id='gb-toast'; t.className='toast'
  t.textContent=`${label}: ${on?'on':'off'}`
  document.body.appendChild(t)
  setTimeout(()=>t.classList.add('toast-hide'),1400)
  setTimeout(()=>t.remove(),1800)
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
  const extOn = profile.extension_enabled !== false

  return `
    <div class="header">
      <div class="logo-wrap">
        <img src="icons/icon48.png" alt="Haven" class="logo-img"
          onerror="this.style.display='none'"/>
      </div>
      <div class="header-text">
        <div class="hname">Haven</div>
        <div class="hsite" id="site-host">Loading...</div>
      </div>
      <div class="load-pill load-${loadState}">${LOAD_LABELS[loadState]}</div>
    </div>

    <div class="ext-toggle-bar">
      <span class="ext-toggle-label">Extension ${extOn?'active':'paused'}</span>
      <label class="switch" aria-label="Toggle extension">
        <input type="checkbox" id="ext-main-toggle" ${extOn?'checked':''}>
        <span class="track"></span>
      </label>
    </div>

    <div class="tabs" role="tablist">
      ${['features','summarize','timer','text','theme','keys'].map(t=>
        `<button class="tab ${activeTab===t?'on':''}" data-tab="${t}" role="tab">${
          t==='keys'?'Keys':t.charAt(0).toUpperCase()+t.slice(1)
        }</button>`
      ).join('')}
    </div>

    <!-- Features -->
    <div class="panel ${activeTab==='features'?'on':''}" role="tabpanel">
      <div class="qgrid">
        ${FEATURES.map(f=>`
          <button class="qbtn ${profile[f.key]?'on':''}" data-feature="${f.key}"
            aria-pressed="${!!profile[f.key]}" aria-label="${f.label}: ${profile[f.key]?'on':'off'}">
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

    <!-- Summarize + Ask AI -->
    <div class="panel ${activeTab==='summarize'?'on':''}" role="tabpanel">
      <div class="sum-tabs">
        <button class="sum-tab ${sumMode!=='chat'?'on':''}" id="tab-summarize">Summarize</button>
        <button class="sum-tab ${sumMode==='chat'?'on':''}" id="tab-chat">Ask AI</button>
      </div>

      ${sumMode !== 'chat' ? `
        <p class="panel-hint">Highlight text on the page, choose a format, click summarize. Alt+S</p>
        <div class="mode-row">
          ${['tldr','simple','steps'].map(m=>`
            <button class="mode-btn ${sumMode===m?'mode-on':''}" data-mode="${m}">
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
      ` : `
        <p class="panel-hint">Ask anything about the page you're reading. Alt+S</p>
        <div class="chat-box" id="chat-box">
          ${chatHistory.map(m=>`
            <div class="chat-msg chat-${m.role}">
              <div class="chat-bubble">${m.content}</div>
            </div>
          `).join('')}
          ${chatting?'<div class="chat-msg chat-assistant"><div class="chat-bubble"><div class="dot-loader"><span></span><span></span><span></span></div></div></div>':''}
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" class="chat-input" placeholder="Ask about this page..." autocomplete="off">
          <button class="chat-send" id="chat-send" ${chatting?'disabled':''}>Send</button>
        </div>
      `}
    </div>

    <!-- Timer (uses background worker — persists when popup closes) -->
    <div class="panel ${activeTab==='timer'?'on':''}" role="tabpanel">
      <p class="panel-hint">Timer runs in the background. You'll get a notification when time is up. Alt+T</p>
      <div class="timer-wrap">
        <div class="timer-phase timer-phase-${pomState.phase}" id="timer-phase">
          ${pomState.phase==='break'?'Break time':pomState.phase==='work'?'Focus time':'Ready to focus?'}
        </div>
        <div class="timer-display" id="timer-display" aria-live="polite">${fmtTime(pomState.seconds)}</div>
        <div class="timer-bar">
          <div class="timer-fill timer-fill-${pomState.phase}" id="timer-fill" style="width:${timerPct()}%"></div>
        </div>
        <div class="timer-btns">
          ${!pomState.running
            ? `<button class="tbtn tbtn-primary" id="pom-start">${pomState.phase==='idle'?'Start focusing':'Resume'}</button>`
            : `<button class="tbtn tbtn-ghost" id="pom-pause">Pause</button>`
          }
          <button class="tbtn tbtn-ghost" id="pom-skip">Skip</button>
          <button class="tbtn tbtn-ghost" id="pom-reset">Reset</button>
        </div>
        <div class="timer-sessions">${pomState.sessions} ${pomState.sessions===1?'session':'sessions'} today</div>
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
      <div class="srow srow-last">
        <div class="srow-hdr"><span>Column width</span><span class="sval" id="cwv">${profile.column_width} ch</span></div>
        <input type="range" id="cw-slider" min="40" max="90" step="5" value="${profile.column_width}" aria-label="Column width">
      </div>
    </div>

    <!-- Theme — all horizontal -->
    <div class="panel ${activeTab==='theme'?'on':''}" role="tabpanel">
      <p class="panel-hint">Applies to this page immediately.</p>
      <div class="theme-row-all">
        ${THEMES.map(t=>`
          <div class="theme-dot-wrap">
            <button class="tdot ${profile.theme===t.id?'on':''}"
              data-theme-id="${t.id}" aria-pressed="${profile.theme===t.id}"
              aria-label="${t.label}" style="background-color:${t.sw}"></button>
            <span class="tdot-label">${t.label}</span>
          </div>
        `).join('')}
        <div class="theme-dot-wrap">
          <button class="tdot tdot-system ${profile.theme==='system'?'on':''}"
            data-theme-id="system" aria-label="Follow system dark/light mode">
            <span style="font-size:14px">⚙</span>
          </button>
          <span class="tdot-label">System</span>
        </div>
      </div>
      <div class="theme-toggle-row">
        <span class="ttl">Low-stimulation</span>
        <label class="switch" aria-label="Low stimulation">
          <input type="checkbox" id="sw-ls" ${profile.low_stim?'checked':''} data-key="low_stim">
          <span class="track"></span>
        </label>
      </div>
    </div>

    <!-- Keys -->
    <div class="panel ${activeTab==='keys'?'on':''}" role="tabpanel">
      <p class="panel-hint">Works on any website. On Mac, use Option instead of Alt.</p>
      <div class="shortcuts-list">
        ${SHORTCUTS.map(([k,d])=>`
          <div class="shortcut-row">
            <span class="shortcut-desc">${d}</span>
            <kbd class="shortcut-key">${k}</kbd>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <span class="fbrand">Haven</span>
      <button class="flink" id="open-dash">Open dashboard</button>
    </div>
  `
}

// ── Events ────────────────────────────────────────────────────────────────
function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab[data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{activeTab=btn.dataset.tab;render()})
  })

  // Summarize / Chat sub-tabs
  document.getElementById('tab-summarize')?.addEventListener('click',()=>{sumMode='tldr';render()})
  document.getElementById('tab-chat')?.addEventListener('click',()=>{sumMode='chat';render();scrollChat()})

  // Feature buttons
  document.querySelectorAll('.qbtn[data-feature]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      profile[btn.dataset.feature]=!profile[btn.dataset.feature]
      await save();sendToPage();render()
    })
  })

  // Extension master toggle
  document.getElementById('ext-main-toggle')?.addEventListener('change',async function(){
    profile.extension_enabled=this.checked
    await save();sendToPage();render()
  })

  // Theme dots
  document.querySelectorAll('.tdot[data-theme-id]').forEach(dot=>{
    dot.addEventListener('click',async()=>{
      profile.theme=dot.dataset.themeId
      applyThemeToPopup(profile.theme)
      await save();sendToPage();render()
    })
  })

  // Switches
  document.querySelectorAll('input[data-key]').forEach(inp=>{
    inp.addEventListener('change',async()=>{
      profile[inp.dataset.key]=inp.checked;await save();sendToPage()
    })
  })

  // Mode chips
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      sumMode=btn.dataset.mode
      document.querySelectorAll('.mode-btn').forEach(b=>{
        b.classList.toggle('mode-on',b.dataset.mode===sumMode)
      })
    })
  })

  // Summarize
  document.getElementById('sum-btn')?.addEventListener('click',doSummarize)

  // Chat
  document.getElementById('chat-send')?.addEventListener('click',doChat)
  document.getElementById('chat-input')?.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doChat()}
  })

  // Sliders — use input event with debounce to prevent reset issues
  setupSlider('fs-slider','fsv','px',v=>{profile.font_size=v;save();sendToPage()})
  setupSlider('lh-slider','lhv','',v=>{profile.line_height=v/10;save();sendToPage()},v=>(v/10).toFixed(1))
  setupSlider('cw-slider','cwv',' ch',v=>{profile.column_width=v;save();sendToPage()})

  // Timer (all go to background)
  document.getElementById('pom-start')?.addEventListener('click',doPomStart)
  document.getElementById('pom-pause')?.addEventListener('click',doPomPause)
  document.getElementById('pom-skip')?.addEventListener('click',async()=>{pomState=await bgMsg({type:'POM_SKIP'}).then(r=>r?.pomState||pomState);render()})
  document.getElementById('pom-reset')?.addEventListener('click',async()=>{pomState=await bgMsg({type:'POM_RESET'}).then(r=>r?.pomState||pomState);render()})

  document.getElementById('open-dash')?.addEventListener('click',openDash)
}

// Stable slider setup — no re-render on slide, only save on pointerup
function setupSlider(id, displayId, unit, onSave, format) {
  const el = document.getElementById(id)
  if (!el) return
  el.addEventListener('input', function() {
    const v = Number(this.value)
    const display = document.getElementById(displayId)
    if (display) display.textContent = (format ? format(v) : v) + unit
  })
  el.addEventListener('pointerup', function() {
    onSave(Number(this.value))
  })
}

// ── Timer controls ────────────────────────────────────────────────────────
async function doPomStart() {
  pomState = await bgMsg({type:'POM_START'}).then(r=>r?.pomState||pomState)
  render()
}
async function doPomPause() {
  pomState = await bgMsg({type:'POM_PAUSE'}).then(r=>r?.pomState||pomState)
  render()
}

// ── AI Summarize ──────────────────────────────────────────────────────────
async function doSummarize() {
  let text = await getSelectedText()
  if (!text) {
    setResult('No text selected. Highlight some text on the page first.')
    return
  }
  summarizing=true
  const btn=document.getElementById('sum-btn')
  if(btn) btn.disabled=true
  setResult(null, true)

  const prompts = {
    tldr:`Summarize in 2-3 short plain English sentences. No jargon:\n\n${text.slice(0,3000)}`,
    simple:`Rewrite simply. Max 15 words per sentence:\n\n${text.slice(0,3000)}`,
    steps:`Break into 3-6 numbered steps with short headings:\n\n${text.slice(0,3000)}`,
  }

  try {
    const result = await callAI(prompts[sumMode], await getPageContext())
    setResult(result)
  } catch(e) {
    setResult('Could not connect. Check your internet.')
  } finally {
    summarizing=false
    if(btn) btn.disabled=false
  }
}

function setResult(text, loading=false) {
  const el=document.getElementById('sum-result')
  if(!el) return
  el.className='sum-result on'
  if(loading) el.innerHTML='<div class="dot-loader"><span></span><span></span><span></span></div>'
  else el.textContent=text||''
}

// ── Ask AI (chatbox about the page) ──────────────────────────────────────
async function doChat() {
  const input=document.getElementById('chat-input')
  const q=(input?.value||'').trim()
  if(!q) return

  chatHistory.push({role:'user',content:q})
  if(input) input.value=''
  chatting=true
  render()
  scrollChat()

  try {
    const pageText = await getPageText()
    const systemMsg = `You are a helpful reading assistant for Haven, an accessibility browser extension. 
The user is reading a webpage. Here is the page content:\n\n${pageText.slice(0,4000)}\n\nAnswer the user's question about this page in plain, simple English. Be concise.`

    const stored = await chrome.storage.sync.get('openai_key')
    const key = stored?.openai_key

    let answer = ''
    if(key) {
      const messages = [
        {role:'system',content:systemMsg},
        ...chatHistory.map(m=>({role:m.role,content:m.content}))
      ]
      const res = await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:'gpt-4o-mini',max_tokens:400,messages})
      })
      const data=await res.json()
      answer=data.choices?.[0]?.message?.content||'No response.'
    } else {
      answer='Add an OpenAI key to enable AI chat. Go to chrome://extensions → Haven → Service Worker → paste: chrome.storage.sync.set({openai_key:"sk-..."})'
    }

    chatHistory.push({role:'assistant',content:answer})
  } catch(e) {
    chatHistory.push({role:'assistant',content:'Could not connect. Check your internet.'})
  } finally {
    chatting=false
    render()
    scrollChat()
  }
}

function scrollChat() {
  setTimeout(()=>{
    const box=document.getElementById('chat-box')
    if(box) box.scrollTop=box.scrollHeight
  },50)
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function getSelectedText() {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
  if(!tab?.id) return ''
  try {
    const r=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>window.getSelection()?.toString()||''})
    return r?.[0]?.result||''
  } catch(e){return ''}
}

async function getPageText() {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
  if(!tab?.id) return ''
  try {
    const r=await chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func:()=>document.body?.innerText?.slice(0,6000)||''
    })
    return r?.[0]?.result||''
  } catch(e){return ''}
}

async function getPageContext() {
  return await getPageText()
}

async function callAI(prompt, context) {
  const stored=await chrome.storage.sync.get('openai_key')
  const key=stored?.openai_key
  if(key) {
    const res=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'gpt-4o-mini',max_tokens:400,messages:[{role:'user',content:prompt}]})
    })
    const data=await res.json()
    return data.choices?.[0]?.message?.content||'No response.'
  }
  // Fallback
  const sentences=(context||'').replace(/\s+/g,' ').match(/[^.!?]+[.!?]+/g)||[]
  return sentences.slice(0,4).join(' ')+'\n\n(Add OpenAI key for AI-powered responses)'
}

function applyThemeToPopup(theme) {
  if(theme==='system') {
    const dark=window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', dark?'dark_moss':'sage')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

function fmtTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function timerPct(){
  const total=pomState.phase==='work'?pomState.workMins*60:pomState.breakMins*60
  return pomState.phase==='idle'?0:Math.round((1-pomState.seconds/total)*100)
}

function openDash(){
  const url='https://adaptive-841pp8vsf-purplepony17s-projects.vercel.app'
  chrome.tabs.create({url})
}

async function save(){
  await chrome.storage.sync.set({profile})
}

function sendToPage(){
  if(!profile.extension_enabled){
    // Remove all GB styles
    chrome.tabs.query({active:true,currentWindow:true},([tab])=>{
      if(!tab?.id) return
      chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
        document.querySelectorAll('[id^="gb-"]').forEach(el=>el.remove())
        document.querySelectorAll('[id^="gb-"]').forEach(el=>el.remove())
        ;['gb-low-stim-style','gb-clutter-style','gb-focus-style','gb-laser-style'].forEach(id=>{
          const el=document.getElementById(id);if(el)el.remove()
        })
      }}).catch(()=>{})
    })
    return
  }
  chrome.tabs.query({active:true,currentWindow:true},([tab])=>{
    if(!tab?.id) return
    chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']})
      .then(()=>chrome.scripting.insertCSS({target:{tabId:tab.id},files:['content.css']})
        .then(()=>chrome.tabs.sendMessage(tab.id,{type:'GB_UPDATE',profile}))
      ).catch(e=>console.log('Haven:',e))
  })
}

function updateSiteHost(){
  chrome.tabs.query({active:true,currentWindow:true},tabs=>{
    try{const el=document.getElementById('site-host');if(el)el.textContent=new URL(tabs[0].url).hostname}catch(_){}
  })
}

// System dark/light mode detection
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{
  if(profile.theme==='system') {
    document.documentElement.setAttribute('data-theme',e.matches?'dark_moss':'sage')
    sendToPage()
  }
})

init()
