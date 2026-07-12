# Phase 0 — 本番決済 E2E セットアップ

集客の前提となる「決済 → ポイント付与」を本番（https://fanup-rouge.vercel.app）で完走させるための設定手順。
コード側はこのドキュメントの環境変数を Vercel に入れれば動く状態になっている。

---

## 1. 必要な環境変数（Vercel → Project → Settings → Environment Variables）

すべて **Production** スコープに設定する。`NEXT_PUBLIC_` で始まるものはビルド時にバンドルへ埋め込まれるため、
**値を設定/変更したら必ず再デプロイ（Redeploy）すること。**

| 変数 | 必須 | 値の取得元 | 備考 |
|------|------|-----------|------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe Dashboard（本番モード）→ Developers → API keys → Secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | 下記「3. Webhook 設定」で取得 | `whsec_...`（本番エンドポイント用） |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Project Settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API（service_role） | Webhook/Cron が RLS を越えて書き込むのに必須 |
| `RESEND_API_KEY` | ⬜ | Resend → API Keys | 未設定でも決済は動く（メールは best-effort スキップ） |
| `RESEND_FROM` | ⬜ | 検証済みドメインの送信元 | 未設定時は `FanUp <onboarding@resend.dev>` |
| `CRON_SECRET` | ✅(Cron) | 任意のランダム長文字列（`openssl rand -hex 32`） | Cron エンドポイント保護。Vercel Cron が自動で `Authorization: Bearer` に付与 |
| `NEXT_PUBLIC_APP_URL` | ⬜ | `https://fanup-rouge.vercel.app` | 未設定でも `VERCEL_PROJECT_PRODUCTION_URL` → 既定値にフォールバック（`src/lib/url.ts`） |

> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` は**現状の決済フローでは不要**。
> Checkout は API で生成した `session.url` へリダイレクトする方式で、クライアント側 Stripe.js を使っていない（`src/lib/stripe/client.ts` は未使用）。

---

## 2. Stripe 本番キーの設定

1. Stripe Dashboard を **本番モード（右上トグル）** に切り替える。
2. Developers → API keys から **Secret key (`sk_live_...`)** をコピー。
3. Vercel に `STRIPE_SECRET_KEY` として設定。
4. アカウントの本番決済が有効化（本人確認・銀行口座登録）されていることを確認。

---

## 3. Webhook 設定（STRIPE_WEBHOOK_SECRET の取得）

1. Stripe Dashboard（本番モード）→ Developers → Webhooks → **Add endpoint**。
2. Endpoint URL: `https://fanup-rouge.vercel.app/api/stripe/webhook`
3. リッスンするイベント: **`checkout.session.completed`**（これだけで十分）。
4. 作成後の **Signing secret (`whsec_...`)** をコピーし、Vercel に `STRIPE_WEBHOOK_SECRET` として設定。
5. 設定後に「Send test webhook」で 200 が返ることを確認。

---

## 4. Supabase マイグレーション適用の確認

`supabase/migrations/0000_init.sql` と `0001_follows.sql` が本番 DB に適用済みであること。
特に決済フローは以下に依存:

- テーブル `point_transactions`（`stripe_session_id` の **unique index** が冪等性の要）
- テーブル `profiles`（`point_balance`）
- RPC `add_points(target_user_id uuid, amount integer)`

RPC 未作成でも Webhook は直接 UPDATE にフォールバックするが、本番では RPC を入れておくこと（原子的・安全）。

---

## 5. 決済 → ポイント付与の E2E 導線（コードレベル検証済み）

```
buy-points/page.tsx
  └─ POST /api/stripe/checkout           ← ログイン必須・points を 500〜1,000,000 で検証
       └─ stripe.checkout.sessions.create
            ├─ metadata: { user_id, points }   ← Webhook はここから付与対象を特定
            └─ success_url / cancel_url         ← getAppUrl() でフォールバック付き（修正済み）
       └─ session.url へリダイレクト → Stripe Checkout で決済

Stripe → checkout.session.completed
  └─ POST /api/stripe/webhook
       ├─ 署名検証（STRIPE_WEBHOOK_SECRET）
       ├─ point_transactions に purchase 行を insert
       │    └─ unique(stripe_session_id) でアトミックに冪等化（重複配信は 23505 で ack）
       ├─ add_points RPC（失敗時は直接 UPDATE フォールバック）
       └─ 付与失敗時は台帳行をロールバック → Stripe 再試行で再処理可能（修正済み）
```

### 検証チェックリスト（本番）
- [ ] 本番でポイント購入 → Stripe Checkout へ遷移できる（`success_url` が正しい絶対URL）
- [ ] テスト購入完了後、Stripe Dashboard の Webhook ログが 200
- [ ] `profiles.point_balance` が購入分だけ増えている
- [ ] `point_transactions` に `type=purchase` 行が 1 件だけ（重複なし）
- [ ] success ページ（`/buy-points/success`）が表示される

> 注意: ポイント反映は Webhook 経由のため、ユーザーが success ページに着いた瞬間には
> まだ反映されていない可能性がある（通常は数秒）。残高は mypage 等で確認可能。

---

## 6. Cron（プロジェクト締切処理）

`vercel.json` の cron 定義により `/api/cron/check-projects` が毎日 00:00 UTC に実行される。
`CRON_SECRET` を設定すれば Vercel Cron が自動で `Authorization: Bearer <CRON_SECRET>` を付けて呼ぶ。
未設定だと全リクエストが 401 になる点に注意。
