import { createClient } from '@supabase/supabase-js'

// サービスロール（RLS をバイパス）クライアント。
// サーバー側でのみ使用すること（webhook / cron / 管理操作 / クリエイターの支援者閲覧など）。
// 他ユーザーの profiles を読む必要がある場面で使う（profiles は self-read RLS のため）。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
