import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCognitiveLoad, LoadEvent } from '../hooks/useCognitiveLoad'
import { usePomodoro } from '../hooks/usePomodoro'
import { PlantLogo } from '../components/PlantLogo'
import { Profile } from '../lib/supabase'
import styles from './Dashboard.module.css'

type Section = 'load' | 'modes' | 'pomodoro' | 'text' | 'themes' | 'privacy'

const THEMES = [
  { id: 'sage',          label: 'Sage garden',   bg: '#f8f4ee', accent: '#6b9b6f' },
  { id: 'parchment',     label: 'Parchment',     bg: '#faf6ef', accent: '#a08060' },
  { id: 'sky',           label: 'Cool sky',      bg: '#f2f7fc', accent: '#4a7fa8' },
  { id: 'dark_moss',     label: 'Dark moss',     bg: '#111a11', accent: '#7ab87e' },
  { id: 'dark_warm',     label: 'Dark warm',     bg: '#1a1410', accent: '#c8a46e' },
  { id: 'high_contrast', label: 'High contrast', bg: '#ffffff', accent: '#0000cc' },
]

const FONTS = [
  { id: 'lexend',       label: 'Lexend',        sample: 'The quick brown fox' },
  { id: 'opendyslexic', label: 'OpenDyslexic',  sample: 'The quick brown fox' },
  { id: 'arial',        label: 'Arial',          sample: 'The quick brown fox' },
  { id: 'system',       label: 'System default', sample: 'The quick brown fox' },
]

const LOAD_CONFIG = {
  calm:        { label: 'Calm',        color: '#6b9b6f', bg: '#edf4ee', emoji: '🌱', desc: 'You\'re in a relaxed, steady state.' },
  focused:     { label: 'Focused',     color: '#4a7fa8', bg: '#e4f0f8', emoji: '🎯', desc: 'Deep focus detected. Great work!' },
  distracted:  { label: 'Distracted', color: '#c8a46e', bg: '#f5ede0', emoji: '🍃', desc: 'Some scattered activity noticed.' },
  overwhelmed: { label: 'Overwhelmed', color: '#c87a7a', bg: '#fdf0f0', emoji: '🌊', desc: 'High load detected. Take a breath.' },
}

