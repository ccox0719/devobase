-- Run once in Supabase SQL Editor
-- Project: Devotional Lesson Library

create table if not exists devotional_lessons (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  user_id           uuid references auth.users(id) on delete cascade,

  title             text not null,
  subtitle          text,
  scripture_ref     text,
  scripture_book    text,
  key_verse         text,
  key_verse_ref     text,
  summary           text,

  themes            text[],
  topics            text[],
  audience          text[],

  tone              text,
  reflection_count  integer default 0,
  times_done        integer default 0,
  has_application   boolean default false,
  has_prayer        boolean default false,
  estimated_minutes integer,
  leading_notes     text,
  raw_text          text
);

alter table devotional_lessons add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table devotional_lessons enable row level security;

drop policy if exists "Allow all" on devotional_lessons;
drop policy if exists "Users can read own lessons" on devotional_lessons;
drop policy if exists "Users can insert own lessons" on devotional_lessons;
drop policy if exists "Users can update own lessons" on devotional_lessons;
drop policy if exists "Users can delete own lessons" on devotional_lessons;

create policy "Users can read own lessons"
  on devotional_lessons
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own lessons"
  on devotional_lessons
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lessons"
  on devotional_lessons
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own lessons"
  on devotional_lessons
  for delete
  using (auth.uid() = user_id);

alter table devotional_lessons add column if not exists series_name  text;
alter table devotional_lessons add column if not exists series_order integer;
alter table devotional_lessons add column if not exists times_done    integer default 0;
update devotional_lessons set times_done = 0 where times_done is null;

create index if not exists idx_dl_user_id        on devotional_lessons (user_id);
create index if not exists idx_dl_scripture_book on devotional_lessons (scripture_book);
create index if not exists idx_dl_created_at     on devotional_lessons (created_at desc);
create index if not exists idx_dl_themes         on devotional_lessons using gin (themes);
create index if not exists idx_dl_topics         on devotional_lessons using gin (topics);
create index if not exists idx_dl_series         on devotional_lessons (series_name);
