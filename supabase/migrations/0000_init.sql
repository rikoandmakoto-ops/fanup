-- =============================================================================
-- FanUp — reconstructed initial schema (0000_init.sql)
-- Rebuilt from application code usage; original migration files were lost.
-- Run BEFORE 0001_follows.sql (this file creates public.profiles & public.creators
-- that the follows table references). Idempotent & safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — public mirror of auth.users (1 row per auth user)
--   PK id = auth.users.id. Created automatically via handle_new_user() trigger.
--   Evidence:
--     signup options.data.display_name        src/app/(auth)/signup/page.tsx:23
--     select display_name,email,point_balance  src/app/mypage/page.tsx:16
--     select role / .eq('id', user.id)         src/app/admin/page.tsx:14-16, api/admin/creators/route.ts:27-29
--     select point_balance / update balance    src/app/api/donate/route.ts:27-30,86-88
--     admin list: id,email,display_name,point_balance,role,created_at  src/app/admin/page.tsx:34
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  point_balance integer not null default 0,
  role          text    not null default 'user',   -- 'user' | 'admin' (admin checked at admin/page.tsx:19)
  created_at    timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'admin')),
  constraint profiles_point_balance_nonneg check (point_balance >= 0)
);

-- -----------------------------------------------------------------------------
-- creators — creator applications / approved creators (1 per user via user_id)
--   Evidence:
--     insert {user_id,name,category,bio,status:'pending'}  src/app/api/creator/apply/route.ts:42-48
--     select id,status .eq('user_id')                      src/app/api/creator/apply/route.ts:30-33
--     status: pending|approved|rejected                    api/admin/creators/route.ts:51, projects/route.ts:24
--     select id,name,category,bio,status,user_id           src/app/creators/[id]/page.tsx:58
--     admin list id,user_id,name,category,status,created_at src/app/admin/page.tsx:35
--     creators(user_id) join from projects                 src/app/api/cron/check-projects/route.ts:27
-- -----------------------------------------------------------------------------
create table if not exists public.creators (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles(id) on delete cascade,
  name       text not null,
  category   text,
  bio        text,
  status     text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now(),
  constraint creators_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists creators_user_id_idx on public.creators (user_id);
create index if not exists creators_status_idx  on public.creators (status);

-- -----------------------------------------------------------------------------
-- projects — crowdfunding projects (All-or-Nothing)
--   Evidence:
--     insert {creator_id,title,description,goal_points,current_points:0,
--             deadline,status:'active',platform_fee_rate:0.30}  api/creator/projects/route.ts:53-62
--     select id,title,description,goal_points,current_points,deadline,status,
--            creators(id,name,category)                          projects/[id]/page.tsx:21
--     status: active|succeeded|failed                            cron/check-projects, creator/page.tsx:142
--     order('created_at'), order('current_points')               page.tsx:36,86 / creators/[id]:76
--   NOTE: id is uuid — code always treats it as opaque string from DB; the int
--   ids in cron result logging are TS-typed loosely (number) but never written.
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creators(id) on delete cascade,
  title             text not null,
  description       text,
  goal_points       integer not null,
  current_points    integer not null default 0,
  deadline          timestamptz,
  status            text not null default 'active',   -- 'active' | 'succeeded' | 'failed'
  platform_fee_rate numeric(4,2) not null default 0.30,
  created_at        timestamptz not null default now(),
  constraint projects_status_check check (status in ('active', 'succeeded', 'failed')),
  constraint projects_goal_points_pos check (goal_points > 0),
  constraint projects_current_points_nonneg check (current_points >= 0)
);

create index if not exists projects_creator_id_idx on public.projects (creator_id);
create index if not exists projects_status_idx      on public.projects (status);
create index if not exists projects_deadline_idx    on public.projects (deadline);

-- -----------------------------------------------------------------------------
-- donations — a user's support of a project (point pledge)
--   Evidence:
--     insert {user_id,project_id,points,status:'completed'}  api/donate/route.ts:50-55
--     select id,user_id,points .eq('project_id').eq('status','completed')  cron:88-90
--     update {status:'refunded'} .eq('id')                   cron:136-138
--     select id,points,created_at,project_id,projects(title)  mypage/page.tsx:29
--     select user_id count exact head                         projects/[id]:30, creators/[id]:94
--     status: completed | refunded
-- -----------------------------------------------------------------------------
create table if not exists public.donations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  points     integer not null,
  status     text not null default 'completed',  -- 'completed' | 'refunded'
  created_at timestamptz not null default now(),
  constraint donations_status_check check (status in ('completed', 'refunded')),
  constraint donations_points_pos check (points > 0)
);

create index if not exists donations_user_id_idx    on public.donations (user_id);
create index if not exists donations_project_id_idx on public.donations (project_id);

-- -----------------------------------------------------------------------------
-- point_transactions — ledger of point movements
--   Evidence:
--     insert {user_id,type:'purchase',amount,stripe_session_id}  stripe/webhook:68-73
--     insert {user_id,type:'donation',amount,related_project_id}  donate:65-69
--     insert {user_id,type:'refund',amount,related_project_id}    cron:127-131
--     select id stripe_session_id maybeSingle (idempotency)       webhook:55-57
--     admin list id,user_id,type,amount,stripe_session_id,created_at  admin/page.tsx:37
--     mypage list id,type,amount,created_at,related_project_id    mypage/page.tsx:22
--     type: purchase | donation | refund
-- -----------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  type               text not null,   -- 'purchase' | 'donation' | 'refund'
  amount             integer not null,
  stripe_session_id  text,
  related_project_id uuid references public.projects(id) on delete set null,
  created_at         timestamptz not null default now(),
  constraint point_transactions_type_check check (type in ('purchase', 'donation', 'refund'))
);

