import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  let body: { points?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const { points } = body

  if (typeof points !== 'number' || points < 500 || !Number.isInteger(points) || points > 1000000) {
    return NextResponse.json({ error: '無効なポイント数です（500〜1,000,000）' }, { status: 400 })
  }

  const amount = points // 1pt = ¥1

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: amount,
            product_data: {
              name: `${points.toLocaleString()} ポイント`,
              description: 'FanUp ポイント購入',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        points: String(points),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/buy-points/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/buy-points/cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
