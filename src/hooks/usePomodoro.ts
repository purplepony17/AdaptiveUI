import { useEffect, useRef, useState } from 'react'

export type TimerPhase = 'work' | 'break' | 'idle'

export function usePomodoro(workMins: number, breakMins: number) {
  const [phase, setPhase]         = useState<TimerPhase>('idle')
  const [seconds, setSeconds]     = useState(workMins * 60)
  const [running, setRunning]     = useState(false)
  const [sessions, setSessions]   = useState(0)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset when settings change
  useEffect(() => {
    if (phase === 'idle') setSeconds(workMins * 60)
  }, [workMins, phase])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            // Phase complete
            if (phase === 'work') {
              setSessions(n => n + 1)
              setPhase('break')
              setSeconds(breakMins * 60)
              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Gentle Browse', {
                  body: 'Work session done! Time for a break.',
                  icon: '/icon48.png'
                })
              }
            } else {
              setPhase('work')
              setSeconds(workMins * 60)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Gentle Browse', {
                  body: 'Break over. Ready to focus again?',
                  icon: '/icon48.png'
                })
              }
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, workMins, breakMins])

  function start() {
    if (phase === 'idle') setPhase('work')
    setRunning(true)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function pause()  { setRunning(false) }

  function reset() {
    setRunning(false)
    setPhase('idle')
    setSeconds(workMins * 60)
  }

  function skip() {
    if (phase === 'work') {
      setSessions(n => n + 1)
      setPhase('break')
      setSeconds(breakMins * 60)
    } else {
      setPhase('work')
      setSeconds(workMins * 60)
    }
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  const progress = phase === 'work'
    ? 1 - seconds / (workMins * 60)
    : 1 - seconds / (breakMins * 60)

  return { phase, display, progress, running, sessions, start, pause, reset, skip }
}
