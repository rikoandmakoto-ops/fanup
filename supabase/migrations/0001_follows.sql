-- フォロー機能用テーブル
-- ※ このプロジェクトには DDL を直接流す手段が無いため、
--   Supabase ダッシュボードの SQL Editor でこのファイルの内容を一度実行してください。

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  creator_id  uuid not null references public.creators(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, creator_id)
);

-- フォロワー数・creator 別フォロー一覧を引くためのインデックス
create index if not exists follows_creator_idx on public.follows (creator_id);

alter table public.follows enable row level security;

-- フォロワー数は公開情報として誰でも読める
drop policy if exists "follows are publicly readable" on public.follows;
create policy "follows are publicly readable"
  on public.follows for select
  using (true);

-- 自分のフォローのみ作成・削除できる
drop policy if exists "users manage their own follows" on public.follows;
create policy "users manage their own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);
