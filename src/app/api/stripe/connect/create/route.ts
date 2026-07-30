import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncConnectAccount } from '@/lib/stripe/connect'
import { getAppUrl } from '@/lib/url'

// Stripe Connect（Express）アカウントの作成 / オンボーディングリンク発行 API。
//
// body.mode:
//   'onboarding'（既定） … 新規作成 or 再開のためのアカウントリンクを返す
//   'dashboard'          … 連携済みアカウントの Express ダッシュボードへのログインリンクを返す
//
// いずれも { url } を返すので、クライアントはそこへリダイレクトする。

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  let mode: string = 'onboarding'
  try {
    const body = (await request.json()) as { mode?: unknown }
    if (body?.mode === 'dashboard') mode = 'dashboard'
  } catch {
    // body なしの呼び出しはオンボーディング扱い
  }

  // クリエイター登録の確認
  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('id, name, status, stripe_connect_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (creatorError) {
    // 0002_stripe_connect.sql 未適用だと stripe_connect_account_id が存在しない
    console.error('StripeConnect: creators の取得に失敗（0002 未適用？）', creatorError)
    return NextResponse.json(
      { error: 'Stripe 連携の準備ができていません。管理者にお問い合わせください。' },
      { status: 500 }
    )
  }
  if (!creator) {
    return NextResponse.json({ error: 'クリエイター申請が必要です' }, { status: 403 })
  }
  if (creator.status === 'rejected') {
    return NextResponse.json({ error: 'このアカウントでは連携できません' }, { status: 403 })
  }

  const appUrl = getAppUrl()
  // creators の Stripe 関連カラムは service role で書く（self-update RLS はあるが、
  // 連携状態はプラットフォームが管理する情報のため一貫して service role を使う）
  const admin = createAdminClient()

  try {
    let accountId: string | null = creator.stripe_connect_account_id ?? null

    /* 1. 未作成なら Express アカウントを作成する */
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'JP',
        email: user.email ?? undefined,
        // プラットフォームが決済を受けてから送金するため、必要なのは transfers のみ
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: creator.name,
          product_description: 'FanUp でのクリエイター活動に対するファンからの支援',
        },
        metadata: {
          creator_id: creator.id,
          user_id: user.id,
        },
      })

      accountId = account.id
      await syncConnectAccount(admin, creator.id, account)
    }

    /* 2. 連携済みアカウントのダッシュボードを開く */
    if (mode === 'dashboard') {
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return NextResponse.json({ url: loginLink.url })
    }

    /* 3. オンボーディング用のアカウントリンクを発行する
          リンクは単回・短命なので、期限切れ時は refresh_url が再発行を行う */
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${appUrl}/api/stripe/connect/callback?state=refresh`,
      return_url: `${appUrl}/api/stripe/connect/callback?state=return`,
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('StripeConnect: アカウント作成/リンク発行に失敗', err)
    return NextResponse.json({ error: 'Stripe 連携の開始に失敗しました' }, { status: 500 })
  }
}
