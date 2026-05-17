import { useCallback, useEffect, useState } from 'react'
import { supabase, Profile, DEFAULT_PROFILE } from '../lib/supabase'

export function useAuth() {
  const [user, setUser]       = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (id: string) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [fetchProfile])

  async function signUp(email: string, password: string, extra: Partial<Profile>) {
    if (!supabase) return { error: new Error('Supabase not set up') }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return { error }
    await supabase.from('profiles').upsert({ id: data.user.id, ...DEFAULT_PROFILE, ...extra })
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error('Supabase not set up') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!supabase || !user) return
    const merged = { ...profile, ...updates } as Profile
    await supabase.from('profiles').upsert({ id: user.id, ...updates })
    setProfile(merged)
    // Sync to extension via localStorage
    localStorage.setItem('gb_profile', JSON.stringify(merged))
  }

  return { user, profile, loading, signUp, signIn, signOut, updateProfile }
}
