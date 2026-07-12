// Canonical app URL resolution for server-side use (Stripe redirect URLs, email links).
// Priority:
//   1. NEXT_PUBLIC_APP_URL        — explicit override (set to localhost in dev)
//   2. VERCEL_PROJECT_PRODUCTION_URL — auto-provided on Vercel (e.g. fanup-rouge.vercel.app)
//   3. known production fallback   — so a missing env var never breaks checkout
// Always returns an absolute https URL with no trailing slash.
function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return normalize(explicit)

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return normalize(vercel)

  return 'https://fanup-rouge.vercel.app'
}
