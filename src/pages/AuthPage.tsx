import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PlantLogo } from '../components/PlantLogo'
import styles from './AuthPage.module.css'

const NEEDS = [
  { id: 'adhd',        label: 'ADHD' },
  { id: 'dyslexia',    label: 'Dyslexia' },
  { id: 'autism',      label: 'Autism' },
  { id: 'anxiety',     label: 'Anxiety' },
  { id: 'low_vision',  label: 'Low vision' },
  { id: 'immigrant',   label: 'English is not my first language' },
  { id: 'older_adult', label: 'I prefer simpler interfaces' },
]

const AVATARS = [
  { id: 'duck',   emoji: '🦆' },
  { id: 'spirit', emoji: '🌿' },
  { id: 'flower', emoji: '🌸' },
  { id: 'cat',    emoji: '🐱' },
]

export default function AuthPage() {
  const [tab, setTab]           = useState<'login'|'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [avatar, setAvatar]     = useState('duck')
  const [needs, setNeeds]       = useState<string[]>([])
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn, signUp }      = useAuth()
  const navigate                = useNavigate()

  function toggleNeed(id: string) {
    setNeeds(p => p.includes(id) ? p.filter(n=>n!==id) : [...p,id])
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    setError(''); setLoading(true)
    const { error } = await signUp(email, password, { display_name: name, avatar: avatar as any, needs })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className={styles.page}>

      {/* ── Animated background ── */}
      <div className={styles.animatedBg} aria-hidden>
        
        { <img src="/your-scene.png" className={styles.bgImage} alt="" /> }
        <div className={styles.bgSky}/>
        <div className={styles.bgOrb}/>
        <div className={styles.bgLayer1}/>
        <div className={styles.bgLayer2}/>
        <div className={styles.bgLayer3}/>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.bgParticle} style={{
            width: `${6 + i * 3}px`,
            height: `${6 + i * 3}px`,
            left: `${10 + i * 15}%`,
            animationDuration: `${8 + i * 3}s`,
            animationDelay: `${i * 1.5}s`,
          }}/>
        ))}
      </div>

      {/* ── Centered card ── */}
      <div className={styles.card}>

        {/* Logo + title + slogan all inside the card */}
        <div className={styles.brand}>
          <PlantLogo size={72} />
          <h1 className={styles.brandName}>Haven</h1>
          <p className={styles.brandTagline}>A Home For Every Mind</p>
        </div>

        <div className={styles.divider}/>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab==='login'?styles.tabOn:''}`} onClick={()=>setTab('login')}>Sign in</button>
          <button className={`${styles.tab} ${tab==='signup'?styles.tabOn:''}`} onClick={()=>setTab('signup')}>Create account</button>
        </div>

        {/* Error message */}
        {error && (
          <p style={{background:'#fdf0f0',border:'1px solid #f4c0c0',color:'#a03030',padding:'10px 14px',borderRadius:8,fontSize:14,marginBottom:16,width:'100%'}} role="alert">
            {error}
          </p>
        )}

        {/* Forms */}
        <div className={styles.formWrap}>
          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}} noValidate>
              <div>
                <h2 className={styles.heading}>Welcome back</h2>
                <p className={styles.formSub}>Your settings are waiting for you.</p>
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/>
              </div>
              <div>
                <label className="field-label">Password</label>
                <input className="field-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"/>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%'}}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <p style={{textAlign:'center',fontSize:13,color:'var(--text-soft)'}}>
                New here?{' '}
                <button type="button" onClick={()=>setTab('signup')} style={{background:'none',border:'none',color:'var(--accent)',fontWeight:500,cursor:'pointer',fontSize:'inherit',textDecoration:'underline'}}>
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} style={{display:'flex',flexDirection:'column',gap:14}} noValidate>
              <div>
                <h2 className={styles.heading}>Make it yours</h2>
                <p className={styles.formSub}>Your preferences travel with you everywhere.</p>
              </div>
              <div>
                <label className="field-label">Your name</label>
                <input className="field-input" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" required/>
              </div>
              <div>
                <label className="field-label">Pick an avatar</label>
                <div style={{display:'flex',gap:10,marginTop:8}}>
                  {AVATARS.map(av => (
                    <button key={av.id} type="button" aria-pressed={avatar===av.id}
                      style={{width:48,height:48,borderRadius:'50%',border:`2px solid ${avatar===av.id?'var(--accent)':'var(--border-mid)'}`,background:avatar===av.id?'var(--accent-pale)':'var(--surface)',cursor:'pointer',fontSize:22,transition:'all 0.15s'}}
                      onClick={()=>setAvatar(av.id)}>
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">What describes you? <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,opacity:0.7}}>(optional)</span></label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                  {NEEDS.map(n => {
                    const on = needs.includes(n.id)
                    return (
                      <button key={n.id} type="button" aria-pressed={on}
                        style={{padding:'5px 12px',borderRadius:20,fontSize:12,border:`1.5px solid ${on?'var(--accent)':'var(--border-mid)'}`,background:on?'var(--accent-pale)':'var(--surface)',color:on?'var(--accent)':'var(--text-mid)',cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.15s'}}
                        onClick={()=>toggleNeed(n.id)}>
                        {n.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/>
              </div>
              <div>
                <label className="field-label">Password</label>
                <input className="field-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="at least 8 characters" required autoComplete="new-password"/>
              </div>
              {name && (
                <div style={{display:'flex',alignItems:'center',gap:12,background:'var(--accent-pale)',border:'1.5px dashed var(--border-mid)',borderRadius:12,padding:'12px 14px'}}>
                  <span style={{fontSize:26}}>{AVATARS.find(a=>a.id===avatar)?.emoji}</span>
                  <div>
                    <p style={{fontWeight:500,fontSize:14}}>{name}</p>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:3}}>
                      {needs.length>0 ? needs.map(n=><span key={n} style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'var(--accent-mid)',color:'white'}}>{NEEDS.find(x=>x.id===n)?.label}</span>) : <span style={{fontSize:11,color:'var(--text-soft)',fontStyle:'italic'}}>no tags yet</span>}
                    </div>
                  </div>
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%'}}>
                {loading ? 'Creating your garden...' : 'Create my profile'}
              </button>
              <p style={{textAlign:'center',fontSize:13,color:'var(--text-soft)'}}>
                Already have an account?{' '}
                <button type="button" onClick={()=>setTab('login')} style={{background:'none',border:'none',color:'var(--accent)',fontWeight:500,cursor:'pointer',fontSize:'inherit',textDecoration:'underline'}}>
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Slogan at the bottom of the card */}
        <blockquote className={styles.quote}>
          "Made to feel manageable."
        </blockquote>

      </div>
    </div>
  )

}
