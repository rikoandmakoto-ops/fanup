import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// クリエイターのフォロー / フォロー解除 API
// 認証は cookie ベースの SSR クライアント、書き込みは RLS を回避するため service role で行う
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  let body: { creator_id?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const { creator_id, action } = body

  if (!creator_id || typeof creator_id !== 'string' || (action !== 'follow' && action !== 'unfollow')) {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (action === 'follow') {
    // 重複は primary key で弾かれるため upsert で冪等にする
    const { error } = await admin
      .from('follows')
      .upsert({ follower_id: user.id, creator_id }, { onConflict: 'follower_id,creator_id' })

    if (error) {
      console.error('Follow: upsert failed', error)
      return NextResponse.json({ error: 'フォローに失敗しました' }, { status: 500 })
    }
  } else {
    const { error } = await admin
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('creator_id', creator_id)

    if (error) {
      console.error('Follow: delete failed', error)
      return NextResponse.json({ error: 'フォロー解除に失敗しました' }, { status: 500 })
    }
  }

  // 最新のフォロワー数を返す
  const { count } = await admin
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('creator_id', creator_id)

  return NextResponse.json({
    success: true,
    following: action === 'follow',
    count: count ?? 0,
  })
}
