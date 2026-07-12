import { Resend } from 'resend'
import { getAppUrl } from '@/lib/url'

// Resend を使ったトランザクションメール送信ヘルパー
// RESEND_API_KEY が未設定・不正でもアプリを止めないよう、すべて best-effort で動作する

// 検証済みドメインが無い場合でも動く Resend のテスト用 from を既定値にする
const from = process.env.RESEND_FROM || 'FanUp <onboarding@resend.dev>'

// 実在する Resend キーのみ受け付ける（プレースホルダや日本語混入を弾く）。
// 不正な値で new Resend() するとヘッダ生成時に例外になるため、ここで検証する。
function getResendKey(): string | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!/^re_[A-Za-z0-9_-]+$/.test(key)) return null
  return key
}

// Resend クライアントは「送信時に」生成する（import 時に例外を出さないため）
function getClient(): Resend | null {
  const key = getResendKey()
  if (!key) return null
  try {
    return new Resend(key)
  } catch (err) {
    console.error('[email] Resend 初期化失敗:', err)
    return null
  }
}

type SendArgs = {
  to: string
  subject: string
  html: string
}

// 1通送信する。失敗してもスローせず false を返す（呼び出し側の処理を止めない）
export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const resend = getClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY が未設定/不正のため送信をスキップ:', subject)
    return false
  }
  if (!to) {
    console.warn('[email] 宛先が空のため送信をスキップ:', subject)
    return false
  }

  try {
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      console.error('[email] 送信失敗:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] 送信例外:', err)
    return false
  }
}

const appUrl = getAppUrl()

// 共通レイアウト（FanUp パープルテーマに合わせたシンプルな HTML）
function layout(title: string, body: string, cta?: { label: string; href: string }): string {
  return `
  <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
    <div style="font-size: 22px; font-weight: 700; color: #7C3AED; margin-bottom: 24px;">FanUp</div>
    <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">${title}</div>
    <div style="font-size: 14px; line-height: 1.8; color: #525252;">${body}</div>
    ${cta ? `<a href="${cta.href}" style="display: inline-block; margin-top: 24px; background: #7C3AED; color: #fff; padding: 12px 28px; border-radius: 99px; font-size: 14px; font-weight: 600; text-decoration: none;">${cta.label}</a>` : ''}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #a3a3a3;">
      このメールは FanUp から自動送信されています。
    </div>
  </div>`
}

// クリエイター承認通知
export async function sendCreatorApprovedEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: '【FanUp】クリエイター申請が承認されました 🎉',
    html: layout(
      `${name} さん、承認されました！`,
      'クリエイター申請が承認されました。さっそくプロジェクトを作成して、ファンからの応援を募りましょう。',
      { label: 'プロジェクトを作成する', href: `${appUrl}/creator/projects/new` }
    ),
  })
}

// クリエイター却下通知
export async function sendCreatorRejectedEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: '【FanUp】クリエイター申請の審査結果について',
    html: layout(
      `${name} さん、審査結果のお知らせ`,
      '今回はクリエイター申請を承認することができませんでした。内容を見直して、改めてご申請いただけます。ご不明な点はサポートまでお問い合わせください。',
      { label: 'もう一度申請する', href: `${appUrl}/creator/apply` }
    ),
  })
}

// 支援受領通知（クリエイター向け）— 金額・支援者名・プロジェクト名を含む
export async function sendDonationReceivedEmail(
  to: string,
  args: { creatorName: string; supporterName: string; projectTitle: string; points: number }
): Promise<boolean> {
  const { creatorName, supporterName, projectTitle, points } = args
  return sendEmail({
    to,
    subject: '【FanUp】新しい応援が届きました 🎉',
    html: layout(
      `${creatorName} さんに応援が届きました`,
      `<strong>${supporterName}</strong> さんが、あなたのプロジェクト「${projectTitle}」を <strong>${points.toLocaleString()} pt</strong> で応援しました！<br /><br />ダッシュボードから支援者の一覧と進捗を確認できます。`,
      { label: 'ダッシュボードを見る', href: `${appUrl}/creator` }
    ),
  })
}

// プロジェクト達成通知（クリエイター向け）
export async function sendProjectSucceededEmail(to: string, projectTitle: string, raised: number): Promise<boolean> {
  return sendEmail({
    to,
    subject: '【FanUp】プロジェクトが目標を達成しました 🎉',
    html: layout(
      'おめでとうございます！目標達成です',
      `あなたのプロジェクト「${projectTitle}」が目標を達成しました。集まった応援は <strong>${raised.toLocaleString()} pt</strong> です。ダッシュボードから詳細をご確認ください。`,
      { label: 'ダッシュボードを見る', href: `${appUrl}/creator` }
    ),
  })
}

// プロジェクト未達・返還通知（サポーター向け）
export async function sendRefundEmail(to: string, projectTitle: string, points: number): Promise<boolean> {
  return sendEmail({
    to,
    subject: '【FanUp】応援ポイントを返還しました',
    html: layout(
      'ポイントを返還しました',
      `プロジェクト「${projectTitle}」は期限内に目標を達成できなかったため、応援いただいた <strong>${points.toLocaleString()} pt</strong> を残高に返還しました。`,
      { label: 'マイページを見る', href: `${appUrl}/mypage` }
    ),
  })
}
