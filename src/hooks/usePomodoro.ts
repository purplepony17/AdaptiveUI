import { useCallback, useEffect, useRef, useState } from 'react'
import { PomState, DEFAULT_POM, readPomState, writePomState } from '../lib/store'

export function usePomodoro(workMins: number, breakMins: number) {
  const [state, setState] = useState<PomState>(() => readPomState())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setState(prev => {
      if (prev.workMins === workMins && prev.breakMins === breakMins) return prev
      const next = { ...prev, workMins, breakMins }
      if (prev.phase === 'idle') next.seconds = workMins * 60
      writePomState(next)
      return next
    })
  }, [workMins, breakMins])


  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.running) return prev
        const next = { ...prev, seconds: prev.seconds - 1 }
        if (next.seconds <= 0) {
          if (next.phase === 'work') {
            next.sessions = prev.sessions + 1
            next.phase = 'break'
            next.seconds = prev.breakMins * 60
            notify('Focus session complete! 🌿', 'Time for a well-earned break.')
          } else {
            next.phase = 'work'
            next.seconds = prev.workMins * 60
            notify('Break over! 🎯', 'Ready to focus again?')
          }
        }
        writePomState(next)
        return next
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [state.running])

  function notify(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/haven-logo.png' })
    }
  }

  const start = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    setState(prev => {
      const next = { ...prev, running: true }
      if (prev.phase === 'idle') { next.phase = 'work'; next.seconds = prev.workMins * 60 }
      writePomState(next)
      return next
    })
  }, [])

  const pause = useCallback(() => {
    setState(prev => { const next = { ...prev, running: false }; writePomState(next); return next })
  }, [])

  const reset = useCallback(() => {
    setState(prev => {
      const next = { ...DEFAULT_POM, workMins: prev.workMins, breakMins: prev.breakMins, seconds: prev.workMins * 60 }
      writePomState(next); return next
    })
  }, [])

  const skip = useCallback(() => {
    setState(prev => {
      const next = { ...prev }
      if (prev.phase === 'work') { next.sessions++; next.phase = 'break'; next.seconds = prev.breakMins * 60 }
      else { next.phase = 'work'; next.seconds = prev.workMins * 60 }
      writePomState(next); return next
    })
  }, [])

  const mins = Math.floor(state.seconds / 60)
  const secs = state.seconds % 60
  const display = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  const total = state.phase === 'work' ? state.workMins * 60 : state.breakMins * 60
  const progress = state.phase === 'idle' ? 0 : 1 - state.seconds / total

  return { phase: state.phase, display, progress, running: state.running, sessions: state.sessions, start, pause, reset, skip }
}
