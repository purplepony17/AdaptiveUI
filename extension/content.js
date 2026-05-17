// content.js — Gentle Browse
// Applies accessibility settings to every website

let currentProfile = null
let rulerEl = null

;(async () => {
  const { profile } = await chrome.storage.sync.get('profile')
  if (profile) { currentProfile = profile; applyAll(profile) }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'GB_UPDATE') { currentProfile = msg.profile; applyAll(msg.profile) }
    if (msg.type === 'GB_OVERLOAD') showOverload()
  })
})()

function applyAll(p) {
  applyText(p)
  applyTheme(p)
  applyLowStim(p)
  applyClutter(p)
  applyFocus(p)
  applyChunking(p)
  applyRuler(p)
}

// ── Text ──────────────────────────────────────────────────────────────────
function applyText(p) {
  const r = document.documentElement
  r.style.setProperty('--gb-size',  p.font_size + 'px')
  r.style.setProperty('--gb-lh',    String(p.line_height))
  r.style.setProperty('--gb-width', p.column_width + 'ch')
  r.style.setProperty('--gb-align', p.left_align ? 'left' : '')

  const fonts = {
    lexend: "'Lexend', sans-serif",
    opendyslexic: "'OpenDyslexic', Arial, sans-serif",
    arial: 'Arial, Helvetica, sans-serif',
    system: 'system-ui, sans-serif',
  }
  if (p.font_family && fonts[p.font_family]) {
    r.style.setProperty('--gb-font', fonts[p.font_family])
    if (p.font_family === 'lexend') injectFont('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500&display=swap')
  }
}

// ── Theme ─────────────────────────────────────────────────────────────────
function applyTheme(p) {
  const themes = {
    sage:          { bg:'#f8f4ee', text:'#2e3a2f', link:'#3d7a42', accent:'#6b9b6f' },
    parchment:     { bg:'#faf6ef', text:'#3a2e1e', link:'#7a5c30', accent:'#a08060' },
    sky:           { bg:'#f2f7fc', text:'#1a2e3a', link:'#1a5a8a', accent:'#4a7fa8' },
    dark_moss:     { bg:'#111a11', text:'#d4e8d4', link:'#90d494', accent:'#7ab87e' },
    dark_warm:     { bg:'#1a1410', text:'#e8d8c4', link:'#e4c090', accent:'#c8a46e' },
    high_contrast: { bg:'#ffffff', text:'#000000', link:'#0000cc', accent:'#0000cc' },
  }
  const t = themes[p.theme] || themes.sage
  const r = document.documentElement
  r.style.setProperty('--gb-theme-bg',     t.bg)
  r.style.setProperty('--gb-theme-text',   t.text)
  r.style.setProperty('--gb-theme-link',   t.link)
  r.style.setProperty('--gb-theme-accent', t.accent)
  if (p.off_white_bg) r.style.setProperty('--gb-bg', t.bg)
}

// ── Low stim ──────────────────────────────────────────────────────────────
// Only desaturates images and stops animations — does NOT darken text or page
function applyLowStim(p) {
  removeStyle('gb-low-stim-style')
  if (!p.low_stim) return

  injectStyle('gb-low-stim-style', `
    /* Stop all animations */
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
    /* Black out images like an ad blocker */
    img:not([src*="logo"]):not([src*="icon"]):not([src*="avatar"]),
    video,
    [class*="hero-image"],
    [class*="banner-image"],
    picture source {
      filter: brightness(0) !important;
      opacity: 0.12 !important;
    }
    /* Mute vibrant background colors */
    [style*="background-color"]:not(code):not(pre) {
      filter: saturate(0.3) !important;
    }
  `)
}

