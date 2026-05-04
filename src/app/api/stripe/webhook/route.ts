import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Webhook では cookie 不要なので service role クライアントを直接作成
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

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

    // profiles テーブルの point_balance を加算
    const { error } = await supabase.rpc('add_points', {
      target_user_id: userId,
      amount: points,
    })

    if (error) {
      console.error('Webhook: add_points failed', error)
      return NextResponse.json({ error: 'Failed to add points' }, { status: 500 })
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
    }

    console.log(`Webhook: ${points}pt added to user ${userId}`)
  }

  return NextResponse.json({ received: true })
}
