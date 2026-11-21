-- PROPOSED ONLY: do not run against production until separately approved.
-- Owner: DevoBase (ccox0719/devobase). Isolated from devotional_lessons and the approved book.
begin;
create table if not exists public.devobase_personal_studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled study',
  scripture_ref text not null default '',
  content_html text not null default '',
  series_name text not null default '',
  series_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_studies_title_length check (char_length(title) <= 300),
  constraint personal_studies_content_length check (char_length(content_html) <= 500000)
);
comment on table public.devobase_personal_studies is 'DevoBase private inductive Bible studies, independent of devotional_lessons and book publication.';
create index if not exists idx_devobase_personal_studies_owner
on public.devobase_personal_studies (user_id, updated_at desc);
alter table public.devobase_personal_studies enable row level security;
revoke all on public.devobase_personal_studies from anon;
grant select, insert, update, delete on public.devobase_personal_studies to authenticated;
create policy "personal_studies_select_own" on public.devobase_personal_studies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "personal_studies_insert_own" on public.devobase_personal_studies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "personal_studies_update_own" on public.devobase_personal_studies
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "personal_studies_delete_own" on public.devobase_personal_studies
  for delete to authenticated using ((select auth.uid()) = user_id);
commit;

-- Rollback (requires its own approval and a verified backup):
-- drop table if exists public.devobase_personal_studies;