// ── Clear clutter ─────────────────────────────────────────────────────────
function applyClutter(p) {
  removeStyle('gb-clutter-style')
  if (!p.reduce_clutter) return

  injectStyle('gb-clutter-style', `
    [class*="ad-"], [class*="-ad-"], [id*="-ad-"],
    [class*="advertisement"], [class*="sponsored"],
    [class*="sidebar"]:not(main *):not(article *),
    [id*="sidebar"]:not(main *),
    [class*="banner"]:not(header):not(nav):not(main *),
    [class*="newsletter"], [class*="subscribe-"],
    [class*="cookie-banner"], [id*="cookie-banner"],
    [class*="cookie-notice"], [id*="cookie-notice"],
    [class*="gdpr"], [id*="gdpr"],
    [class*="popup"]:not([role="dialog"]):not([aria-modal]),
    [class*="promo"]:not(main *),
    aside:not(article aside):not(main aside),
    .promoted, .sponsored,
    [data-testid*="ad"], [aria-label*="advertisement"] {
      display: none !important;
    }
  `)
}

// ── Focus mode ────────────────────────────────────────────────────────────
// Dims everything AROUND the main content, not the content itself
function applyFocus(p) {
  removeStyle('gb-focus-style')
  const existing = document.getElementById('gb-focus-dim')
  if (existing) existing.remove()

  if (!p.focus_mode) return

  const accent = getAccentHex(p.theme)

  // The main content gets a glowing border and stays fully visible
  // Everything else gets dimmed via a fixed overlay with a "hole" cut out
  injectStyle('gb-focus-style', `
    /* Main content area — fully visible, no dimming */
    main, article, [role="main"],
    .mw-parser-output, .mw-content-text,
    .content, #content, .post-content,
    .entry-content, .article-body,
    #bodyContent {
      position: relative !important;
      z-index: 9995 !important;
      border-radius: 12px !important;
      outline: 3px solid ${accent} !important;
      outline-offset: 8px !important;
      box-shadow: 0 0 0 8px ${accent}22, 0 0 40px ${accent}33 !important;
    }

    /* All text inside stays full opacity */
    main *, article *, [role="main"] *,
    .mw-parser-output *, #bodyContent * {
      opacity: 1 !important;
      color: inherit !important;
    }

    /* Highlight bold/strong text */
    main strong, article strong, [role="main"] strong,
    .mw-parser-output strong, #bodyContent strong,
    main b, article b {
      background: ${accent}22 !important;
      border-radius: 3px !important;
      padding: 0 3px !important;
    }

    /* Underline headings */
    main h2, main h3, article h2, article h3,
    .mw-parser-output h2, .mw-parser-output h3,
    #bodyContent h2, #bodyContent h3 {
      border-bottom: 2px solid ${accent} !important;
      padding-bottom: 4px !important;
    }

    /* Dim the body background */
    body {
      background-color: rgba(0,0,0,0.6) !important;
    }

    /* Keep header/nav readable but slightly dimmed */
    header, nav, footer, aside {
      opacity: 0.35 !important;
    }
  `)
}

