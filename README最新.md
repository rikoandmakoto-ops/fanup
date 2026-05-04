FanUp 開発引き継ぎドキュメント
プロジェクト概要
ファンクラブ特化型クラウドファンディングプラットフォーム。ユーザーがポイントを購入してクリエイターのプロジェクトに投げ、目標達成でチャンネルが開設される仕組み。All-or-Nothing方式。プラットフォーム手数料30%。

技術スタック

Next.js 14（App Router）
TypeScript
Tailwind CSS
Supabase（DB・Auth）
Stripe（決済）
Resend（メール通知・未実装）
Vercel（デプロイ予定）


Supabase情報

Project URL：https://vxaxgxupcklbimthkagi.supabase.co
.env.local に NEXT_PUBLIC_SUPABASE_URL・NEXT_PUBLIC_SUPABASE_ANON_KEY・SUPABASE_SERVICE_ROLE_KEY 設定済み


DBスキーマ（作成済み）
sqlprofiles（id, email, display_name, point_balance, role, created_at）
creators（id, user_id, name, category, bio, status, created_at）
projects（id, creator_id, title, description, goal_points, current_points, deadline, status, platform_fee_rate=0.30, created_at）
point_transactions（id, user_id, type, amount, stripe_session_id, related_project_id, created_at）
donations（id, user_id, project_id, points, status, created_at）
RLS設定済み。ユーザー登録時にprofilesを自動作成するトリガー設定済み。

フォルダ構成
src/
  app/
    (auth)/
      login/page.tsx        ✅ 完成
      signup/page.tsx       ✅ 完成
    projects/
      page.tsx              ✅ 完成（静的データ）
      [id]/page.tsx         ✅ 完成（静的データ）
    buy-points/
      page.tsx              ✅ 完成
      success/              フォルダのみ作成済み・page.tsx未作成
      cancel/               フォルダのみ作成済み・page.tsx未作成
    api/
      stripe/
        checkout/route.ts   ✅ 完成
        webhook/            フォルダのみ作成済み・route.ts未作成
    mypage/                 フォルダのみ作成済み・page.tsx未作成
    admin/                  フォルダのみ作成済み・page.tsx未作成
    creator/                フォルダのみ作成済み・page.tsx未作成
    page.tsx                ✅ 完成（トップページ・静的データ）
  components/
    layout/
      Header.tsx            ✅ 完成（認証状態切り替え対応済み）
  lib/
    supabase/
      client.ts             ✅ 完成
      server.ts             ✅ 完成

注意事項

日本語・絵文字を含むファイルは cat コマンドで作成すると文字化けする。Cursorで直接貼り付けること
URLルーティングは (auth) グループのため /auth/login ではなく /login・/signup
ページ内のプロジェクトデータは現在すべて静的。Supabaseからの取得は未実装
Stripeのキーは .env.local に未入力のまま（後で入力 プレースホルダー）


次に実装すべきもの（優先順）
① Stripe Webhook（src/app/api/stripe/webhook/route.ts）
決済完了後にpoint_balanceを加算する処理。checkout.session.completed イベントを受け取り、profiles.point_balance を更新する。
② buy-points/success と cancel ページ
Stripeからのリダイレクト先。successページでは残高更新を表示してマイページへ誘導。
③ マイページ（src/app/mypage/page.tsx）
残高表示・応援履歴・購入履歴。Supabaseの point_transactions と donations テーブルから取得。
④ プロジェクト詳細の実際の応援機能
現在はログインボタンのみ。ログイン済みユーザーがポイントを入力して投げる処理を実装。donations テーブルにINSERTし、profiles.point_balance を減算、projects.current_points を加算。
⑤ Supabaseからのデータ取得
現在すべてのページが静的データ。projects テーブルからデータを取得する形に切り替える。
⑥ クリエイターダッシュボード（src/app/creator/page.tsx）
自分のプロジェクト進捗・サポーター一覧・活動報告投稿。
⑦ 管理画面（src/app/admin/page.tsx）
プロジェクト管理・クリエイター審査・ユーザー管理・決済ログ。role=admin のみアクセス可能。
⑧ 目標達成・未達成の自動処理
Supabase Edge FunctionのCronで定期実行。達成時はstatusを succeeded に変更。未達成はポイント返還処理。
⑨ Vercelデプロイ・環境変数設定
GitHubリポジトリ作成→Vercel連携→本番環境変数設定。

コーディングルール

すべてのコードに行コメントをつけること
日本語ファイルはターミナルではなくCursorで直接作成すること
削除コマンド実行前は必ず確認を取ること
TypeScript・JavaScript混在不可。TypeScriptの