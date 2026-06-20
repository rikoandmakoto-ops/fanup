import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
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

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
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

    // 冪等性チェック: 同じ stripe_session_id で既に処理済みなら skip
    const { data: existing } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existing) {
      console.log(`Webhook: session ${session.id} already processed, skipping`)
      return NextResponse.json({ received: true })
    }

    // point_transactions に購入履歴を記録
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: points,
        stripe_session_id: session.id,
      })

    if (txError) {
      console.error('Webhook: point_transactions insert failed', txError)
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // profiles テーブルの point_balance を加算
    const { error } = await supabase.rpc('add_points', {
      target_user_id: userId,
      amount: points,
    })

    if (error) {
      console.error('Webhook: add_points RPC failed, trying direct update', error)
      // RPC が未作成の場合は直接更新にフォールバック
      const { data: profile } = await supabase
        .from('profiles')
        .select('point_balance')
        .eq('id', userId)
        .single()

      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ point_balance: profile.point_balance + points })
          .eq('id', userId)

        if (updateError) {
          console.error('Webhook: direct balance update also failed', updateError)
          return NextResponse.json({ error: 'Failed to add points' }, { status: 500 })
        }
      }
    }

    console.log(`Webhook: ${points}pt added to user ${userId} (session: ${session.id})`)
  }

  return NextResponse.json({ received: true })
}
