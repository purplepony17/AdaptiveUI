import { useEffect, useRef, useState, useCallback } from 'react'

export type LoadState = 'calm' | 'focused' | 'overwhelmed' | 'distracted'
export type LoadEvent = { time: number; state: LoadState; reason: string }

const STATE_MESSAGES: Record<LoadState, { title: string; body: string }> = {
  calm:        { title: 'Feeling calm 🌱', body: 'You seem relaxed. Good pace!' },
  focused:     { title: 'In the zone 🎯', body: 'Deep focus detected. Great work!' },
  distracted:  { title: 'Getting distracted 🍃', body: 'Frequent tab switching noticed. Want to enable Focus mode?' },
  overwhelmed: { title: 'Overload detected 🌊', body: 'High activity patterns. Consider taking a short break.' },
}

export function useCognitiveLoad(sensitivity: number = 50) {
  const [loadState, setLoadState]   = useState<LoadState>('calm')
  const [loadScore, setLoadScore]   = useState(0)
  const [history, setHistory]       = useState<LoadEvent[]>([])
  const [adaptLog, setAdaptLog]     = useState<string[]>([])
  const [sessionStart]              = useState(Date.now())

  const clicks       = useRef(0)
  const rageClicks   = useRef(0)
  const scrollSpeed  = useRef(0)
  const lastScroll   = useRef(Date.now())
  const lastScrollY  = useRef(0)
  const tabSwitches  = useRef(0)
  const typingEvents = useRef(0)
  const deleteEvents = useRef(0)
  const hoverTimes   = useRef<number[]>([])
  const lastState    = useRef<LoadState>('calm')
  const lastLogTime  = useRef(0)

  const threshold = sensitivity / 100

  const addLog = useCallback((msg: string, force = false) => {
    const now = Date.now()
    // Only add to log if forced (state change) or it's been 2+ minutes
    if (!force && now - lastLogTime.current < 120000) return
    lastLogTime.current = now
    setAdaptLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 30))
  }, [])

  const sendNotification = useCallback((state: LoadState) => {
    const msg = STATE_MESSAGES[state]
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(msg.title, { body: msg.body, icon: '/haven-logo.png' })
    }
  }, [])

  useEffect(() => {
    let lastClickTime = 0, rapidCount = 0
    function handleClick() {
      const now = Date.now(); clicks.current++
      if (now - lastClickTime < 500) { rapidCount++; if (rapidCount >= 3) { rageClicks.current++; rapidCount = 0 } }
      else rapidCount = 0
      lastClickTime = now
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    function handleScroll() {
      const now = Date.now()
      const delta = Math.abs(window.scrollY - lastScrollY.current)
      const elapsed = now - lastScroll.current
      scrollSpeed.current = elapsed > 0 ? delta / elapsed : 0
      lastScroll.current = now; lastScrollY.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    function handleVisibility() { if (document.hidden) tabSwitches.current++ }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Backspace' || e.key === 'Delete') deleteEvents.current++
      else if (e.key.length === 1) typingEvents.current++
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    let hoverStart = 0
    function onOver() { hoverStart = Date.now() }
    function onOut() {
      const dur = Date.now() - hoverStart
      if (dur > 800 && dur < 5000) { hoverTimes.current.push(dur); if (hoverTimes.current.length > 20) hoverTimes.current.shift() }
    }
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onOut)
    return () => { window.removeEventListener('mouseover', onOver); window.removeEventListener('mouseout', onOut) }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const t = threshold
      const rageScore   = Math.min(rageClicks.current * 25, 100)
      const scrollScore = Math.min(scrollSpeed.current * 200, 100)
      const tabScore    = Math.min(tabSwitches.current * 20, 100)
      const deleteRatio = typingEvents.current > 0 ? deleteEvents.current / typingEvents.current : 0
      const deleteScore = Math.min(deleteRatio * 100, 100)
      const hoverAvg    = hoverTimes.current.length > 0 ? hoverTimes.current.reduce((a,b)=>a+b,0)/hoverTimes.current.length : 0
      const hesitScore  = Math.min(hoverAvg / 40, 100)
      const raw = rageScore*0.30 + scrollScore*0.20 + tabScore*0.20 + deleteScore*0.15 + hesitScore*0.15
      const score = Math.min(Math.round(raw), 100)
      setLoadScore(score)

      let newState: LoadState = 'calm'
      let reason = ''
      if (score > 70 * t)      { newState = 'overwhelmed'; reason = rageClicks.current > 0 ? 'Repeated rapid clicking detected' : 'High activity patterns' }
      else if (score > 50 * t) { newState = 'distracted';  reason = tabSwitches.current > 2 ? 'Frequent tab switching' : 'Scattered interaction patterns' }
      else if (score > 25 * t) { newState = 'focused';     reason = 'Steady, consistent engagement' }
      else                      { newState = 'calm';        reason = 'Low activity — relaxed state' }

      setLoadState(newState)

      // Only log and notify on actual state CHANGE
      if (newState !== lastState.current) {
        lastState.current = newState
        const event: LoadEvent = { time: Date.now(), state: newState, reason }
        setHistory(h => [...h, event].slice(-20))
        addLog(reason, true)  // force log on state change
        sendNotification(newState)
      }

      // Reset counters
      rageClicks.current = 0; tabSwitches.current = 0
      scrollSpeed.current = 0; typingEvents.current = 0; deleteEvents.current = 0
    }, 5000)
    return () => clearInterval(interval)
  }, [threshold, addLog, sendNotification])

  return {
    loadState, loadScore, history, adaptLog,
    sessionMinutes: Math.round((Date.now() - sessionStart) / 60000)
  }
}
