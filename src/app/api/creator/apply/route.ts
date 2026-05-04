import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// クリエイター申請 API
export async function POST(request: Request) {
  // 認証ユーザーを取得
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  // 入力値を取得
  const { name, category, bio } = await request.json()

  // バリデーション：必須項目とサイズ
  if (!name || typeof name !== 'string' || name.length > 60) {
    return NextResponse.json({ error: '名前は60文字以内で入力してください' }, { status: 400 })
  }
  if (!category || typeof category !== 'string' || category.length > 30) {
    return NextResponse.json({ error: 'カテゴリを選択してください' }, { status: 400 })
  }
  if (bio && (typeof bio !== 'string' || bio.length > 1000)) {
    return NextResponse.json({ error: 'プロフィールは1000文字以内で入力してください' }, { status: 400 })
  }

  // 既に申請・登録済みかチェック（user_id にユニーク制約がある想定）
  const { data: existing } = await supabase
    .from('creators')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'すでに申請済みです', status: existing.status }, { status: 409 })
  }

  // creators に審査中レコードを作成
  const { error } = await supabase
    .from('creators')
    .insert({
      user_id: user.id,
      name,
      category,
      bio: bio ?? null,
      status: 'pending',
    })

  if (error) {
    console.error('CreatorApply: insert failed', error)
    return NextResponse.json({ error: '申請の登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
