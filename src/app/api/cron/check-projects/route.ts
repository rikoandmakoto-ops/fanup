import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendProjectSucceededEmail, sendRefundEmail } from '@/lib/email'
import { executePayout } from '@/lib/stripe/connect'

// 認証・DB アクセスを伴うためプリレンダリングせず、常にリクエスト毎に実行する
export const dynamic = 'force-dynamic'

// Cron 用のため service role で直接接続
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Vercel Cron からの呼び出しを検証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 期限切れかつ status=active のプロジェクトを取得
  // 達成通知のため creator → user の email も併せて取得
  const { data: expiredProjects, error: fetchError } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, platform_fee_rate, creators(user_id)')
    .eq('status', 'active')
    .lt('deadline', now)

  if (fetchError) {
    console.error('Cron: プロジェクト取得失敗', fetchError)
    return NextResponse.json({ error: 'プロジェクト取得失敗' }, { status: 500 })
  }

  const results: { id: string; title: string; result: string }[] = []

  for (const project of expiredProjects ?? []) {
    const reached = project.current_points >= project.goal_points

    if (reached) {
      // 目標達成 → succeeded に変更
      const { error } = await supabase
        .from('projects')
        .update({ status: 'succeeded' })
        .eq('id', project.id)

      // クリエイターへ達成通知（best-effort）
      if (!error) {
        const creatorRaw = project.creators as unknown as { user_id: string } | { user_id: string }[] | null
        const creatorUserId = (Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw)?.user_id
        if (creatorUserId) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', creatorUserId)
            .single()
          if (creatorProfile?.email) {
            await sendProjectSucceededEmail(creatorProfile.email, project.title, project.current_points)
          }
        }
      }

      // 達成したら売上をクリエイターの Stripe Connect アカウントへ送金する。
      // 未連携・残高不足などで失敗しても payouts に failed として残り、
      // 下の再試行スイープが翌日以降に拾い直す。
      let payoutNote = ''
      if (!error) {
        const payout = await executePayout(supabase, project.id)
        payoutNote =
          payout.status === 'paid'
            ? `・送金完了 ¥${payout.net.toLocaleString()}`
            : `・送金${payout.status === 'skipped' ? 'スキップ' : '保留'}（${payout.reason}）`
      }

      results.push({
        id: project.id,
        title: project.title,
        result: error ? `達成処理失敗: ${error.message}` : `達成${payoutNote}`,
      })
    } else {
      // 未達成 → failed に変更 + ポイント返還
      const { error: statusError } = await supabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', project.id)

      if (statusError) {
        results.push({ id: project.id, title: project.title, result: `ステータス更新失敗: ${statusError.message}` })
        continue
      }

      // このプロジェクトの全 donations を取得
      const { data: donations } = await supabase
        .from('donations')
        .select('id, user_id, points')
        .eq('project_id', project.id)
        .eq('status', 'completed')

      if (!donations || donations.length === 0) {
        results.push({ id: project.id, title: project.title, result: '未達成（返還対象なし）' })
        continue
      }

      let refundCount = 0

      for (const donation of donations) {
        // 残高を加算
        const { data: profile } = await supabase
          .from('profiles')
          .select('point_balance, email')
          .eq('id', donation.user_id)
          .single()

        if (!profile) continue

        const { error: refundError } = await supabase
          .from('profiles')
          .update({ point_balance: profile.point_balance + donation.points })
          .eq('id', donation.user_id)

        if (refundError) {
          console.error(`Cron: 返還失敗 user=${donation.user_id}`, refundError)
          continue
        }

        // サポーターへ返還通知（best-effort）
        if (profile.email) {
          await sendRefundEmail(profile.email, project.title, donation.points)
        }

        // point_transactions に返還記録
        await supabase
          .from('point_transactions')
          .insert({
            user_id: donation.user_id,
            type: 'refund',
            amount: donation.points,
            related_project_id: project.id,
          })

        // donation のステータスを refunded に
        await supabase
          .from('donations')
          .update({ status: 'refunded' })
          .eq('id', donation.id)

        refundCount++
      }

      results.push({
        id: project.id,
        title: project.title,
        result: `未達成・${refundCount}件返還完了`,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 送金の再試行スイープ
  // 未連携・残高不足で保留になった達成済みプロジェクトを拾い直す。
  // executePayout は冪等なので、重複して送金されることはない。
  // ---------------------------------------------------------------------------
  const retried: { id: string; result: string }[] = []

  const { data: pendingPayouts } = await supabase
    .from('payouts')
    .select('project_id')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: true })
    .limit(50)

  for (const payout of pendingPayouts ?? []) {
    // このバッチで処理済みのプロジェクトは二度触らない
    if (results.some(r => r.id === payout.project_id)) continue

    const result = await executePayout(supabase, payout.project_id)
    retried.push({
      id: payout.project_id,
      result:
        result.status === 'paid'
          ? `送金完了 ¥${result.net.toLocaleString()}`
          : `${result.status === 'skipped' ? 'スキップ' : '保留'}: ${result.reason}`,
    })
  }

  if (results.length === 0 && retried.length === 0) {
    return NextResponse.json({ message: '処理対象なし' })
  }

  console.log('Cron: check-projects 完了', { results, retried })
  return NextResponse.json({ processed: results, payout_retries: retried })
}