// ── Task chunking ─────────────────────────────────────────────────────────
function applyChunking(p) {
  document.querySelectorAll('.gb-chunk').forEach(el => el.remove())
  if (!p.chunk_mode) return

  const accent = getAccentHex(p.theme)
  const main = document.querySelector(
    'main, article, [role="main"], .mw-parser-output, #bodyContent, .content, #content'
  )
  if (!main) return

  const headings = main.querySelectorAll('h1, h2, h3')
  headings.forEach((h, i) => {
    const badge = document.createElement('span')
    badge.className = 'gb-chunk'
    badge.textContent = String(i + 1)
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px; height: 26px;
      background: ${accent};
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      margin-right: 10px;
      vertical-align: middle;
      font-family: Lexend, Arial, sans-serif;
      flex-shrink: 0;
      box-shadow: 0 2px 6px ${accent}55;
    `
    h.prepend(badge)
  })
}

// ── Reading ruler ─────────────────────────────────────────────────────────
function applyRuler(p) {
  if (rulerEl) { rulerEl.remove(); rulerEl = null }
  document.removeEventListener('mousemove', moveRuler)

  if (!p.dyslexia_ruler) return

  const accent = getAccentHex(p.theme)
  rulerEl = document.createElement('div')
  rulerEl.id = 'gb-ruler'
  rulerEl.style.cssText = `
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    height: 36px !important;
    background: ${accent}22 !important;
    border-top: 2px solid ${accent}66 !important;
    border-bottom: 2px solid ${accent}66 !important;
    pointer-events: none !important;
    z-index: 999999 !important;
    top: 200px;
  `
  document.body.appendChild(rulerEl)
  document.addEventListener('mousemove', moveRuler)
}

function moveRuler(e) {
  if (rulerEl) rulerEl.style.top = (e.clientY - 18) + 'px'
}

// ── Emergency overload overlay ────────────────────────────────────────────
function showOverload() {
  if (document.getElementById('gb-emergency')) return
  document.querySelectorAll('video, audio').forEach(el => { try { el.pause() } catch(_){} })

  const overlay = document.createElement('div')
  overlay.id = 'gb-emergency'
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 9999999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    font-family: Lexend, Arial, sans-serif;
  `
  overlay.innerHTML = `
    <div style="background:#f8f4ee;border-radius:20px;padding:40px;max-width:380px;text-align:center">
      <div style="font-size:52px;margin-bottom:16px">🌊</div>
      <h2 style="font-size:22px;color:#2e3a2f;margin-bottom:10px;font-family:Georgia,serif">Take a breath</h2>
      <p style="font-size:15px;color:#5a6b5c;line-height:1.7;margin-bottom:28px">
        We noticed signs of overload.<br>It's okay to slow down.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button id="gb-dismiss" style="padding:12px 24px;background:#6b9b6f;color:white;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-family:Lexend,sans-serif;font-weight:500">I'm okay, continue</button>
        <button id="gb-simplify" style="padding:12px 24px;background:transparent;color:#5a6b5c;border:1.5px solid #c4dcc6;border-radius:10px;font-size:14px;cursor:pointer;font-family:Lexend,sans-serif">Simplify everything</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  document.getElementById('gb-dismiss').addEventListener('click', () => overlay.remove())
  document.getElementById('gb-simplify').addEventListener('click', () => {
    overlay.remove()
    if (currentProfile) {
      currentProfile.low_stim = true
      currentProfile.reduce_clutter = true
      currentProfile.focus_mode = true
      applyAll(currentProfile)
    }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getAccentHex(theme) {
  const map = {
    sage:'#6b9b6f', parchment:'#a08060', sky:'#4a7fa8',
    dark_moss:'#7ab87e', dark_warm:'#c8a46e', high_contrast:'#0000cc'
  }
  return map[theme] || '#6b9b6f'
}

function injectStyle(id, css) {
  removeStyle(id)
  const el = document.createElement('style')
  el.id = id; el.textContent = css
  document.head.appendChild(el)
}

function removeStyle(id) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

function injectFont(href) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'; link.href = href
  document.head.appendChild(link)
}

// ── Keyboard shortcuts on the webpage ────────────────────────────────────
// These work even when the popup is closed
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
  if (!map[key]) return
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return

  e.preventDefault()
  const { profile } = await chrome.storage.sync.get('profile')
  if (!profile) return
  profile[map[key]] = !profile[map[key]]
  await chrome.storage.sync.set({ profile })
  currentProfile = profile
  applyAll(profile)

  // Show a small toast on the page
  showPageToast(map[key].replace(/_/g,' '), profile[map[key]])
})

function showPageToast(feature, isOn) {
  const existing = document.getElementById('gb-page-toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.id = 'gb-page-toast'
  toast.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: #2e3a2f !important;
    color: #f8f4ee !important;
    padding: 8px 18px !important;
    border-radius: 20px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    font-family: Lexend, Arial, sans-serif !important;
    z-index: 9999999 !important;
    pointer-events: none !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
    white-space: nowrap !important;
  `
  toast.textContent = `${feature}: ${isOn ? 'on' : 'off'}`
  document.body.appendChild(toast)
  setTimeout(() => toast.style.opacity = '0', 1400)
  setTimeout(() => toast.remove(), 1800)
}

// ── Listen for profile updates from the dashboard webpage ─────────────────
// When user changes theme/settings on the dashboard, this fires instantly
window.addEventListener('gb_profile_update', (e) => {
  const profile = e.detail
  if (!profile) return
  currentProfile = profile
  applyAll(profile)
  // Also save to extension storage so popup stays in sync
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.set({ profile })
  }
})
