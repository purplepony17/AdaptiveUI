// background.js — Haven service worker
// Handles timer that persists even when popup is closed

let pomTimer = null
let pomState = {
  phase: 'idle',
  seconds: 25 * 60,
  running: false,
  sessions: 0,
  workMins: 25,
  breakMins: 5,
}

// ── Save/load timer state ─────────────────────────────────────────────────
async function saveState() {
  await chrome.storage.local.set({ pomState })
}

async function loadState() {
  const r = await chrome.storage.local.get('pomState')
  if (r.pomState) pomState = r.pomState
}

// ── Timer tick ────────────────────────────────────────────────────────────
function tick() {
  if (!pomState.running) return
  pomState.seconds--

  if (pomState.seconds <= 0) {
    if (pomState.phase === 'work') {
      pomState.sessions++
      pomState.phase = 'break'
      pomState.seconds = pomState.breakMins * 60
      notifyUser('Focus session complete!', 'Time for a break. You earned it.')
    } else {
      pomState.phase = 'work'
      pomState.seconds = pomState.workMins * 60
      notifyUser('Break over!', 'Ready to focus again?')
    }
  }
  saveState()
}

function notifyUser(title, body) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message: body,
    priority: 2,
  })
  // Open popup to show the user
  chrome.action.openPopup().catch(() => {})
}

function startTimer() {
  if (pomTimer) clearInterval(pomTimer)
  pomState.running = true
  pomTimer = setInterval(tick, 1000)
  saveState()
}

function pauseTimer() {
  clearInterval(pomTimer)
  pomTimer = null
  pomState.running = false
  saveState()
}

function resetTimer() {
  clearInterval(pomTimer)
  pomTimer = null
  pomState.running = false
  pomState.phase = 'idle'
  pomState.seconds = pomState.workMins * 60
  saveState()
}

function skipPhase() {
  if (pomState.phase === 'work') {
    pomState.sessions++
    pomState.phase = 'break'
    pomState.seconds = pomState.breakMins * 60
  } else {
    pomState.phase = 'work'
    pomState.seconds = pomState.workMins * 60
  }
  if (pomState.running) startTimer()
  saveState()
}

// ── Message handler ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  loadState().then(() => {
    switch (msg.type) {
      case 'POM_GET':
        sendResponse({ pomState })
        break
      case 'POM_START':
        if (pomState.phase === 'idle') {
          pomState.phase = 'work'
          pomState.seconds = pomState.workMins * 60
        }
        startTimer()
        sendResponse({ pomState })
        break
      case 'POM_PAUSE':
        pauseTimer()
        sendResponse({ pomState })
        break
      case 'POM_RESET':
        resetTimer()
        sendResponse({ pomState })
        break
      case 'POM_SKIP':
        skipPhase()
        sendResponse({ pomState })
        break
      case 'POM_SETTINGS':
        pomState.workMins = msg.workMins || 25
        pomState.breakMins = msg.breakMins || 5
        saveState()
        sendResponse({ pomState })
        break
    }
  })
  return true // keep channel open for async
})

// ── On install ────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: 'https://adaptive-841pp8vsf-purplepony17s-projects.vercel.app' })
  }
})

// Resume timer if it was running before service worker restart
loadState().then(() => {
  if (pomState.running) startTimer()
})
