'use client'

import Header from '@/components/layout/Header'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const plans = [
  { pt: 500, yen: 500 },
  { pt: 1000, yen: 1000 },
  { pt: 3000, yen: 3000 },
  { pt: 5000, yen: 5000 },
  { pt: 10000, yen: 10000 },
]

export default function BuyPointsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState(3000)
  const [custom, setCustom] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedPt = isCustom ? parseInt(custom) || 0 : selected

  const handleCheckout = async () => {
    if (selectedPt < 500) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: selectedPt }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'エラーが発生しました')
        setLoading(false)
      }
    } catch {
      setError('ネットワークエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '540px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '13px',
            color: 'var(--muted)',
            cursor: 'pointer',
            marginBottom: '24px',
            padding: '0',
          }}
        >
          &larr; 戻る
        </button>

        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
          ポイントを購入
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px' }}>
          1pt = &yen;1。購入後すぐに残高に反映されます。
        </div>

        <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '8px' }}>
          プランを選択
        </div>
        <div className="buy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
          {plans.map(p => (
            <div
              key={p.pt}
              onClick={() => { setSelected(p.pt); setIsCustom(false) }}
              style={{
                background: !isCustom && selected === p.pt ? 'var(--primary-light)' : 'var(--bg2)',
                border: `2px solid ${!isCustom && selected === p.pt ? 'var(--primary-border)' : 'var(--border)'}`,
                borderRadius: '14px',
                padding: '16px 10px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: !isCustom && selected === p.pt ? 'var(--primary)' : 'var(--text)',
              }}>
                {p.pt.toLocaleString()} pt
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                &yen;{p.yen.toLocaleString()}
              </div>
            </div>
          ))}
          <div
            onClick={() => setIsCustom(true)}
            style={{
              background: isCustom ? 'var(--primary-light)' : 'var(--bg2)',
              border: `2px solid ${isCustom ? 'var(--primary-border)' : 'var(--border)'}`,
              borderRadius: '14px',
              padding: '16px 10px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: isCustom ? 'var(--primary)' : 'var(--text)',
            }}>
              自由入力
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>任意</div>
          </div>
        </div>

        {isCustom && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              ポイント数（最小500）
            </label>
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="例：2500"
              min="500"
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
        )}

        <div style={{
          background: 'var(--bg3)',
          borderRadius: '14px',
          padding: '16px 18px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            padding: '5px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--muted)' }}>選択ポイント</span>
            <span>{selectedPt > 0 ? `${selectedPt.toLocaleString()} pt` : '—'}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            padding: '5px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--muted)' }}>お支払い金額</span>
            <span>{selectedPt > 0 ? `¥${selectedPt.toLocaleString()}` : '—'}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '15px',
            fontWeight: '700',
            padding: '10px 0 5px',
          }}>
            <span>合計</span>
            <span style={{ color: 'var(--primary)' }}>
              {selectedPt > 0 ? `¥${selectedPt.toLocaleString()}` : '—'}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#DC2626',
            marginBottom: '14px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || selectedPt < 500}
          className="btn-primary"
          style={{
            borderRadius: '99px',
            opacity: loading || selectedPt < 500 ? 0.5 : 1,
            cursor: selectedPt < 500 ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '処理中...' : 'Stripeで支払う →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="#737373" strokeWidth="1.2"/>
            <path d="M4 7h6M7 5v4" stroke="#737373" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            SSL暗号化・Stripeによる安全な決済
          </span>
        </div>
      </main>
    </>
  )
}