-- Unique on stripe_session_id powers the webhook idempotency guard (webhook:54-58).
create unique index if not exists point_transactions_stripe_session_id_key
  on public.point_transactions (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists point_transactions_user_id_idx on public.point_transactions (user_id);

-- NOTE: public.follows is intentionally NOT created here — see 0001_follows.sql.

-- =============================================================================
-- 2. FUNCTIONS (RPCs + trigger functions)
-- =============================================================================

-- handle_new_user — populate public.profiles when an auth.users row is created.
--   Pulls display_name from raw_user_meta_data (signup passes options.data.display_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- add_points(target_user_id uuid, amount integer)
--   RPC called by Stripe webhook to atomically credit a user. webhook:81-84
create or replace function public.add_points(target_user_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set point_balance = point_balance + amount
   where id = target_user_id;
end;
$$;

-- subtract_points(target_user_id uuid, amount integer)
--   RPC called by donate route to atomically debit a user. donate:77-80
--   Guards against negative balance (caller pre-checks, but enforce atomically).
create or replace function public.subtract_points(target_user_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set point_balance = point_balance - amount
   where id = target_user_id
     and point_balance >= amount;
  if not found then
    raise exception 'insufficient point balance for user %', target_user_id;
  end if;
end;
$$;

-- add_project_points(target_project_id uuid, amount integer)
--   RPC called by donate route to atomically increment project total. donate:97-100
create or replace function public.add_project_points(target_project_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
     set current_points = current_points + amount
   where id = target_project_id;
end;
$$;

-- =============================================================================
-- 3. TRIGGERS
-- =============================================================================

-- Auto-create profile on new auth user.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 4. ROW LEVEL SECURITY
--    Notes:
--      * Service-role clients (webhook, cron, admin approve, follow writes)
--        bypass RLS entirely — no policies needed for those paths.
--      * SSR/anon clients read public data and do user-scoped reads.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.creators           enable row level security;
alter table public.projects           enable row level security;
alter table public.donations          enable row level security;
alter table public.point_transactions enable row level security;

-- ---- profiles ----
-- A user can read & update only their own profile row.
-- (role/point_balance are written by service role, which bypasses RLS.)
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- creators ----
-- Public can read creators (homepage, public profile pages).
drop policy if exists "creators: public read" on public.creators;
create policy "creators: public read"
  on public.creators for select
  using (true);

-- A logged-in user may submit their own creator application.
drop policy if exists "creators: self insert" on public.creators;
create policy "creators: self insert"
  on public.creators for insert
  with check (auth.uid() = user_id);

-- A creator may edit their own row (status changes are done by service role/admin).
drop policy if exists "creators: self update" on public.creators;
create policy "creators: self update"
  on public.creators for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- projects ----
-- Public can read all projects.
drop policy if exists "projects: public read" on public.projects;
create policy "projects: public read"
  on public.projects for select
  using (true);

-- An approved creator may insert projects they own.
drop policy if exists "projects: creator insert" on public.projects;
create policy "projects: creator insert"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.creators c
      where c.id = creator_id
        and c.user_id = auth.uid()
        and c.status = 'approved'
    )
  );

-- A creator may update their own projects (status transitions by cron/service role).
drop policy if exists "projects: creator update" on public.projects;
create policy "projects: creator update"
  on public.projects for update
  using (
    exists (
      select 1 from public.creators c
      where c.id = creator_id and c.user_id = auth.uid()
    )
  );

-- ---- donations ----
-- Public read: supporter counts are shown publicly (project & creator pages use
-- count(*) without auth context). If you prefer to hide individual rows, replace
-- with a per-user policy + a SECURITY DEFINER count function.
drop policy if exists "donations: public read" on public.donations;
create policy "donations: public read"
  on public.donations for select
  using (true);

-- A user may create their own donation.
drop policy if exists "donations: self insert" on public.donations;
create policy "donations: self insert"
  on public.donations for insert
  with check (auth.uid() = user_id);

-- ---- point_transactions ----
-- A user may read only their own ledger entries.
drop policy if exists "point_transactions: self read" on public.point_transactions;
create policy "point_transactions: self read"
  on public.point_transactions for select
  using (auth.uid() = user_id);

-- A user may insert their own donation/refund ledger rows (purchase rows are
-- written by the service-role webhook, which bypasses RLS).
drop policy if exists "point_transactions: self insert" on public.point_transactions;
create policy "point_transactions: self insert"
  on public.point_transactions for insert
  with check (auth.uid() = user_id);

-- =============================================================================
-- 5. GRANTS for RPC execution (anon/authenticated call .rpc(...))
-- =============================================================================
grant execute on function public.add_points(uuid, integer)         to anon, authenticated, service_role;
grant execute on function public.subtract_points(uuid, integer)    to anon, authenticated, service_role;
grant execute on function public.add_project_points(uuid, integer) to anon, authenticated, service_role;

-- =============================================================================
-- End of 0000_init.sql
-- =============================================================================
