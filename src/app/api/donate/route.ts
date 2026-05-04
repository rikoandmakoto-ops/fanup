import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const { project_id, points } = await request.json()

  if (!project_id || !points || points < 100 || !Number.isInteger(points)) {
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

  // 残高を減算
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({ point_balance: profile.point_balance - points })
    .eq('id', user.id)

  if (balanceError) {
    console.error('Donate: balance update failed', balanceError)
    return NextResponse.json({ error: '残高の更新に失敗しました' }, { status: 500 })
  }

  // プロジェクトの current_points を加算
  const { error: projectError } = await supabase.rpc('add_project_points', {
    target_project_id: project_id,
    amount: points,
  })

  // RPC が未作成の場合は直接更新にフォールバック
  if (projectError) {
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

  return NextResponse.json({
    success: true,
    new_balance: profile.point_balance - points,
  })
}
