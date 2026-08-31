import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executePayout } from '@/lib/stripe/connect'

// 認証・DB アクセスを伴うためプリレンダリングせず、常にリクエスト毎に実行する
export const dynamic = 'force-dynamic'

// 達成済みプロジェクトの売上をクリエイターの Connect アカウントへ送金する API。
//
// 認可は 2 系統:
//   1. Authorization: Bearer ${CRON_SECRET} … 内部呼び出し（任意のプロジェクト）
//   2. ログイン中のクリエイター本人      … 自分のプロジェクトのみ
//   3. role=admin のユーザー              … 任意のプロジェクト（救済用）
//
// 実処理と冪等性の担保は executePayout 側にある。何度叩いても二重送金にはならない。

export async function POST(request: Request) {
  let body: { project_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const projectId = body.project_id
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'project_id が必要です' }, { status: 400 })
  }

  const admin = createAdminClient()

  /* 1. 内部呼び出し（cron / 運用スクリプト） */
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isInternal = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  if (!isInternal) {
    /* 2. ログインユーザーとして認可する */
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      // クリエイター本人であること、かつ対象が自分のプロジェクトであることを確認
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!creator) {
        return NextResponse.json({ error: 'クリエイター登録が必要です' }, { status: 403 })
      }

      const { data: project } = await admin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('creator_id', creator.id)
        .maybeSingle()

      if (!project) {
        return NextResponse.json({ error: 'このプロジェクトを操作する権限がありません' }, { status: 403 })
      }
    }
  }

  const result = await executePayout(admin, projectId)

  if (result.status === 'paid') {
    return NextResponse.json({
      success: true,
      transfer_id: result.transferId,
      gross_amount: result.gross,
      fee_amount: result.fee,
      net_amount: result.net,
    })
  }

  if (result.status === 'skipped') {
    return NextResponse.json({ success: false, skipped: true, reason: result.reason })
  }

  // 送金失敗は payouts に failed として残り、cron が翌日以降に再試行する
  return NextResponse.json({ success: false, error: result.reason }, { status: 409 })
}
