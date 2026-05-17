// content.js — injected into every website you visit
// Reads your profile from storage and reshapes the page

;(async () => {
  const { profile } = await chrome.storage.sync.get('profile')
  if (profile) applyProfile(profile)

  // Listen for live updates from popup
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'GB_UPDATE') applyProfile(msg.profile)
    if (msg.type === 'GB_OVERLOAD') activateEmergencyMode()
  })
})()

function applyProfile(p) {
  const root = document.documentElement

  // ── Text ──────────────────────────────────────────────
  root.style.setProperty('--gb-size',    p.font_size + 'px')
  root.style.setProperty('--gb-lh',      String(p.line_height))
  root.style.setProperty('--gb-width',   p.column_width + 'ch')
  root.style.setProperty('--gb-align',   p.left_align ? 'left' : '')

  if (p.off_white_bg) root.style.setProperty('--gb-bg', '#f8f4ee')
  else root.style.removeProperty('--gb-bg')

  // ── Font ──────────────────────────────────────────────
  const fonts = {
    lexend: "'Lexend', sans-serif",
    opendyslexic: "'OpenDyslexic', Arial, sans-serif",
    arial: 'Arial, Helvetica, sans-serif',
    system: 'system-ui, sans-serif',
  }
  if (p.font_family && fonts[p.font_family]) {
    root.style.setProperty('--gb-font', fonts[p.font_family])
    if (p.font_family === 'lexend') injectFont('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500&display=swap')
  }

  // ── Low stim ──────────────────────────────────────────
  root.setAttribute('data-gb-low-stim', p.low_stim ? 'true' : 'false')

  // ── Reduce clutter ────────────────────────────────────
  if (p.reduce_clutter) hideClutter()

  // ── Focus mode ────────────────────────────────────────
  const existing = document.getElementById('gb-focus')
  if (p.focus_mode && !existing) {
    const el = document.createElement('div')
    el.id = 'gb-focus'
    document.body.appendChild(el)
  } else if (!p.focus_mode && existing) {
    existing.remove()
  }

  // ── Task chunking ─────────────────────────────────────
  if (p.chunk_mode) chunkContent()

  // ── Laser cursor ──────────────────────────────────────
  root.setAttribute('data-gb-laser', p.laser_cursor ? 'true' : 'false')
}

function hideClutter() {
  const selectors = [
    '[class*="ad-"]','[id*="-ad-"]','[class*="advertisement"]',
    '[class*="sidebar"]','[id*="sidebar"]',
    '[class*="banner"]:not(header)','[id*="cookie"]',
    '[class*="newsletter"]','[class*="popup"]',
    '[class*="modal"]:not([aria-modal="true"])',
    '.sponsored','.promoted',
  ]
  selectors.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(el => {
        if (el.closest('main,article,[role="main"]')) return
        el.style.setProperty('display', 'none', 'important')
      })
    } catch(_) {}
  })
}

function chunkContent() {
  const main = document.querySelector('main,article,[role="main"],.content,#content')
  if (!main) return
  const headings = main.querySelectorAll('h1,h2,h3')
  headings.forEach((h, i) => {
    if (h.querySelector('.gb-chunk')) return
    const badge = document.createElement('span')
    badge.className = 'gb-chunk'
    badge.textContent = String(i + 1)
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#6b9b6f;color:white;border-radius:50%;font-size:11px;font-weight:600;margin-right:8px;vertical-align:middle;font-family:Lexend,sans-serif;flex-shrink:0'
    h.prepend(badge)
  })
}

function activateEmergencyMode() {
  document.querySelectorAll('video,audio').forEach(el => el.pause && el.pause())
  document.querySelectorAll('[class*="anim"],[class*="motion"],[class*="slide"]').forEach(el => {
    el.style.setProperty('animation', 'none', 'important')
    el.style.setProperty('transition', 'none', 'important')
  })
  const overlay = document.createElement('div')
  overlay.id = 'gb-emergency'
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)'
  overlay.innerHTML = `
    <div style="background:#f8f4ee;border-radius:20px;padding:40px;max-width:380px;text-align:center;font-family:Lexend,sans-serif">
      <div style="font-size:48px;margin-bottom:16px">🌊</div>
      <h2 style="font-size:20px;color:#2e3a2f;margin-bottom:10px">Take a breath</h2>
      <p style="font-size:14px;color:#5a6b5c;line-height:1.6;margin-bottom:24px">
        We noticed signs of overload. It's okay to slow down.
      </p>
      <button id="gb-dismiss" style="padding:11px 24px;background:#6b9b6f;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:Lexend,sans-serif">
        I'm okay, continue
      </button>
    </div>
  `
  document.body.appendChild(overlay)
  document.getElementById('gb-dismiss')?.addEventListener('click', () => overlay.remove())
}

function injectFont(href) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'; link.href = href
  document.head.appendChild(link)
}
