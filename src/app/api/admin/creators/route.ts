import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendCreatorApprovedEmail, sendCreatorRejectedEmail } from '@/lib/email'

// 認証・DB アクセスを伴うためプリレンダリングせず、常にリクエスト毎に実行する
export const dynamic = 'force-dynamic'

// 管理者がクリエイター申請を承認・却下する API
// 認証は cookie ベースの SSR クライアントで行い、
// 実際の更新は RLS を回避するため service role クライアントで実行する
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  // ログインユーザーを取得
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  // 管理者権限を確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  // 入力値を取得
  let body: { creator_id?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const { creator_id, action } = body

  // バリデーション
  if (!creator_id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected'

  // service role で creators の status を更新
  const admin = createAdminClient()
  const { data: updated, error } = await admin
    .from('creators')
    .update({ status: nextStatus })
    .eq('id', creator_id)
    .select('id, status, name, user_id')
    .single()

  if (error || !updated) {
    console.error('AdminCreators: update failed', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  // 申請者のメールアドレスを取得して結果を通知（best-effort）
  const { data: applicant } = await admin
    .from('profiles')
    .select('email')
    .eq('id', updated.user_id)
    .single()

  if (applicant?.email) {
    if (nextStatus === 'approved') {
      await sendCreatorApprovedEmail(applicant.email, updated.name)
    } else {
      await sendCreatorRejectedEmail(applicant.email, updated.name)
    }
  }

  return NextResponse.json({ success: true, status: updated.status })
}
