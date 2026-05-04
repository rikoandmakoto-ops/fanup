import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const { points } = await request.json()

  if (!points || points < 500 || !Number.isInteger(points)) {
    return NextResponse.json({ error: '無効なポイント数です' }, { status: 400 })
  }

  const amount = points // 1pt = ¥1

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
}
