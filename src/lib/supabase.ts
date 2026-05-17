import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = url && key ? createClient(url, key) : null

export type LoadState = 'calm' | 'focused' | 'overwhelmed' | 'distracted'

export type Profile = {
  id: string
  display_name: string
  avatar: string
  needs: string[]
  theme: string
  font_size: number
  line_height: number
  column_width: number
  font_family: string
  left_align: boolean
  off_white_bg: boolean
  focus_mode: boolean
  low_stim: boolean
  reduce_clutter: boolean
  chunk_mode: boolean
  laser_cursor: boolean
  dyslexia_ruler: boolean
  auto_adapt: boolean
  privacy_local_only: boolean
  sensitivity: number
  pomodoro_work: number
  pomodoro_break: number
}

export const DEFAULT_PROFILE: Omit<Profile, 'id'> = {
  display_name: '',
  avatar: 'duck',
  needs: [],
  theme: 'sage',
  font_size: 16,
  line_height: 1.6,
  column_width: 70,
  font_family: 'lexend',
  left_align: true,
  off_white_bg: true,
  focus_mode: false,
  low_stim: false,
  reduce_clutter: false,
  chunk_mode: false,
  laser_cursor: false,
  dyslexia_ruler: false,
  auto_adapt: true,
  privacy_local_only: true,
  sensitivity: 50,
  pomodoro_work: 25,
  pomodoro_break: 5,
}
