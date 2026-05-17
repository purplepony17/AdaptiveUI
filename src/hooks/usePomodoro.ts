declare const chrome: any

import { useCallback, useEffect, useRef, useState } from 'react'
import { PomState, DEFAULT_POM, writePomState } from '../lib/store'

// Read from chrome.storage.local where background.js saves
function readFromExtension(cb: (s: PomState) => void) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get('pomState', (r) => {
      if (r.pomState) cb(r.pomState)
    })
  }
}

export function usePomodoro(workMins: number, breakMins: number) {
  const [state, setState] = useState<PomState>(() => DEFAULT_POM)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount, read initial state from extension storage
  useEffect(() => {
    readFromExtension(s => setState(s))
  }, [])

  // Poll chrome.storage.local every second to stay in sync with background.js
  useEffect(() => {
    const poll = setInterval(() => {
      readFromExtension(s => {
        setState(prev => {
          // Only update if something actually changed to avoid unnecessary re-renders
          if (
            prev.seconds === s.seconds &&
            prev.running === s.running &&
            prev.phase === s.phase &&
            prev.sessions === s.sessions
          ) return prev
          return s
        })
      })
    }, 1000)
    return () => clearInterval(poll)
  }, [])

  // Send commands to background.js service worker
  function bgMsg(type: string, extra?: object): Promise<PomState | null> {
    return new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        resolve(null)
        return
      }
      chrome.runtime.sendMessage({ type, ...extra }, (r) => {
        resolve(r?.pomState ?? null)
      })
    })
  }

  const start = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const s = await bgMsg('POM_START')
    if (s) setState(s)
  }, [])

  const pause = useCallback(async () => {
    const s = await bgMsg('POM_PAUSE')
    if (s) setState(s)
  }, [])

  const reset = useCallback(async () => {
    const s = await bgMsg('POM_RESET')
    if (s) setState(s)
  }, [])

  const skip = useCallback(async () => {
    const s = await bgMsg('POM_SKIP')
    if (s) setState(s)
  }, [])

  const mins = Math.floor(state.seconds / 60)
  const secs = state.seconds % 60
  const display = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  const total = state.phase === 'work' ? state.workMins * 60 : state.breakMins * 60
  const progress = state.phase === 'idle' ? 0 : 1 - state.seconds / total

  return {
    phase: state.phase,
    display,
    progress,
    running: state.running,
    sessions: state.sessions,
    start,
    pause,
    reset,
    skip,
  }
}