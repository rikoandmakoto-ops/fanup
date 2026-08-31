import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 認証・DB アクセスを伴うためプリレンダリングせず、常にリクエスト毎に実行する
export const dynamic = 'force-dynamic'

// プロジェクト作成 API（クリエイターのみ）
export async function POST(request: Request) {
  // 認証チェック
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  // クリエイター登録の確認（status=approved のみ作成可）
  const { data: creator } = await supabase
    .from('creators')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator) {
    return NextResponse.json({ error: 'クリエイター申請が必要です' }, { status: 403 })
  }
  if (creator.status !== 'approved') {
    return NextResponse.json({ error: '承認後にプロジェクトを作成できます' }, { status: 403 })
  }

  // 入力値を取得
  const { title, description, goal_points, deadline_days } = await request.json()

  // バリデーション
  if (!title || typeof title !== 'string' || title.length > 80) {
    return NextResponse.json({ error: 'タイトルは80文字以内で入力してください' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || description.length > 4000) {
    return NextResponse.json({ error: '説明文は4000文字以内で入力してください' }, { status: 400 })
  }
  const goal = Number(goal_points)
  if (!Number.isInteger(goal) || goal < 1000 || goal > 10_000_000) {
    return NextResponse.json({ error: '目標ポイントは1,000〜10,000,000の整数で入力してください' }, { status: 400 })
  }
  const days = Number(deadline_days)
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: '募集期間は1〜90日で指定してください' }, { status: 400 })
  }

  // 締め切り日時を計算
  const deadline = new Date(Date.now() + days * 86400000).toISOString()

  // projects に挿入
  const { data: inserted, error } = await supabase
    .from('projects')
    .insert({
      creator_id: creator.id,
      title,
      description,
      goal_points: goal,
      current_points: 0,
      deadline,
      status: 'active',
      platform_fee_rate: 0.30,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('CreatorProjects: insert failed', error)
    return NextResponse.json({ error: 'プロジェクトの作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true, project_id: inserted.id })
}
