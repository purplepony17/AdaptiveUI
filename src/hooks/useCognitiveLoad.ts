import { useEffect, useRef, useState, useCallback } from 'react'
import { LoadState } from '../lib/supabase'

export type LoadEvent = {
  time: number
  state: LoadState
  reason: string
}

export function useCognitiveLoad(sensitivity: number = 50) {
  const [loadState, setLoadState]   = useState<LoadState>('calm')
  const [loadScore, setLoadScore]   = useState(0)
  const [history, setHistory]       = useState<LoadEvent[]>([])
  const [adaptLog, setAdaptLog]     = useState<string[]>([])
  const [sessionStart]              = useState(Date.now())

  const clicks        = useRef(0)
  const rageClicks    = useRef(0)
  const scrollSpeed   = useRef(0)
  const lastScroll    = useRef(Date.now())
  const lastScrollY   = useRef(0)
  const tabSwitches   = useRef(0)
  const lastActive    = useRef(Date.now())
  const hoverTimes    = useRef<number[]>([])
  const typingEvents  = useRef(0)
  const deleteEvents  = useRef(0)

  const threshold = sensitivity / 100

  const addAdaptLog = useCallback((msg: string) => {
    setAdaptLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 20))
  }, [])

  // Track clicks (rage clicks = multiple rapid clicks)
  useEffect(() => {
    let lastClickTime = 0
    let rapidCount = 0

    function handleClick() {
      const now = Date.now()
      clicks.current++
      if (now - lastClickTime < 500) {
        rapidCount++
        if (rapidCount >= 3) {
          rageClicks.current++
          rapidCount = 0
        }
      } else {
        rapidCount = 0
      }
      lastClickTime = now
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Track scroll speed
  useEffect(() => {
    function handleScroll() {
      const now = Date.now()
      const delta = Math.abs(window.scrollY - lastScrollY.current)
      const elapsed = now - lastScroll.current
      scrollSpeed.current = elapsed > 0 ? delta / elapsed : 0
      lastScroll.current = now
      lastScrollY.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track visibility / tab switching
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        tabSwitches.current++
        lastActive.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Track typing and deleting
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteEvents.current++
      } else if (e.key.length === 1) {
        typingEvents.current++
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Track hover hesitation
  useEffect(() => {
    let hoverStart = 0
    function handleMouseOver() { hoverStart = Date.now() }
    function handleMouseOut() {
      const dur = Date.now() - hoverStart
      if (dur > 800 && dur < 5000) hoverTimes.current.push(dur)
      if (hoverTimes.current.length > 20) hoverTimes.current.shift()
    }
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mouseout', handleMouseOut)
    return () => {
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  // Calculate load score every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const t = threshold

      // Score components (0-100 each)
      const rageScore    = Math.min(rageClicks.current * 25, 100)
      const scrollScore  = Math.min(scrollSpeed.current * 200, 100)
      const tabScore     = Math.min(tabSwitches.current * 20, 100)
      const deleteRatio  = typingEvents.current > 0 ? deleteEvents.current / typingEvents.current : 0
      const deleteScore  = Math.min(deleteRatio * 100, 100)
      const hoverAvg     = hoverTimes.current.length > 0
        ? hoverTimes.current.reduce((a, b) => a + b, 0) / hoverTimes.current.length
        : 0
      const hesitScore   = Math.min(hoverAvg / 40, 100)

      const raw = (
        rageScore   * 0.30 +
        scrollScore * 0.20 +
        tabScore    * 0.20 +
        deleteScore * 0.15 +
        hesitScore  * 0.15
      )

      const adjusted = Math.min(Math.round(raw), 100)
      setLoadScore(adjusted)

      // Determine state
      let newState: LoadState = 'calm'
      let reason = ''

      if (adjusted > 70 * t) {
        newState = 'overwhelmed'
        reason = rageClicks.current > 0
          ? 'Detected repeated clicking and rapid scrolling'
          : 'High activity patterns detected'
      } else if (adjusted > 50 * t) {
        newState = 'distracted'
        reason = tabSwitches.current > 2
          ? 'Frequent tab switching detected'
          : 'Scattered interaction patterns'
      } else if (adjusted > 25 * t) {
        newState = 'focused'
        reason = 'Steady, consistent engagement'
      } else {
        newState = 'calm'
        reason = 'Low activity — relaxed state'
      }

      setLoadState(prev => {
        if (prev !== newState) {
          setHistory(h => [...h, { time: Date.now(), state: newState, reason }].slice(-20))
          if (newState === 'overwhelmed') addAdaptLog('Emergency overload mode activated')
          else if (newState === 'distracted') addAdaptLog('Focus mode gently suggested')
          else if (newState === 'calm') addAdaptLog('Interface relaxed — you seem calm')
        }
        return newState
      })

      // Reset counters
      rageClicks.current   = 0
      tabSwitches.current  = 0
      scrollSpeed.current  = 0
      typingEvents.current = 0
      deleteEvents.current = 0

    }, 5000)

    return () => clearInterval(interval)
  }, [threshold, addAdaptLog])

  const sessionMinutes = Math.round((Date.now() - sessionStart) / 60000)

  return { loadState, loadScore, history, adaptLog, sessionMinutes }
}