export default function Dashboard() {
  const { profile, updateProfile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('load')
  const [showOverload, setShowOverload] = useState(false)
  const [rulerY, setRulerY] = useState(200)
  const rulerRef = useRef(false)

  const { loadState, loadScore, history, adaptLog, sessionMinutes } =
    useCognitiveLoad(profile?.sensitivity ?? 50)

  const pomodoro = usePomodoro(
    profile?.pomodoro_work ?? 25,
    profile?.pomodoro_break ?? 5
  )

  // Apply theme to document
  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme)
    }
    if (profile?.low_stim) {
      document.documentElement.setAttribute('data-low-stim', 'true')
    } else {
      document.documentElement.removeAttribute('data-low-stim')
    }
    if (profile?.laser_cursor) {
      document.documentElement.setAttribute('data-laser', 'true')
    } else {
      document.documentElement.removeAttribute('data-laser')
    }
  }, [profile])

  // Auto-show overload overlay
  useEffect(() => {
    if (loadState === 'overwhelmed' && profile?.auto_adapt) {
      setShowOverload(true)
    } else {
      setShowOverload(false)
    }
  }, [loadState, profile?.auto_adapt])

  // Reading ruler
  useEffect(() => {
    if (!profile?.dyslexia_ruler) return
    function handleMove(e: MouseEvent) { setRulerY(e.clientY - 18) }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [profile?.dyslexia_ruler])

  if (!profile) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--font-display)', color:'var(--text-soft)', fontSize:20 }}>
      Loading your garden...
    </div>
  )

  async function toggle(key: keyof Profile) {
    await updateProfile({ [key]: !profile[key as keyof typeof profile] })
  }

  const cfg = LOAD_CONFIG[loadState]

  return (
    <>
      {/* Reading ruler */}
      {profile.dyslexia_ruler && (
        <div className="reading-ruler" style={{ top: rulerY }} aria-hidden />
      )}

      {/* Emergency overload overlay */}
      {showOverload && (
        <div className="overload-overlay" role="dialog" aria-label="Overload detected">
          <div className="overload-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌊</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 10 }}>
              Let's take a breath
            </h2>
            <p style={{ color: 'var(--text-mid)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              We noticed some signs of overload. It's okay to slow down.
              Take a moment before continuing.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowOverload(false)}>
                I'm okay, continue
              </button>
              <button className="btn btn-ghost" onClick={() => { updateProfile({ low_stim: true, reduce_clutter: true }); setShowOverload(false) }}>
                Simplify everything
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.brand}>
              <PlantLogo size={36} />
              <div>
                <p className={styles.brandName}>Gentle Browse</p>
                <p className={styles.brandSub}>{profile.display_name || 'Friend'}</p>
              </div>
            </div>

            {/* Load state pill */}
            <div className={styles.loadPill} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
              <span className={styles.loadScore}>{loadScore}</span>
            </div>

            <nav className={styles.nav}>
              {([
                ['load',    'Cognitive load'],
                ['modes',   'Adaptive modes'],
                ['pomodoro','Pomodoro timer'],
                ['text',    'Text settings'],
                ['themes',  'Themes'],
                ['privacy', 'Privacy'],
              ] as [Section, string][]).map(([id, label]) => (
                <button key={id}
                  className={`${styles.navBtn} ${section === id ? styles.navActive : ''}`}
                  onClick={() => setSection(id)}>
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <button className={styles.signOut} onClick={async () => { await signOut(); navigate('/') }}>
            Sign out
          </button>
        </aside>

        {/* ── Main ── */}
        <main className={styles.main}>

          {/* ── Cognitive Load ── */}
          {section === 'load' && (
            <div>
              <h2 className={styles.title}>Cognitive load meter</h2>
              <p className={styles.sub}>Tracks your behavior patterns to understand how you're feeling right now.</p>

              {/* Big state card */}
              <div className={styles.stateCard} style={{ background: cfg.bg, borderColor: `${cfg.color}40` }}>
                <div className={styles.stateEmoji}>{cfg.emoji}</div>
                <div>
                  <p className={styles.stateLabel} style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className={styles.stateDesc}>{cfg.desc}</p>
                </div>
                <div className={styles.stateScore} style={{ color: cfg.color }}>
                  {loadScore}<span style={{ fontSize: 14, opacity: 0.6 }}>/100</span>
                </div>
              </div>

              {/* Score bar */}
              <div className={styles.scoreBarWrap}>
                <div className={styles.scoreBar}>
                  <div className={styles.scoreBarFill}
                    style={{
                      width: `${loadScore}%`,
                      background: loadScore > 70 ? '#c87a7a' : loadScore > 40 ? '#c8a46e' : '#6b9b6f'
                    }} />
                </div>
                <p className={styles.scoreHint}>Session: {sessionMinutes} min</p>
              </div>

              {/* Stats grid */}
              <div className={styles.statsGrid}>
                {[
                  { label: 'Current state', value: cfg.label },
                  { label: 'Load score', value: `${loadScore}/100` },
                  { label: 'Session time', value: `${sessionMinutes}m` },
                  { label: 'State changes', value: String(history.length) },
                ].map(s => (
                  <div key={s.label} className={styles.statCard}>
                    <p className={styles.statLabel}>{s.label}</p>
                    <p className={styles.statValue}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Activity log */}
              <h3 className={styles.subTitle}>Real-time adaptation feed</h3>
              <div className={styles.logBox}>
                {adaptLog.length === 0
                  ? <p style={{ color: 'var(--text-soft)', fontSize: 13, fontStyle: 'italic' }}>Monitoring your activity...</p>
                  : adaptLog.map((entry, i) => (
                    <div key={i} className={styles.logEntry}>
                      <span className={styles.logDot} />
                      {entry}
                    </div>
                  ))
                }
              </div>

              {/* History */}
              {history.length > 0 && (
                <>
                  <h3 className={styles.subTitle} style={{ marginTop: 20 }}>State history</h3>
                  <div className={styles.historyList}>
                    {[...history].reverse().slice(0, 8).map((h: LoadEvent, i) => {
                      const c = LOAD_CONFIG[h.state]
                      return (
                        <div key={i} className={styles.historyItem}>
                          <span style={{ color: c.color }}>{c.emoji} {c.label}</span>
                          <span className={styles.historyReason}>{h.reason}</span>
                          <span className={styles.historyTime}>{new Date(h.time).toLocaleTimeString()}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Adaptive Modes ── */}
          {section === 'modes' && (
            <div>
              <h2 className={styles.title}>Adaptive modes</h2>
              <p className={styles.sub}>Toggle manually, or let the AI enable them automatically based on your load state.</p>

              <div className={styles.modeGrid}>
                {[
                  { key: 'focus_mode',      label: 'Focus mode',              desc: 'Dims surroundings, highlights main content. Best for ADHD.', badge: 'ADHD' },
                  { key: 'low_stim',        label: 'Low-stimulation mode',    desc: 'Removes animations and mutes vibrant colors. Best for autism.', badge: 'Autism' },
                  { key: 'reduce_clutter',  label: 'Clear clutter',           desc: 'Hides ads, sidebars, and pop-ups on any website.', badge: 'All' },
                  { key: 'chunk_mode',      label: 'Task chunking',           desc: 'Numbers headings so long content feels manageable.', badge: 'ADHD' },
                  { key: 'laser_cursor',    label: 'Laser cursor',            desc: 'Glowing dot cursor helps you follow text.', badge: 'Focus' },
                  { key: 'dyslexia_ruler',  label: 'Reading ruler',           desc: 'A highlight bar follows your mouse to guide reading.', badge: 'Dyslexia' },
                  { key: 'auto_adapt',      label: 'Auto-adapt',              desc: 'AI automatically enables modes based on your load state.', badge: 'AI' },
                ].map(m => {
                  const on = profile[m.key as keyof Profile] as boolean
                  return (
                    <div key={m.key} className={`${styles.modeCard} ${on ? styles.modeCardOn : ''}`}>
                      <div className={styles.modeTop}>
                        <div>
                          <span className={styles.modeBadge}>{m.badge}</span>
                          <p className={styles.modeLabel}>{m.label}</p>
                        </div>
                        <label className="switch" aria-label={m.label}>
                          <input type="checkbox" checked={on} onChange={() => toggle(m.key as keyof Profile)} />
                          <span className="switch-track" />
                        </label>
                      </div>
                      <p className={styles.modeDesc}>{m.desc}</p>
                      {on && <div className={styles.modeActive}>Active</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Pomodoro ── */}
          {section === 'pomodoro' && (
            <div>
              <h2 className={styles.title}>Pomodoro timer</h2>
              <p className={styles.sub}>Work in focused bursts with built-in breaks. Helps with ADHD and focus difficulties.</p>

              {/* Timer display */}
              <div className={styles.pomodoroCard}>
                <div className={styles.pomodoroPhase}
                  style={{ color: pomodoro.phase === 'break' ? '#4a7fa8' : pomodoro.phase === 'work' ? 'var(--accent)' : 'var(--text-soft)' }}>
                  {pomodoro.phase === 'idle' ? 'Ready to focus?' : pomodoro.phase === 'work' ? 'Focus time' : 'Take a break'}
                </div>

                {/* Circular progress */}
                <div className={styles.pomodoroCircle}>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="8"/>
                    <circle cx="80" cy="80" r="68" fill="none"
                      stroke={pomodoro.phase === 'break' ? '#4a7fa8' : 'var(--accent)'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={`${2 * Math.PI * 68 * (1 - pomodoro.progress)}`}
                      transform="rotate(-90 80 80)"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className={styles.pomodoroTime}>{pomodoro.display}</div>
                </div>

                <div className={styles.pomodoroSessions}>
                  {Array.from({ length: Math.max(pomodoro.sessions, 4) }).map((_, i) => (
                    <div key={i} className={styles.pomodoroSession}
                      style={{ background: i < pomodoro.sessions ? 'var(--accent)' : 'var(--border)' }} />
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--text-soft)', marginLeft: 8 }}>
                    {pomodoro.sessions} sessions
                  </span>
                </div>

                <div className={styles.pomodoroControls}>
                  {!pomodoro.running
                    ? <button className="btn btn-primary" onClick={pomodoro.start}>
                        {pomodoro.phase === 'idle' ? 'Start focusing' : 'Resume'}
                      </button>
                    : <button className="btn btn-ghost" onClick={pomodoro.pause}>Pause</button>
                  }
                  <button className="btn btn-ghost btn-sm" onClick={pomodoro.skip}>Skip</button>
                  <button className="btn btn-ghost btn-sm" onClick={pomodoro.reset}>Reset</button>
                </div>
              </div>

              {/* Duration settings */}
              <h3 className={styles.subTitle}>Session lengths</h3>
              <div className="card" style={{ marginTop: 12 }}>
                <SliderRow label="Focus duration" value={profile.pomodoro_work} min={5} max={60} step={5} unit=" min"
                  onChange={v => updateProfile({ pomodoro_work: v })} />
                <SliderRow label="Break duration" value={profile.pomodoro_break} min={1} max={30} step={1} unit=" min" last
                  onChange={v => updateProfile({ pomodoro_break: v })} />
              </div>
            </div>
          )}

          {/* ── Text settings ── */}
          {section === 'text' && (
            <div>
              <h2 className={styles.title}>Text settings</h2>
              <p className={styles.sub}>Adjust how text looks everywhere on the web.</p>

              <div className="card" style={{ marginBottom: 20 }}>
                <SliderRow label="Font size" value={profile.font_size} min={14} max={26} unit="px"
                  onChange={v => { updateProfile({ font_size: v }); document.documentElement.style.setProperty('--font-size', v + 'px') }} />
                <SliderRow label="Line spacing" value={Math.round(profile.line_height * 10)} min={14} max={24}
                  display={v => (v/10).toFixed(1)}
                  onChange={v => { updateProfile({ line_height: v/10 }); document.documentElement.style.setProperty('--line-height', String(v/10)) }} />
                <SliderRow label="Column width" value={profile.column_width} min={40} max={90} step={5} unit=" ch"
                  onChange={v => updateProfile({ column_width: v })} />
                <SliderRow label="Sensitivity" value={profile.sensitivity} min={10} max={100} unit="%"
                  onChange={v => updateProfile({ sensitivity: v })} />
                <ToggleRow label="Left-align text" desc="Overrides centered/justified layouts" checked={profile.left_align} onChange={() => toggle('left_align')} />
                <ToggleRow label="Off-white background" desc="Warm cream instead of pure white — easier for dyslexic readers" checked={profile.off_white_bg} onChange={() => toggle('off_white_bg')} last />
              </div>

              <h3 className={styles.subTitle}>Font family</h3>
              <div className={styles.fontGrid}>
                {FONTS.map(f => (
                  <button key={f.id} aria-pressed={profile.font_family === f.id}
                    className={`${styles.fontCard} ${profile.font_family === f.id ? styles.fontCardOn : ''}`}
                    onClick={() => updateProfile({ font_family: f.id as any })}>
                    <span className={styles.fontName}>{f.label}</span>
                    <span className={styles.fontSample} style={{ fontFamily: f.id === 'arial' ? 'Arial' : f.id === 'system' ? 'system-ui' : f.id === 'lexend' ? 'Lexend' : 'Arial' }}>
                      {f.sample}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Themes ── */}
          {section === 'themes' && (
            <div>
              <h2 className={styles.title}>Color themes</h2>
              <p className={styles.sub}>Choose what feels comfortable for your eyes. Changes apply instantly.</p>
              <div className={styles.themeGrid}>
                {THEMES.map(t => (
                  <button key={t.id} aria-pressed={profile.theme === t.id}
                    className={`${styles.themeCard} ${profile.theme === t.id ? styles.themeCardOn : ''}`}
                    onClick={() => { updateProfile({ theme: t.id as any }); document.documentElement.setAttribute('data-theme', t.id) }}>
                    <div className={styles.themePreview} style={{ background: t.bg }}>
                      <div style={{ background: t.accent, width: 24, height: 24, borderRadius: '50%', marginBottom: 6 }} />
                      <div style={{ background: t.accent, height: 5, borderRadius: 3, width: '70%', opacity: 0.5, marginBottom: 4 }} />
                      <div style={{ background: t.accent, height: 4, borderRadius: 3, width: '50%', opacity: 0.3 }} />
                    </div>
                    <p className={styles.themeLabel}>{t.label}</p>
                    {profile.theme === t.id && <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>Current</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {section === 'privacy' && (
            <div>
              <h2 className={styles.title}>Privacy controls</h2>
              <p className={styles.sub}>You are always in control. We never sell your data.</p>

              <div className={styles.privacyBanner}>
                <span style={{ fontSize: 24 }}>🔒</span>
                <div>
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>Privacy-first by design</p>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                    All behavioral tracking happens locally in your browser.
                    Nothing is sent to any server. Your browsing data never leaves your device.
                  </p>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <ToggleRow label="Local-only processing" desc="All cognitive load analysis stays on your device — never uploaded" checked={profile.privacy_local_only} onChange={() => toggle('privacy_local_only')} />
                <ToggleRow label="Auto-adapt with AI" desc="Automatically enable accessibility modes when overload is detected" checked={profile.auto_adapt} onChange={() => toggle('auto_adapt')} last />
              </div>

              <div className={styles.privacyList}>
                {[
                  'Behavioral data never stored on servers',
                  'No tracking across websites',
                  'No data sold to third parties',
                  'Open source — verify the code yourself',
                  'Delete your account and all data anytime',
                ].map(item => (
                  <div key={item} className={styles.privacyItem}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  )
}

// ── Reusable sub-components ───────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange, last }: {
  label: string; desc?: string; checked: boolean; onChange: () => void; last?: boolean
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom: last ? 'none' : '1px solid var(--border)', gap: 16 }}>
      <div>
        <p style={{ fontSize:14, color:'var(--text)' }}>{label}</p>
        {desc && <p style={{ fontSize:12, color:'var(--text-soft)', marginTop:2 }}>{desc}</p>}
      </div>
      <label className="switch" aria-label={label}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="switch-track" />
      </label>
    </div>
  )
}

function SliderRow({ label, value, min, max, step=1, unit='', display, onChange, last }: {
  label: string; value: number; min: number; max: number; step?: number
  unit?: string; display?: (v:number)=>string; onChange:(v:number)=>void; last?: boolean
}) {
  return (
    <div style={{ padding:'14px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:14, color:'var(--text)' }}>{label}</span>
        <span style={{ fontSize:13, color:'var(--text-soft)' }}>{display ? display(value) : value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ width:'100%', accentColor:'var(--accent)' }}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}
