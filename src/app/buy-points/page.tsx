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

  const selectedPt = isCustom ? parseInt(custom) || 0 : selected

  const handleCheckout = async () => {
    if (selectedPt < 500) return
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: selectedPt }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '540px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#7a7770', cursor: 'pointer', marginBottom: '24px', padding: '0' }}>
          ← 戻る
        </button>

        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>ポイントを購入</div>
        <div style={{ fontSize: '14px', color: '#7a7770', marginBottom: '28px' }}>1pt = ¥1。購入後すぐに残高に反映されます。</div>

        <div style={{ fontSize: '12px', fontWeight: '500', color: '#7a7770', marginBottom: '8px' }}>プランを選択</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
          {plans.map(p => (
            <div
              key={p.pt}
              onClick={() => { setSelected(p.pt); setIsCustom(false) }}
              style={{
                background: !isCustom && selected === p.pt ? '#fdf0f2' : '#fff',
                border: `2px solid ${!isCustom && selected === p.pt ? '#d94f68' : '#e8e6e1'}`,
                borderRadius: '14px',
                padding: '16px 10px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '700', color: !isCustom && selected === p.pt ? '#d94f68' : '#1a1916' }}>{p.pt.toLocaleString()} pt</div>
              <div style={{ fontSize: '12px', color: '#7a7770', marginTop: '2px' }}>¥{p.yen.toLocaleString()}</div>
            </div>
          ))}
          <div
            onClick={() => setIsCustom(true)}
            style={{
              background: isCustom ? '#fdf0f2' : '#fff',
              border: `2px solid ${isCustom ? '#d94f68' : '#e8e6e1'}`,
              borderRadius: '14px',
              padding: '16px 10px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '700', color: isCustom ? '#d94f68' : '#1a1916' }}>自由入力</div>
            <div style={{ fontSize: '12px', color: '#7a7770', marginTop: '2px' }}>任意</div>
          </div>
        </div>

        {isCustom && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#7a7770', marginBottom: '5px' }}>ポイント数（最小500）</label>
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="例：2500"
              min="500"
              style={{ width: '100%', background: '#f4f3f0', border: '1px solid #e8e6e1', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#1a1916', outline: 'none' }}
            />
          </div>
        )}

        <div style={{ background: '#f4f3f0', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #e8e6e1' }}>
            <span style={{ color: '#7a7770' }}>選択ポイント</span>
            <span>{selectedPt > 0 ? `${selectedPt.toLocaleString()} pt` : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #e8e6e1' }}>
            <span style={{ color: '#7a7770' }}>お支払い金額</span>
            <span>{selectedPt > 0 ? `¥${selectedPt.toLocaleString()}` : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', padding: '10px 0 5px' }}>
            <span>合計</span>
            <span style={{ color: '#d94f68' }}>{selectedPt > 0 ? `¥${selectedPt.toLocaleString()}` : '—'}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || selectedPt < 500}
          style={{
            width: '100%',
            background: '#d94f68',
            color: '#fff',
            border: 'none',
            borderRadius: '99px',
            padding: '13px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: selectedPt < 500 ? 'not-allowed' : 'pointer',
            opacity: loading || selectedPt < 500 ? 0.6 : 1,
          }}
        >
          {loading ? '処理中...' : 'Stripeで支払う →'}
        </button>
        <p style={{ fontSize: '11px', color: '#7a7770', textAlign: 'center', marginTop: '10px' }}>SSL暗号化・Stripeによる安全な決済</p>
      </main>
    </>
  )
}