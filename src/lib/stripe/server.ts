import Stripe from 'stripe'

// Stripe クライアントは「最初に使うとき」に生成する。
// トップレベルで new Stripe() すると STRIPE_SECRET_KEY が無い環境
// （Vercel のビルド時など）で import しただけで例外になり、
// "Failed to collect page data" でビルドが落ちるため。
let client: Stripe | null = null

function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return client
}

// 呼び出し側は今まで通り stripe.xxx で使える。
// プロパティに触れた時点ではじめて実体を作る。
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getStripe(), prop, receiver)
    return typeof value === 'function' ? value.bind(getStripe()) : value
  },
})
