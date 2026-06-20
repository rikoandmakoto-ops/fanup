import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  let body: { project_id?: unknown; points?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const { project_id, points } = body

  if (!project_id || typeof points !== 'number' || points < 100 || !Number.isInteger(points) || points > 1000000) {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  // 残高を確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('point_balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.point_balance < points) {
    return NextResponse.json({ error: 'ポイントが不足しています' }, { status: 400 })
  }

  // プロジェクトの存在・募集中を確認
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', project_id)
    .single()

  if (!project || project.status !== 'active') {
    return NextResponse.json({ error: 'このプロジェクトは募集中ではありません' }, { status: 400 })
  }

  // donations に記録
  const { error: donationError } = await supabase
    .from('donations')
    .insert({
      user_id: user.id,
      project_id,
      points,
      status: 'completed',
    })

  if (donationError) {
    console.error('Donate: donations insert failed', donationError)
    return NextResponse.json({ error: '応援の記録に失敗しました' }, { status: 500 })
  }

  // point_transactions に記録
  const { error: txError } = await supabase
    .from('point_transactions')
    .insert({
      user_id: user.id,
      type: 'donation',
      amount: points,
      related_project_id: project_id,
    })

  if (txError) {
    console.error('Donate: point_transactions insert failed', txError)
  }

  // 残高を減算 (RPC で原子的に行うことを試みる)
  const { error: rpcError } = await supabase.rpc('subtract_points', {
    target_user_id: user.id,
    amount: points,
  })

  if (rpcError) {
    // RPC が未作成の場合は直接更新にフォールバック
    console.warn('Donate: subtract_points RPC not available, falling back to direct update')
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ point_balance: profile.point_balance - points })
      .eq('id', user.id)

    if (balanceError) {
      console.error('Donate: balance update failed', balanceError)
      return NextResponse.json({ error: '残高の更新に失敗しました' }, { status: 500 })
    }
  }

  // プロジェクトの current_points を加算
  const { error: projectError } = await supabase.rpc('add_project_points', {
    target_project_id: project_id,
    amount: points,
  })

  // RPC が未作成の場合は直接更新にフォールバック
  if (projectError) {
    console.warn('Donate: add_project_points RPC not available, falling back to direct update')
    const { data: currentProject } = await supabase
      .from('projects')
      .select('current_points')
      .eq('id', project_id)
      .single()

    if (currentProject) {
      await supabase
        .from('projects')
        .update({ current_points: currentProject.current_points + points })
        .eq('id', project_id)
    }
  }

  // 最新の残高を返す
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('point_balance')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    success: true,
    new_balance: updatedProfile?.point_balance ?? (profile.point_balance - points),
  })
}
