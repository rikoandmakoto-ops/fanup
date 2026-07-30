#!/bin/bash
# =============================================================================
# FanUp — Vercel 本番環境変数の設定ヘルパー
#
# Stripe のキーが用意できたらこのファイルをダブルクリックしてください。
# 値を聞かれるので貼り付けると、Vercel の Production 環境に登録されます。
# 空のまま Enter を押した項目はスキップされます（あとでもう一度実行できます）。
#
# ※ RESEND_API_KEY はこのスクリプトでは扱いません。
# =============================================================================
set -u
cd "$(dirname "$0")/.." || exit 1

echo "======================================"
echo " FanUp Vercel 本番環境変数の設定"
echo "======================================"
echo

if ! command -v vercel >/dev/null 2>&1; then
  echo "エラー: vercel CLI が見つかりません。"
  echo "  npm i -g vercel@latest を実行してください。"
  echo
  read -r -p "Enter キーで閉じます..." _
  exit 1
fi

# $1 = 変数名, $2 = 説明, $3 = 入力例
set_env() {
  local name="$1" desc="$2" example="$3" value=""
  echo "--------------------------------------"
  echo "$name"
  echo "  $desc"
  echo "  例: $example"
  read -r -p "  値を貼り付けて Enter（スキップは空のまま Enter）: " value
  if [ -z "$value" ]; then
    echo "  → スキップしました"
    echo
    return
  fi
  # 既存の値があると add が失敗するため、先に消してから登録し直す
  vercel env rm "$name" production --yes >/dev/null 2>&1
  if printf '%s' "$value" | vercel env add "$name" production >/dev/null 2>&1; then
    echo "  → 登録しました"
  else
    echo "  → 失敗しました。Vercel ダッシュボードから手動で登録してください。"
  fi
  echo
}

set_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  "Stripe の公開キー。Stripe ダッシュボード > 開発者 > APIキー。" \
  "pk_live_51Abc..."

set_env "STRIPE_CONNECT_WEBHOOK_SECRET" \
  "Connect 用 webhook の署名シークレット。account.updated を購読するエンドポイントを作った場合のみ。" \
  "whsec_..."

set_env "PLATFORM_FEE_RATE" \
  "プラットフォーム手数料率。未設定なら 0.10（10%）が使われます。" \
  "0.10"

echo "======================================"
echo " 現在の Production 環境変数"
echo "======================================"
vercel env ls production
echo
echo "変数を変更した場合は、反映のため再デプロイが必要です。"
read -r -p "いま再デプロイしますか？ (y/N): " redeploy
if [ "${redeploy:-N}" = "y" ] || [ "${redeploy:-N}" = "Y" ]; then
  vercel --prod --yes
fi

echo
read -r -p "完了しました。Enter キーで閉じます..." _
