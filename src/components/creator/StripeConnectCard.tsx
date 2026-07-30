'use client'

import { useState } from 'react'

export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

type Props = {
  status: ConnectStatus
  disabledReason?: string | null
  /** 送金待ちの金額（円）。0 なら表示しない */
  pendingAmount?: number
}

// ステータスごとの見た目と文言。Stripe 側の状態は creators に同期済みの値を使う。
const VIEW: Record<ConnectStatus, {
  badge: string
  color: string
  bg: string
  border: string
  description: string
  cta: string
}> = {
  none: {
    badge: '未連携',
    color: '#737373',
    bg: '#f5f5f5',
    border: '#e5e5e5',
    description:
      'プロジェクトが目標を達成すると、集まった支援金から手数料を差し引いた金額をお振り込みします。受け取りには Stripe の口座連携が必要です。',
    cta: 'Stripe で受取口座を連携する',
  },
  pending: {
    badge: '審査中',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
    description:
      'Stripe による本人確認が完了していません。手続きを最後まで進めると、達成した売上を自動でお振り込みできるようになります。',
    cta: '登録手続きを続ける',
  },
  active: {
    badge: '有効',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    description:
      '受取口座の連携が完了しています。プロジェクトが目標を達成すると、手数料を差し引いた金額を自動でお振り込みします。',
    cta: 'Stripe ダッシュボードを開く',
  },
  restricted: {
    badge: '要対応',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    description:
      'Stripe から追加情報の提出を求められています。対応が完了するまで振込を保留します。',
    cta: '登録情報を更新する',
  },
}

// クリエイターダッシュボードの Stripe Connect 連携カード。
export default function StripeConnectCard({ status, disabledReason, pendingAmount = 0 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const view = VIEW[status]

  const start = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/connect/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 連携済みなら Express ダッシュボード、それ以外はオンボーディングへ
        body: JSON.stringify({ mode: status === 'active' ? 'dashboard' : 'onboarding' }),
      })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Stripe 連携の開始に失敗しました')
        setLoading(false)
        return
      }

      // Stripe のホスト型オンボーディング / ダッシュボードへ遷移
      window.location.href = data.url
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: '22px 24px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>売上の受け取り</div>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: view.color,
          background: view.bg,
          border: `1px solid ${view.border}`,
          padding: '3px 12px',
          borderRadius: '99px',
          whiteSpace: 'nowrap',
        }}>
          {view.badge}
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#737373', lineHeight: '1.8', margin: '0 0 4px' }}>
        {view.description}
      </p>

      {status === 'restricted' && disabledReason && (
        <p style={{ fontSize: '12px', color: '#DC2626', margin: '0 0 4px' }}>
          Stripe からの通知: {disabledReason}
        </p>
      )}

      {pendingAmount > 0 && (
        <p style={{ fontSize: '13px', color: '#D97706', fontWeight: '600', margin: '8px 0 0' }}>
          振込待ちの売上が ¥{pendingAmount.toLocaleString()} あります。連携が完了すると自動でお振り込みします。
        </p>
      )}

      {error && (
        <p style={{ fontSize: '13px', color: '#DC2626', margin: '10px 0 0' }}>{error}</p>
      )}

      <button
        onClick={start}
        disabled={loading}
        className="btn-primary"
        style={{
          marginTop: '16px',
          width: 'auto',
          padding: '11px 22px',
          fontSize: '14px',
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? '準備中…' : view.cta}
      </button>
    </div>
  )
}
