'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 管理画面のクリエイター審査行で使う承認・却下ボタン
export default function CreatorReviewActions({ creatorId }: { creatorId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')

  const handle = async (action: 'approve' | 'reject') => {
    // 却下は誤操作防止のため確認ダイアログを挟む
    if (action === 'reject' && !window.confirm('この申請を却下しますか？')) return

    setLoading(action)
    setError('')

    try {
      const res = await fetch('/api/admin/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId, action }),
      })
      const data = await res.json()

      if (data.success) {
        // サーバーコンポーネントを再取得して審査リストを更新
        router.refresh()
      } else {
        setError(data.error || 'エラーが発生しました')
        setLoading(null)
      }
    } catch {
      setError('ネットワークエラーが発生しました')
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={() => handle('approve')}
        disabled={loading !== null}
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#fff',
          background: 'var(--teal)',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '99px',
          cursor: loading !== null ? 'not-allowed' : 'pointer',
          opacity: loading !== null ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {loading === 'approve' ? '処理中...' : '承認'}
      </button>
      <button
        onClick={() => handle('reject')}
        disabled={loading !== null}
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--muted)',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          padding: '6px 14px',
          borderRadius: '99px',
          cursor: loading !== null ? 'not-allowed' : 'pointer',
          opacity: loading !== null ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {loading === 'reject' ? '処理中...' : '却下'}
      </button>
      {error && <span style={{ fontSize: '11px', color: '#DC2626' }}>{error}</span>}
    </div>
  )
}
