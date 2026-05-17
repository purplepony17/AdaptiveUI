-- Run this in Supabase SQL Editor

drop table if exists public.profiles cascade;

create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text    not null default '',
  avatar           text    not null default 'duck',
  needs            text[]  not null default '{}',
  theme            text    not null default 'sage',
  font_size        int     not null default 16,
  line_height      numeric not null default 1.6,
  column_width     int     not null default 70,
  font_family      text    not null default 'lexend',
  left_align       boolean not null default true,
  off_white_bg     boolean not null default true,
  focus_mode       boolean not null default false,
  low_stim         boolean not null default false,
  reduce_clutter   boolean not null default false,
  chunk_mode       boolean not null default false,
  laser_cursor     boolean not null default false,
  dyslexia_ruler   boolean not null default false,
  auto_adapt       boolean not null default true,
  privacy_local_only boolean not null default true,
  sensitivity      int     not null default 50,
  pomodoro_work    int     not null default 25,
  pomodoro_break   int     not null default 5,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "select own" on public.profiles for select using (auth.uid()=id);
create policy "insert own" on public.profiles for insert with check (auth.uid()=id);
create policy "update own" on public.profiles for update using (auth.uid()=id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id) values(new.id) on conflict(id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
