import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import type { createAdminClient } from '@/lib/supabase/admin'
import { sendPayoutSentEmail, sendPayoutBlockedEmail } from '@/lib/email'

// Stripe Connect（Express）まわりの共通ロジック。
// API ルート（/api/stripe/connect/*）と cron（/api/cron/check-projects）の
// 双方から呼ばれるため、HTTP には依存させず service-role クライアントを受け取る。

type AdminClient = ReturnType<typeof createAdminClient>

export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

// -----------------------------------------------------------------------------
// 手数料・金額
// -----------------------------------------------------------------------------

// PLATFORM_FEE_RATE 未設定時の既定手数料率。
export const DEFAULT_PLATFORM_FEE_RATE = 0.1

function parseRate(raw: unknown): number | null {
  const rate = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  if (!Number.isFinite(rate) || rate < 0 || rate >= 1) return null
  return rate
}

// 環境変数の手数料率（0〜1 未満）。不正値は既定値にフォールバックする。
export function getDefaultPlatformFeeRate(): number {
  return parseRate(process.env.PLATFORM_FEE_RATE) ?? DEFAULT_PLATFORM_FEE_RATE
}

// 手数料率は projects.platform_fee_rate を正とし、未設定・不正なら環境変数の既定値。
export function resolveFeeRate(projectRate: unknown): number {
  return parseRate(projectRate) ?? getDefaultPlatformFeeRate()
}

// 1pt = ¥1。JPY はゼロ十進通貨なので Stripe に渡す amount はそのまま「円」。
// 端数はプラットフォーム側に不利にならないよう手数料を切り捨てる（= クリエイター有利）。
export function calcPayout(grossPoints: number, feeRate: number): {
  gross: number
  fee: number
  net: number
} {
  const gross = Math.max(0, Math.floor(Number(grossPoints) || 0))
  const fee = Math.floor(gross * feeRate)
  return { gross, fee, net: gross - fee }
}

// -----------------------------------------------------------------------------
// アカウント状態
// -----------------------------------------------------------------------------

// Stripe の account オブジェクトから FanUp 側のステータスを導出する。
// 送金（Transfer）の可否は transfers capability に依るが、Express の実運用では
// payouts_enabled + details_submitted が揃った時点を「有効」とみなして問題ない。
export function deriveConnectStatus(account: Stripe.Account): ConnectStatus {
  if (account.requirements?.disabled_reason) return 'restricted'
  if (account.details_submitted && account.payouts_enabled) return 'active'
  return 'pending'
}

// creators 行へ Stripe 側の最新状態を書き戻す。導出したステータスを返す。
export async function syncConnectAccount(
  admin: AdminClient,
  creatorId: string,
  account: Stripe.Account
): Promise<ConnectStatus> {
  const status = deriveConnectStatus(account)

  const { error } = await admin
    .from('creators')
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_status: status,
      stripe_charges_enabled: account.charges_enabled ?? false,
      stripe_payouts_enabled: account.payouts_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
      stripe_disabled_reason: account.requirements?.disabled_reason ?? null,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('id', creatorId)

  if (error) {
    console.error('[connect] creators への状態同期に失敗', creatorId, error)
  }

  return status
}

// Stripe からアカウントを取得して creators に同期する。
// アカウントが削除済みなどで取得できない場合は null を返す。
export async function refreshConnectAccount(
  admin: AdminClient,
  creatorId: string,
  accountId: string
): Promise<ConnectStatus | null> {
  try {
    const account = await stripe.accounts.retrieve(accountId)
    return await syncConnectAccount(admin, creatorId, account)
  } catch (err) {
    console.error('[connect] アカウント取得に失敗', accountId, err)
    return null
  }
}

// -----------------------------------------------------------------------------
// 送金（Transfer）
// -----------------------------------------------------------------------------

export type PayoutResult =
  | { status: 'paid'; transferId: string; gross: number; fee: number; net: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

type PayoutProject = {
  id: string
  title: string
  status: string
  current_points: number
  platform_fee_rate: number | string | null
  creators: unknown
}

type PayoutCreator = {
  id: string
  name: string
  user_id: string
  stripe_connect_account_id: string | null
  stripe_connect_status: string | null
}

// Supabase の外部キー join は 1 件でもオブジェクト / 配列のどちらでも返り得る。
function unwrapCreator(raw: unknown): PayoutCreator | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (value as PayoutCreator | undefined) ?? null
}

async function markPayoutFailed(
  admin: AdminClient,
  row: Record<string, unknown>,
  reason: string
): Promise<void> {
  const { error } = await admin
    .from('payouts')
    .upsert({ ...row, status: 'failed', error_message: reason }, { onConflict: 'project_id' })
  if (error) {
    console.error('[connect] payouts の失敗記録に失敗', row.project_id, error)
  }
}

/**
 * プロジェクト 1 件分の送金を実行する。
 *
 * 二重送金は 3 段で防いでいる:
 *   1. payouts.project_id の unique 制約 + status='paid' の事前チェック
 *   2. transfer_group による Stripe 側の既存 Transfer 探索（DB 更新に失敗して
 *      Stripe だけ成功した場合の取りこぼしを回収する）
 *   3. Stripe の idempotency key（同一キーの再送では新規 Transfer を作らない）
 *
 * 何度呼んでも安全なので、cron からの再試行スイープでもそのまま使える。
 */
