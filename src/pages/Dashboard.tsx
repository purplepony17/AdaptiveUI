import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCognitiveLoad } from '../hooks/useCognitiveLoad'
import { usePomodoro } from '../hooks/usePomodoro'
import { PlantLogo } from '../components/PlantLogo'
import { Profile } from '../lib/supabase'
import styles from './Dashboard.module.css'

type Section = 'load' | 'modes' | 'pomodoro' | 'text' | 'themes' | 'privacy'

const THEMES = [
  { id:'sage',          label:'Sage garden',   bg:'#f8f4ee', accent:'#6b9b6f', text:'#2e3a2f' },
  { id:'parchment',     label:'Parchment',     bg:'#faf6ef', accent:'#a08060', text:'#3a2e1e' },
  { id:'sky',           label:'Cool sky',      bg:'#f2f7fc', accent:'#4a7fa8', text:'#1a2e3a' },
  { id:'dark_moss',     label:'Dark moss',     bg:'#111a11', accent:'#7ab87e', text:'#d4e8d4' },
  { id:'dark_warm',     label:'Dark warm',     bg:'#1a1410', accent:'#c8a46e', text:'#e8d8c4' },
  { id:'high_contrast', label:'High contrast', bg:'#ffffff', accent:'#0000cc', text:'#000000' },
]

const FONTS = [
  { id:'lexend',       label:'Lexend',        sub:'Clear and easy to read' },
  { id:'opendyslexic', label:'OpenDyslexic',  sub:'Designed for dyslexia' },
  { id:'arial',        label:'Arial',          sub:'Simple and familiar' },
  { id:'system',       label:'System default', sub:'Your device font' },
]

const LOAD_CFG = {
  calm:        { label:'Calm',        color:'#6b9b6f', bg:'#edf4ee', pct:12  },
  focused:     { label:'Focused',     color:'#4a7fa8', bg:'#e4f0f8', pct:42  },
  distracted:  { label:'Distracted',  color:'#c8a46e', bg:'#f5ede0', pct:65  },
  overwhelmed: { label:'Overwhelmed', color:'#c87a7a', bg:'#fdf0f0', pct:88  },
}

function LoadRing({ score, color }: { score: number; color: string }) {
  const r = 52, circ = 2 * Math.PI * r
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden>
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--border)" strokeWidth="10"/>
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - (score/100)*circ}
        transform="rotate(-90 65 65)"
        style={{ transition:'stroke-dashoffset 1.2s ease, stroke 0.5s' }}/>
      <text x="65" y="60" textAnchor="middle" fill="var(--text)"
        style={{ fontSize:26, fontWeight:600, fontFamily:'var(--font-display)' }}>{score}</text>
      <text x="65" y="78" textAnchor="middle" fill="var(--text-soft)"
        style={{ fontSize:11, fontFamily:'var(--font-body)' }}>/ 100</text>
    </svg>
  )
}

