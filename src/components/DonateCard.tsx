'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  projectId: number
  user: { id: string } | null
  balance: number
  raised: number
  goal: number
  pct: number
  supporters: number
  days: number
  color: string
}

const presets = [500, 1000, 3000, 5000]

export default function DonateCard({ projectId, user, balance: initialBalance, raised, goal, pct, supporters, days }: Props) {
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState(initialBalance)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const pts = parseInt(amount) || 0

  const handleDonate = async () => {
    if (pts < 100 || pts > balance) return
    setLoading(true)

    const res = await fetch('/api/donate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, points: pts }),
    })

    const data = await res.json()
    if (data.success) {
      setBalance(data.new_balance)
      setAmount('')
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } else {
      alert(data.error || 'エラーが発生しました')
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{
      padding: '24px',
      position: 'sticky',
      top: '80px',
    }}>
      {/* 達成額 */}
      <div style={{ fontSize: '30px', fontWeight: '700', marginBottom: '2px' }}>
        <span style={{ color: '#7C3AED' }}>{raised.toLocaleString()}</span> pt
      </div>
      <div style={{ fontSize: '12px', color: '#737373', marginBottom: '12px' }}>
        目標 <strong>{goal.toLocaleString()} pt</strong>
      </div>

      {/* プログレスバー */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#7C3AED', marginBottom: '6px' }}>{pct}% 達成</div>
      <div style={{ height: '8px', background: '#f5f5f5', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: 'linear-gradient(90deg, #7C3AED, #a78bfa)',
          borderRadius: '99px',
        }} />
      </div>

      {/* スタッツ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0' }}>
        <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>{supporters}名</div>
          <div style={{ fontSize: '11px', color: '#737373', marginTop: '2px' }}>サポーター</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>残{days}日</div>
          <div style={{ fontSize: '11px', color: '#737373', marginTop: '2px' }}>終了まで</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', marginBottom: '16px' }} />
      <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>ポイントを投げる</div>

      {/* プリセットボタン */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {presets.map(v => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            style={{
              background: pts === v ? '#EDE9FE' : '#f5f5f5',
              border: `1.5px solid ${pts === v ? '#C4B5FD' : '#e5e5e5'}`,
              color: pts === v ? '#7C3AED' : '#737373',
              padding: '6px 14px',
              borderRadius: '99px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: pts === v ? '700' : '400',
            }}
          >
            {v.toLocaleString()}
          </button>
        ))}
      </div>

      {/* 入力フィールド */}
      <input
        type="number"
        placeholder="ポイント数を入力（最小100）"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        min="100"
        style={{
          width: '100%',
          background: '#f5f5f5',
          border: '1.5px solid #e5e5e5',
          borderRadius: '10px',
          padding: '11px 14px',
          fontSize: '14px',
          color: '#1a1a1a',
          outline: 'none',
          marginBottom: '8px',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '14px' }}>
        <span>現在の残高</span>
        <strong style={{ color: '#7C3AED' }}>{balance.toLocaleString()} pt</strong>
      </div>

      {/* 成功メッセージ */}
      {done && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #059669',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          color: '#059669',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: '10px',
        }}>
          応援しました！ありがとうございます
        </div>
      )}

      {/* CTAボタン */}
      {user ? (
        <button
          onClick={handleDonate}
          disabled={loading || pts < 100 || pts > balance}
          className="btn-primary"
          style={{
            opacity: loading || pts < 100 || pts > balance ? 0.5 : 1,
            cursor: pts < 100 || pts > balance ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '処理中...' : '応援する'}
        </button>
      ) : (
        <Link href="/login" className="btn-primary">
          ログインして応援する
        </Link>
      )}
    </div>
  )
}
