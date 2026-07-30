import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import { syncConnectAccount } from '@/lib/stripe/connect'
import Stripe from 'stripe'

// App Router ではデフォルトで body が parse されるため、
// Stripe 署名検証用に raw body として受け取る設定
export const dynamic = 'force-dynamic'

// Webhook では cookie 不要なので service role クライアントを直接作成
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ポイント付与: add_points RPC を試し、未作成なら直接更新にフォールバック。
// 成否を boolean で返す（失敗時は呼び出し側で台帳行をロールバックする）。
async function addPoints(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  points: number
): Promise<boolean> {
  const { error } = await supabase.rpc('add_points', {
    target_user_id: userId,
    amount: points,
  })
  if (!error) return true

  console.error('Webhook: add_points RPC failed, trying direct update', error)
  const { data: profile } = await supabase
    .from('profiles')
    .select('point_balance')
    .eq('id', userId)
    .single()

  if (!profile) {
    console.error('Webhook: profile not found for direct balance update', userId)
    return false
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ point_balance: profile.point_balance + points })
    .eq('id', userId)

  if (updateError) {
    console.error('Webhook: direct balance update also failed', updateError)
    return false
  }
  return true
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // Connect（account.updated など）は別エンドポイント＝別の署名シークレットで
  // 届くため、両方の秘密鍵で順に検証する。STRIPE_CONNECT_WEBHOOK_SECRET が
  // 未設定なら従来どおり STRIPE_WEBHOOK_SECRET のみで検証する。
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((s): s is string => Boolean(s))

  let event: Stripe.Event | null = null
  let lastError = 'No webhook secret configured'

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret)
      break
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
    }
  }

  if (!event) {
    console.error('Webhook signature verification failed:', lastError)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.user_id
    const points = Number(session.metadata?.points)

    if (!userId || !points) {
      console.error('Webhook: metadata missing', session.id)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 冪等性: stripe_session_id の unique index を使い、台帳行の insert を
    // アトミックなロックとして用いる。重複配信・再試行は 23505 で弾かれる。
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: points,
        stripe_session_id: session.id,
      })

    if (txError) {
      // 23505 = unique_violation → 既に処理済み。冪等に ack する。
      if (txError.code === '23505') {
        console.log(`Webhook: session ${session.id} already processed, skipping`)
        return NextResponse.json({ received: true })
      }
      console.error('Webhook: point_transactions insert failed', txError)
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // profiles の point_balance を加算
    const added = await addPoints(supabase, userId, points)

    if (!added) {
      // 付与に失敗したら台帳行を取り消す。行を残すと冪等チェックに弾かれ、
      // Stripe の再試行でもポイントが永久に付与されなくなるため。
      await supabase.from('point_transactions').delete().eq('stripe_session_id', session.id)
      console.error('Webhook: add points failed, rolled back ledger row', session.id)
      return NextResponse.json({ error: 'Failed to add points' }, { status: 500 })
    }

    console.log(`Webhook: ${points}pt added to user ${userId} (session: ${session.id})`)
  }

  // Connect アカウントの審査状況が変わったら creators の連携ステータスを同期する。
  // （オンボーディング復帰時にも同期しているが、後から審査が通る/制限される場合がある）
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const supabase = createAdminClient()

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('stripe_connect_account_id', account.id)
      .maybeSingle()

    if (!creator) {
      // FanUp が作成したアカウントでなければ何もしない（冪等に ack）
      console.log(`Webhook: account ${account.id} に対応する creator なし、スキップ`)
      return NextResponse.json({ received: true })
    }

    const status = await syncConnectAccount(supabase, creator.id, account)
    console.log(`Webhook: creator ${creator.id} の Connect ステータスを ${status} に更新`)
  }

  return NextResponse.json({ received: true })
}
