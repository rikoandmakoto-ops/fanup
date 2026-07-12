import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// プロジェクト更新 API（所有クリエイターのみ）
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  // 自分のクリエイター情報
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator) {
    return NextResponse.json({ error: 'クリエイター申請が必要です' }, { status: 403 })
  }

  // プロジェクトの存在・所有・募集中チェック
  const { data: project } = await supabase
    .from('projects')
    .select('id, creator_id, current_points, status')
    .eq('id', id)
    .maybeSingle()

  if (!project || project.creator_id !== creator.id) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  }
  if (project.status !== 'active') {
    return NextResponse.json({ error: '募集中のプロジェクトのみ編集できます' }, { status: 400 })
  }

  let body: { title?: unknown; description?: unknown; goal_points?: unknown; deadline_days?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const { title, description, goal_points, deadline_days } = body

  if (typeof title !== 'string' || !title.trim() || title.length > 80) {
    return NextResponse.json({ error: 'タイトルは80文字以内で入力してください' }, { status: 400 })
  }
  if (typeof description !== 'string' || !description.trim() || description.length > 4000) {
    return NextResponse.json({ error: '説明文は4000文字以内で入力してください' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    title: title.trim(),
    description: description.trim(),
  }

  // 目標・締め切りは支援が入る前のみ変更可
  const hasDonations = project.current_points > 0
  if (goal_points !== undefined) {
    if (hasDonations) {
      return NextResponse.json({ error: '支援が入った後は目標を変更できません' }, { status: 400 })
    }
    const goal = Number(goal_points)
    if (!Number.isInteger(goal) || goal < 1000 || goal > 10_000_000) {
      return NextResponse.json({ error: '目標ポイントは1,000〜10,000,000の整数で入力してください' }, { status: 400 })
    }
    updates.goal_points = goal
  }
  if (deadline_days !== undefined) {
    if (hasDonations) {
      return NextResponse.json({ error: '支援が入った後は締め切りを変更できません' }, { status: 400 })
    }
    const days = Number(deadline_days)
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return NextResponse.json({ error: '募集期間は1〜90日で指定してください' }, { status: 400 })
    }
    updates.deadline = new Date(Date.now() + days * 86400000).toISOString()
  }

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', project.id)

  if (error) {
    console.error('UpdateProject: update failed', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
