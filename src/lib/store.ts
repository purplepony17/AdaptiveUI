// src/lib/store.ts
// Shared state that syncs between dashboard and extension via localStorage + custom events

export type PomPhase = 'idle' | 'work' | 'break'

export type PomState = {
  phase: PomPhase
  seconds: number
  running: boolean
  sessions: number
  workMins: number
  breakMins: number
  startedAt: number | null  // timestamp when started, for drift correction
}

export const DEFAULT_POM: PomState = {
  phase: 'idle',
  seconds: 25 * 60,
  running: false,
  sessions: 0,
  workMins: 25,
  breakMins: 5,
  startedAt: null,
}

// ── Read/write pom state via localStorage so extension and dashboard stay in sync
export function readPomState(): PomState {
  try {
    const raw = localStorage.getItem('haven_pom')
    if (raw) return { ...DEFAULT_POM, ...JSON.parse(raw) }
  } catch (_) {}
  return { ...DEFAULT_POM }
}

export function writePomState(state: PomState) {
  localStorage.setItem('haven_pom', JSON.stringify(state))
  window.dispatchEvent(new CustomEvent('haven_pom_update', { detail: state }))
}

// ── Theme sync
export function readTheme(): string {
  return localStorage.getItem('haven_theme') || 'sage'
}

export function writeTheme(theme: string) {
  localStorage.setItem('haven_theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
  window.dispatchEvent(new CustomEvent('haven_theme_update', { detail: theme }))
  // Also push to extension
  window.dispatchEvent(new CustomEvent('gb_profile_update', {
    detail: { theme }
  }))
}
