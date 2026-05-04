import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const { data: expiredProjects, error: fetchError } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, platform_fee_rate')
    .eq('status', 'active')
    .lt('deadline', now)

  if (fetchError) {
    console.error('Cron: プロジェクト取得失敗', fetchError)
    return NextResponse.json({ error: 'プロジェクト取得失敗' }, { status: 500 })
  }

  if (!expiredProjects || expiredProjects.length === 0) {
    return NextResponse.json({ message: '処理対象なし' })
  }

  const results: { id: number; title: string; result: string }[] = []

  for (const project of expiredProjects) {
    const reached = project.current_points >= project.goal_points

    if (reached) {
      // 目標達成 → succeeded に変更
      const { error } = await supabase
        .from('projects')
        .update({ status: 'succeeded' })
        .eq('id', project.id)

      results.push({
        id: project.id,
        title: project.title,
        result: error ? `達成処理失敗: ${error.message}` : '達成',
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
          .select('point_balance')
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

  console.log('Cron: check-projects 完了', results)
  return NextResponse.json({ processed: results })
}