export default function Dashboard() {
  const { profile, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('load')
  const [showOverload, setShowOverload] = useState(false)
  const [extensionOn, setExtensionOn] = useState(true)
  const [rulerY, setRulerY] = useState(200)

  const { loadState, loadScore, history, adaptLog, sessionMinutes } =
    useCognitiveLoad(profile?.sensitivity ?? 50)
  const pomodoro = usePomodoro(profile?.pomodoro_work ?? 25, profile?.pomodoro_break ?? 5)

  useEffect(() => {
    if (profile?.theme) document.documentElement.setAttribute('data-theme', profile.theme)
  }, [profile?.theme])

  useEffect(() => {
    if (loadState === 'overwhelmed' && profile?.auto_adapt) setShowOverload(true)
    else setShowOverload(false)
  }, [loadState, profile?.auto_adapt])

  useEffect(() => {
    if (!profile?.dyslexia_ruler) return
    const fn = (e: MouseEvent) => setRulerY(e.clientY - 18)
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [profile?.dyslexia_ruler])

  if (!profile) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-soft)', fontSize:20 }}>
      Loading your garden...
    </div>
  )

  async function toggle(key: keyof Profile) {
    await updateProfile({ [key]: !profile[key as keyof typeof profile] })
  }

  const cfg = LOAD_CFG[loadState]
  const histBars = [...Array(8)].map((_, i) => {
    const h = history[history.length - 8 + i]
    return h ? { pct: LOAD_CFG[h.state].pct, color: LOAD_CFG[h.state].color }
             : { pct: 8, color: 'var(--border)' }
  })

  return (
    <>
      {profile.dyslexia_ruler && (
        <div className="reading-ruler" style={{ top: rulerY }} aria-hidden />
      )}

      {showOverload && (
        <div className="overload-overlay" role="dialog">
          <div className="overload-card">
            <div style={{ fontSize:52, marginBottom:16 }}>🌊</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:10 }}>Take a breath</h2>
            <p style={{ color:'var(--text-mid)', fontSize:15, lineHeight:1.6, marginBottom:24 }}>
              We noticed signs of overload. It's okay to slow down.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowOverload(false)}>I'm okay, continue</button>
              <button className="btn btn-ghost" onClick={() => { updateProfile({ low_stim:true, reduce_clutter:true }); setShowOverload(false) }}>Simplify everything</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <div>
            {/*
              TO USE YOUR OWN LOGO:
              1. Save your image to src/assets/haven-logo.png
              2. Replace the PlantLogo below with:
                 <img src="/src/assets/haven-logo.png" alt="Haven" width={38} height={38}
                   style={{borderRadius:'50%', border:'2px solid var(--border-mid)'}} />
            */}
            <div className={styles.brand}>
              <PlantLogo size={38} />
              <div>
                <p className={styles.brandName}>Haven</p>
                <p className={styles.brandSub}>{profile.display_name || 'Friend'}</p>
              </div>
            </div>

            <div className={styles.loadPill}
              style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}30` }}>
              <span className={styles.loadDot} style={{ background:cfg.color }}/>
              {cfg.label}
              <span className={styles.loadScore}>{loadScore}</span>
            </div>

            <div className={styles.extToggle}>
              <div>
                <p className={styles.extToggleLabel}>Extension active</p>
                <p className={styles.extToggleSub}>{extensionOn ? 'Applying to all pages' : 'Paused'}</p>
              </div>
              <label className="switch" aria-label="Toggle extension on or off">
                <input type="checkbox" checked={extensionOn}
                  onChange={() => setExtensionOn(v => !v)} />
                <span className="switch-track"/>
              </label>
            </div>

            <nav className={styles.nav}>
              {([
                ['load',    'Cognitive load'],
                ['modes',   'Features'],
                ['pomodoro','Pomodoro timer'],
                ['text',    'Text settings'],
                ['themes',  'Themes'],
                ['privacy', 'Privacy'],
              ] as [Section, string][]).map(([id, label]) => (
                <button key={id}
                  className={`${styles.navBtn} ${section===id?styles.navActive:''}`}
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

        <main className={styles.main}>

          {/* ── Cognitive load ── */}
          {section === 'load' && (
            <div>
              <h2 className={styles.title}>Cognitive load</h2>
              <p className={styles.sub}>Tracks your behavior to understand how you're feeling. All data stays on your device.</p>

              <div className={styles.meterCard} style={{ borderColor:`${cfg.color}35`, background:cfg.bg }}>
                <LoadRing score={loadScore} color={cfg.color}/>
                <div>
                  <p className={styles.meterState} style={{ color:cfg.color }}>{cfg.label}</p>
                  <p className={styles.meterDesc}>
                    {cfg.label === 'Calm' && "You're in a relaxed, steady state."}
                    {cfg.label === 'Focused' && "Deep focus detected. Great work!"}
                    {cfg.label === 'Distracted' && "Some scattered activity noticed."}
                    {cfg.label === 'Overwhelmed' && "High load detected. Take a breath."}
                  </p>
                  <p className={styles.meterTime}>Session: {sessionMinutes} min</p>
                </div>
              </div>

              <h3 className={styles.subTitle}>Load history</h3>
              <div className={styles.barChart}>
                {histBars.map((b, i) => (
                  <div key={i} className={styles.barWrap}>
                    <div className={styles.barInner}>
                      <div className={styles.barFill}
                        style={{ height:`${b.pct}%`, background:b.color }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.barLegend}>
                {Object.entries(LOAD_CFG).map(([k, v]) => (
                  <div key={k} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background:v.color }}/>
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.statsGrid}>
                {[
                  { label:'Current state', value:cfg.label },
                  { label:'Load score',    value:`${loadScore}/100` },
                  { label:'Session time',  value:`${sessionMinutes}m` },
                  { label:'State changes', value:String(history.length) },
                ].map(s => (
                  <div key={s.label} className={styles.statCard}>
                    <p className={styles.statLabel}>{s.label}</p>
                    <p className={styles.statValue}>{s.value}</p>
                  </div>
                ))}
              </div>

              <h3 className={styles.subTitle}>Real-time feed</h3>
              <div className={styles.logBox}>
                {adaptLog.length === 0
                  ? <p style={{ color:'var(--text-soft)', fontSize:13, fontStyle:'italic' }}>Monitoring your activity...</p>
                  : adaptLog.map((e, i) => (
                    <div key={i} className={styles.logEntry}>
                      <span className={styles.logDot}/>
                      {e}
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── Features ── */}
          {section === 'modes' && (
            <div>
              <h2 className={styles.title}>Features</h2>
              <p className={styles.sub}>These match exactly what the extension applies on websites you visit.</p>

              <div className={styles.featureGrid}>
                {[
                  { key:'focus_mode',     label:'Focus mode',      desc:'Dims the page around main content. Bold text gets highlighted, headings get underlined.',  shortcut:'Alt+F', badge:'ADHD' },
                  { key:'low_stim',       label:'Low-stimulation', desc:'Blacks out images and stops all animations to reduce sensory input.',                        shortcut:'Alt+L', badge:'Autism' },
                  { key:'reduce_clutter', label:'Clear clutter',   desc:'Hides ads, sidebars, pop-ups, cookie banners and promotional content.',                      shortcut:'Alt+C', badge:'All' },
                  { key:'chunk_mode',     label:'Chunk content',   desc:'Numbers every heading so long articles feel manageable.',                                     shortcut:'Alt+K', badge:'ADHD' },
                  { key:'dyslexia_ruler', label:'Reading ruler',   desc:'A semi-transparent bar follows your mouse to help you track which line you\'re reading.',    shortcut:'Alt+R', badge:'Dyslexia' },
                  
                ].map(m => {
                  const on = profile[m.key as keyof Profile] as boolean
                  return (
                    <div key={m.key} className={`${styles.featureCard} ${on?styles.featureCardOn:''}`}>
                      <div className={styles.featureTop}>
                        <div>
                          <span className={styles.featureBadge}>{m.badge}</span>
                          <p className={styles.featureLabel}>{m.label}</p>
                        </div>
                        <label className="switch" aria-label={m.label}>
                          <input type="checkbox" checked={on} onChange={() => toggle(m.key as keyof Profile)}/>
                          <span className="switch-track"/>
                        </label>
                      </div>
                      <p className={styles.featureDesc}>{m.desc}</p>
                      <div className={styles.featureFooter}>
                        {on && <span className={styles.featureActive}>Active</span>}
                        <span className={styles.featureShortcut}>{m.shortcut}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <h3 className={styles.subTitle} style={{ marginTop:28 }}>Keyboard shortcuts</h3>
              <div className={styles.shortcutList}>
                {[
                  ['Alt+F / Option+F','Focus mode'],
                  ['Alt+L','Low-stimulation'],
                  ['Alt+C','Clear clutter'],
                  ['Alt+K','Chunk content'],
                  ['Alt+R','Reading ruler'],
                  ['Alt+T','Start / pause timer'],
                  ['Alt+S','Summarize selected text'],
                ].map(([k,d]) => (
                  <div key={k} className={styles.shortcutRow}>
                    <span className={styles.shortcutDesc}>{d}</span>
                    <kbd className={styles.shortcutKey}>{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pomodoro ── */}
          {section === 'pomodoro' && (
            <div>
              <h2 className={styles.title}>Pomodoro timer</h2>
              <p className={styles.sub}>Work in focused bursts with built-in breaks. Shortcut: Alt+T.</p>

              <div className={styles.pomCard}>
                <div className={styles.pomPhase}
                  style={{ color:pomodoro.phase==='break'?'#4a7fa8':pomodoro.phase==='work'?'var(--accent)':'var(--text-soft)' }}>
                  {pomodoro.phase==='idle'?'Ready?':pomodoro.phase==='work'?'Focus time':'Take a break'}
                </div>
                <div className={styles.pomCircle}>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="68" fill="none" stroke="var(--border)" strokeWidth="8"/>
                    <circle cx="80" cy="80" r="68" fill="none"
                      stroke={pomodoro.phase==='break'?'#4a7fa8':'var(--accent)'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*68}`}
                      strokeDashoffset={`${2*Math.PI*68*(1-pomodoro.progress)}`}
                      transform="rotate(-90 80 80)"
                      style={{ transition:'stroke-dashoffset 1s linear' }}/>
                  </svg>
                  <div className={styles.pomTime}>{pomodoro.display}</div>
                </div>
                <div className={styles.pomSessions}>
                  {Array.from({length:Math.max(pomodoro.sessions,4)}).map((_,i)=>(
                    <div key={i} className={styles.pomDot}
                      style={{ background:i<pomodoro.sessions?'var(--accent)':'var(--border)' }}/>
                  ))}
                  <span style={{ fontSize:12, color:'var(--text-soft)', marginLeft:6 }}>
                    {pomodoro.sessions} sessions
                  </span>
                </div>
                <div className={styles.pomControls}>
                  {!pomodoro.running
                    ? <button className="btn btn-primary" onClick={pomodoro.start}>
                        {pomodoro.phase==='idle'?'Start focusing':'Resume'}
                      </button>
                    : <button className="btn btn-ghost" onClick={pomodoro.pause}>Pause</button>
                  }
                  <button className="btn btn-ghost" style={{ padding:'10px 16px', fontSize:14 }} onClick={pomodoro.skip}>Skip</button>
                  <button className="btn btn-ghost" style={{ padding:'10px 16px', fontSize:14 }} onClick={pomodoro.reset}>Reset</button>
                </div>
              </div>

              <h3 className={styles.subTitle}>Session lengths</h3>
              <div className="card" style={{ marginTop:12 }}>
                <SliderRow label="Focus duration" value={profile.pomodoro_work} min={5} max={60} step={5} unit=" min"
                  onChange={v => updateProfile({ pomodoro_work:v })}/>
                <SliderRow label="Break duration" value={profile.pomodoro_break} min={1} max={30} step={1} unit=" min" last
                  onChange={v => updateProfile({ pomodoro_break:v })}/>
              </div>
            </div>
          )}

          {/* ── Text ── */}
          {section === 'text' && (
            <div>
              <h2 className={styles.title}>Text settings</h2>
              <p className={styles.sub}>These apply to websites you visit through the extension.</p>
              <div className="card" style={{ marginBottom:20 }}>
                <SliderRow label="Font size" value={profile.font_size} min={14} max={26} unit="px"
                  onChange={v => updateProfile({ font_size:v })}/>
                <SliderRow label="Line spacing" value={Math.round(profile.line_height*10)} min={14} max={24}
                  display={v=>(v/10).toFixed(1)} onChange={v=>updateProfile({ line_height:v/10 })}/>
                <SliderRow label="Column width" value={profile.column_width} min={40} max={90} step={5} unit=" ch"
                  onChange={v=>updateProfile({ column_width:v })}/>
                <SliderRow label="Detection sensitivity" value={profile.sensitivity} min={10} max={100} unit="%" last
                  onChange={v=>updateProfile({ sensitivity:v })}/>
              </div>
              <h3 className={styles.subTitle}>Font family</h3>
              <div className={styles.fontGrid}>
                {FONTS.map(f=>(
                  <button key={f.id} aria-pressed={profile.font_family===f.id}
                    className={`${styles.fontCard} ${profile.font_family===f.id?styles.fontCardOn:''}`}
                    onClick={()=>updateProfile({ font_family:f.id as any })}>
                    <span className={styles.fontName}>{f.label}</span>
                    <span className={styles.fontSub}>{f.sub}</span>
                    <span className={styles.fontSample}
                      style={{ fontFamily:f.id==='arial'?'Arial':f.id==='system'?'system-ui':f.id==='lexend'?'Lexend':'Arial' }}>
                      The quick brown fox
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
              <p className={styles.sub}>Each theme ensures readable contrast. High contrast is best for low vision users.</p>
              <div className={styles.themeGridH}>
                {THEMES.map(t=>(
                  <button key={t.id} aria-pressed={profile.theme===t.id}
                    className={`${styles.themeCard} ${profile.theme===t.id?styles.themeCardOn:''}`}
                    onClick={()=>{ updateProfile({ theme:t.id as any }); document.documentElement.setAttribute('data-theme',t.id) }}>
                    <div className={styles.themePreview} style={{ background:t.bg }}>
                      <div style={{ background:t.accent, width:20, height:20, borderRadius:'50%', marginBottom:8 }}/>
                      <div style={{ background:t.text, height:6, borderRadius:3, width:'80%', opacity:0.8, marginBottom:5 }}/>
                      <div style={{ background:t.text, height:4, borderRadius:3, width:'60%', opacity:0.5, marginBottom:4 }}/>
                      <div style={{ background:t.text, height:4, borderRadius:3, width:'70%', opacity:0.4 }}/>
                    </div>
                    <p className={styles.themeLabel}>{t.label}</p>
                    {profile.theme===t.id && <p style={{ fontSize:11, color:'var(--accent)', fontWeight:500 }}>Current</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {section === 'privacy' && (
            <div>
              <h2 className={styles.title}>Privacy</h2>
              <p className={styles.sub}>You are always in control. We never sell or share your data.</p>
              <div className={styles.privacyBanner}>
                <span style={{ fontSize:28 }}>🔒</span>
                <div>
                  <p style={{ fontWeight:500, marginBottom:4 }}>Privacy-first by design</p>
                  <p style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.6 }}>
                    All behavioral tracking happens locally in your browser. Nothing leaves your device without your permission.
                  </p>
                </div>
              </div>
              <div className="card" style={{ marginBottom:16 }}>
                <ToggleRow label="Local-only processing" desc="Cognitive load stays on your device only" checked={profile.privacy_local_only} onChange={()=>toggle('privacy_local_only')}/>
                <ToggleRow label="Auto-adapt" desc="Automatically enable modes when overload is detected" checked={profile.auto_adapt} onChange={()=>toggle('auto_adapt')} last/>
              </div>
              {['Behavioral data never uploaded','No cross-website tracking','No data sold to third parties','Delete your account anytime'].map(item=>(
                <div key={item} className={styles.privacyItem}>
                  <span style={{ color:'var(--accent)', fontWeight:700 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  )
}

function ToggleRow({ label, desc, checked, onChange, last }: { label:string; desc?:string; checked:boolean; onChange:()=>void; last?:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:last?'none':'1px solid var(--border)', gap:16 }}>
      <div>
        <p style={{ fontSize:14, color:'var(--text)' }}>{label}</p>
        {desc && <p style={{ fontSize:12, color:'var(--text-soft)', marginTop:2 }}>{desc}</p>}
      </div>
      <label className="switch" aria-label={label}><input type="checkbox" checked={checked} onChange={onChange}/><span className="switch-track"/></label>
    </div>
  )
}

function SliderRow({ label, value, min, max, step=1, unit='', display, onChange, last }: { label:string; value:number; min:number; max:number; step?:number; unit?:string; display?:(v:number)=>string; onChange:(v:number)=>void; last?:boolean }) {
  return (
    <div style={{ padding:'14px 0', borderBottom:last?'none':'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:14, color:'var(--text)' }}>{label}</span>
        <span style={{ fontSize:13, color:'var(--text-soft)' }}>{display?display(value):value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ width:'100%', accentColor:'var(--accent)' }}
        onChange={e=>onChange(Number(e.target.value))}/>
    </div>
  )
}
