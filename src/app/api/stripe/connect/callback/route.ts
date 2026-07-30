import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshConnectAccount } from '@/lib/stripe/connect'
import { getAppUrl } from '@/lib/url'

// Stripe Connect オンボーディングからの復帰先。
// Stripe はクエリを付けずにブラウザを戻してくるため、こちらで付けた state で分岐する。
//   state=return  … オンボーディングを抜けた（完了とは限らない）→ 状態を同期して /creator へ
//   state=refresh … アカウントリンクの期限切れ → 新しいリンクを発行して再度 Stripe へ
//
// 完了したかどうかは Stripe から取得した account を正とする。
// （ユーザーが途中で戻ってきた場合は pending のままになる）

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const appUrl = getAppUrl()
  const state = new URL(request.url).searchParams.get('state') ?? 'return'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id, stripe_connect_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator?.stripe_connect_account_id) {
    return NextResponse.redirect(`${appUrl}/creator?connect=error`)
  }

  const accountId = creator.stripe_connect_account_id

  /* リンク期限切れ: 同じパラメータで再発行して Stripe に戻す */
  if (state === 'refresh') {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        refresh_url: `${appUrl}/api/stripe/connect/callback?state=refresh`,
        return_url: `${appUrl}/api/stripe/connect/callback?state=return`,
      })
      return NextResponse.redirect(accountLink.url)
    } catch (err) {
      console.error('StripeConnect: アカウントリンクの再発行に失敗', err)
      return NextResponse.redirect(`${appUrl}/creator?connect=error`)
    }
  }

  /* 通常復帰: Stripe から最新状態を取得して creators に反映する */
  const admin = createAdminClient()
  const status = await refreshConnectAccount(admin, creator.id, accountId)

  if (!status) {
    return NextResponse.redirect(`${appUrl}/creator?connect=error`)
  }

  return NextResponse.redirect(`${appUrl}/creator?connect=${status}`)
}
