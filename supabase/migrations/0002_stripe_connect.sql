-- =============================================================================
-- FanUp — Stripe Connect（クリエイターへの出金）0002_stripe_connect.sql
--
-- ※ このプロジェクトには DDL を直接流す手段が無いため、
--   Supabase ダッシュボードの SQL Editor でこのファイルの内容を一度実行してください。
--   0000_init.sql → 0001_follows.sql の後に実行します。冪等・再実行可。
--
-- 資金の流れ:
--   1. サポーターが Stripe Checkout でポイントを購入（1pt = ¥1）→ 売上はプラット
--      フォームの Stripe 残高に入る（既存の /api/stripe/checkout + webhook）。
--   2. サポーターがポイントでプロジェクトを応援（DB 上の付け替えのみ）。
--   3. プロジェクトが succeeded になった時点で、集まったポイント相当額から
--      プラットフォーム手数料を引いた金額を、クリエイターの Connect アカウントへ
--      Stripe Transfer で送金する（= public.payouts の 1 行）。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. creators — Stripe Connect アカウント情報
--    stripe_connect_status は Stripe 側の account オブジェクトから導出した値を保持する
--    （src/lib/stripe/connect.ts の deriveConnectStatus と対応）:
--      none       … 未連携（アカウント未作成）
--      pending    … 作成済みだがオンボーディング未完了 / 審査中
--      active     … details_submitted かつ payouts_enabled。送金可能
--      restricted … requirements.disabled_reason あり。追加対応が必要
-- -----------------------------------------------------------------------------
alter table public.creators
  add column if not exists stripe_connect_account_id  text,
  add column if not exists stripe_connect_status      text not null default 'none',
  add column if not exists stripe_charges_enabled     boolean not null default false,
  add column if not exists stripe_payouts_enabled     boolean not null default false,
  add column if not exists stripe_details_submitted   boolean not null default false,
  add column if not exists stripe_disabled_reason     text,
  add column if not exists stripe_connect_updated_at  timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creators_stripe_connect_status_check'
  ) then
    alter table public.creators
      add constraint creators_stripe_connect_status_check
      check (stripe_connect_status in ('none', 'pending', 'active', 'restricted'));
  end if;
end $$;

-- 1 つの Connect アカウントが複数クリエイターに紐づかないようにする。
-- （webhook の account.updated はこのカラムでクリエイターを逆引きする）
create unique index if not exists creators_stripe_connect_account_id_key
  on public.creators (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

-- -----------------------------------------------------------------------------
-- 2. payouts — プロジェクト単位の送金レコード（1 プロジェクト = 最大 1 行）
--    project_id の unique 制約が二重送金に対する DB 側のガード。
--    Stripe 側は idempotency key と transfer_group で二重送金を防ぐ。
--    status:
--      pending … 送金処理中（Transfer 発行前 / 結果未確定）
--      paid    … Transfer 成功
--      failed  … Transfer 失敗・未連携などで保留。cron が再試行する
-- -----------------------------------------------------------------------------
create table if not exists public.payouts (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null unique references public.projects(id) on delete cascade,
  creator_id         uuid not null references public.creators(id) on delete cascade,
  stripe_account_id  text,
  stripe_transfer_id text,
  -- 集まったポイント（= 総額・円）と、その内訳
  gross_points       integer not null,
  fee_amount         integer not null,   -- プラットフォーム手数料（円）
  net_amount         integer not null,   -- 実際に Transfer する金額（円）
  platform_fee_rate  numeric(4,2) not null,
  currency           text not null default 'jpy',
  status             text not null default 'pending',
  error_message      text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint payouts_status_check check (status in ('pending', 'paid', 'failed')),
  constraint payouts_amounts_nonneg check (gross_points >= 0 and fee_amount >= 0 and net_amount >= 0)
);

-- 同じ Transfer が 2 行に記録されないようにする（再試行時の取り違え検知）
create unique index if not exists payouts_stripe_transfer_id_key
  on public.payouts (stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists payouts_creator_id_idx on public.payouts (creator_id);
create index if not exists payouts_status_idx     on public.payouts (status);

-- updated_at の自動更新
create or replace function public.touch_payouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payouts_set_updated_at on public.payouts;
create trigger payouts_set_updated_at
  before update on public.payouts
  for each row execute function public.touch_payouts_updated_at();

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    書き込みは常に service role（API ルート / cron）から行うため、
--    ポリシーはクリエイター本人の読み取りのみを許可する。
-- -----------------------------------------------------------------------------
alter table public.payouts enable row level security;

drop policy if exists "payouts: creator read" on public.payouts;
create policy "payouts: creator read"
  on public.payouts for select
  using (
    exists (
      select 1 from public.creators c
      where c.id = payouts.creator_id
        and c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. プラットフォーム手数料率について
--    projects.platform_fee_rate が送金時の手数料率の実体です（0000_init.sql で
--    default 0.30 として作成済み）。Stripe Connect 導入にあわせて新規プロジェクトの
--    既定値を 10% に変更します。
--    既存行はデータの意味が変わるためここでは触っていません。過去分も 10% に
--    そろえる場合は、下の UPDATE を意図的に実行してください。
-- =============================================================================
alter table public.projects alter column platform_fee_rate set default 0.10;

-- 既存プロジェクトの手数料率も 10% にそろえる場合のみ、コメントを外して実行:
-- update public.projects set platform_fee_rate = 0.10 where status = 'active';

-- =============================================================================
-- End of 0002_stripe_connect.sql
-- =============================================================================