export async function executePayout(
  admin: AdminClient,
  projectId: string
): Promise<PayoutResult> {
  /* 1. プロジェクトとクリエイターを取得 */
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select(
      'id, title, status, current_points, platform_fee_rate, ' +
        'creators(id, name, user_id, stripe_connect_account_id, stripe_connect_status)'
    )
    .eq('id', projectId)
    .maybeSingle<PayoutProject>()

  if (projectError) {
    // 0002_stripe_connect.sql 未適用だと creators の Stripe カラムが存在しない
    console.error('[connect] プロジェクト取得に失敗（0002 未適用？）', projectId, projectError)
    return { status: 'skipped', reason: `プロジェクト取得に失敗: ${projectError.message}` }
  }
  if (!project) {
    return { status: 'skipped', reason: 'プロジェクトが見つかりません' }
  }
  if (project.status !== 'succeeded') {
    return { status: 'skipped', reason: 'プロジェクトが達成状態ではありません' }
  }

  const creator = unwrapCreator(project.creators)
  if (!creator) {
    return { status: 'skipped', reason: 'クリエイターが見つかりません' }
  }

  /* 2. 送金済みなら何もしない */
  const { data: existing } = await admin
    .from('payouts')
    .select('id, status, stripe_transfer_id, gross_points, fee_amount, net_amount')
    .eq('project_id', project.id)
    .maybeSingle()

  if (existing?.status === 'paid') {
    return { status: 'skipped', reason: '送金済みです' }
  }

  /* 3. 金額を計算 */
  const feeRate = resolveFeeRate(project.platform_fee_rate)
  const { gross, fee, net } = calcPayout(project.current_points, feeRate)

  const baseRow = {
    project_id: project.id,
    creator_id: creator.id,
    stripe_account_id: creator.stripe_connect_account_id,
    gross_points: gross,
    fee_amount: fee,
    net_amount: net,
    platform_fee_rate: feeRate,
    currency: 'jpy',
  }

  if (net <= 0) {
    return { status: 'skipped', reason: '送金対象額が 0 円です' }
  }

  /* 4. Connect アカウントが有効かを確認。未連携なら保留として記録し、通知する */
  if (!creator.stripe_connect_account_id || creator.stripe_connect_status !== 'active') {
    const reason =
      creator.stripe_connect_status === 'restricted'
        ? 'Stripe アカウントに追加情報の提出が必要です'
        : 'Stripe の受取アカウントが未連携です'

    await markPayoutFailed(admin, baseRow, reason)

    // 既に同じ理由で保留済みなら再通知しない（cron が毎日回るため）
    if (existing?.status !== 'failed') {
      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', creator.user_id)
        .maybeSingle()
      if (profile?.email) {
        await sendPayoutBlockedEmail(profile.email, {
          creatorName: creator.name,
          projectTitle: project.title,
          netAmount: net,
          reason,
        })
      }
    }

    return { status: 'failed', reason }
  }

  const destination = creator.stripe_connect_account_id
  const transferGroup = `project_${project.id}`

  /* 5. 送金中としてマークする。unique 制約により 1 プロジェクト 1 行に収束する */
  const { error: upsertError } = await admin
    .from('payouts')
    .upsert({ ...baseRow, status: 'pending', error_message: null }, { onConflict: 'project_id' })

  if (upsertError) {
    console.error('[connect] payouts の記録に失敗', project.id, upsertError)
    return { status: 'failed', reason: '送金記録の作成に失敗しました' }
  }

  /* 6. Stripe 側に既存の Transfer が無いか確認してから発行する */
  try {
    const priorTransfers = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 })
    const prior = priorTransfers.data[0]

    const transfer =
      prior ??
      (await stripe.transfers.create(
        {
          amount: net,
          currency: 'jpy',
          destination,
          transfer_group: transferGroup,
          description: `FanUp: ${project.title}`,
          metadata: {
            project_id: project.id,
            creator_id: creator.id,
            gross_points: String(gross),
            fee_amount: String(fee),
            platform_fee_rate: String(feeRate),
          },
        },
        { idempotencyKey: `fanup_payout_${project.id}` }
      ))

    if (prior) {
      console.warn('[connect] 既存の Transfer を検出したため再利用', transferGroup, prior.id)
    }

    const { error: updateError } = await admin
      .from('payouts')
      .update({
        status: 'paid',
        stripe_transfer_id: transfer.id,
        stripe_account_id: destination,
        error_message: null,
        paid_at: new Date().toISOString(),
      })
      .eq('project_id', project.id)

    if (updateError) {
      // Stripe 側は成功しているので失敗扱いにはしない。
      // 次回の再試行では transfer_group 探索で既存 Transfer を拾って復旧する。
      console.error('[connect] 送金は成功したが payouts 更新に失敗', project.id, updateError)
    }

    /* 7. クリエイターへ送金通知（best-effort） */
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', creator.user_id)
      .maybeSingle()
    if (profile?.email) {
      await sendPayoutSentEmail(profile.email, {
        creatorName: creator.name,
        projectTitle: project.title,
        grossAmount: gross,
        feeAmount: fee,
        netAmount: net,
      })
    }

    return { status: 'paid', transferId: transfer.id, gross, fee, net }
  } catch (err) {
    // 代表的な失敗: balance_insufficient（プラットフォーム残高不足）、
    // account_invalid（連携先アカウントが無効化）など。いずれも failed として
    // 残しておけば cron の再試行スイープが翌日以降に拾い直す。
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[connect] Transfer に失敗', project.id, err)

    await admin
      .from('payouts')
      .update({ status: 'failed', error_message: message })
      .eq('project_id', project.id)

    return { status: 'failed', reason: message }
  }
}
