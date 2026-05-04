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

export default function DonateCard({ projectId, user, balance: initialBalance, raised, goal, pct, supporters, days, color }: Props) {
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
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '22px',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      position: 'sticky',
      top: '72px',
    }}>
      <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '2px' }}>
        <span style={{ color }}>{raised.toLocaleString()}</span> pt
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
        目標 <strong>{goal.toLocaleString()} pt</strong>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '700', color, marginBottom: '6px' }}>{pct}% 達成</div>
      <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '99px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0' }}>
        <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '17px', fontWeight: '700' }}>{supporters}名</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>サポーター</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '17px', fontWeight: '700' }}>残{days}日</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>終了まで</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '14px' }} />
      <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>ポイントを投げる</div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {presets.map(v => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            style={{
              background: pts === v ? 'var(--pink-bg)' : 'var(--bg3)',
              border: `1px solid ${pts === v ? 'var(--pink-border)' : 'var(--border)'}`,
              color: pts === v ? 'var(--pink)' : 'var(--muted)',
              padding: '5px 12px',
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

      <input
        type="number"
        placeholder="ポイント数を入力（最小100）"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        min="100"
        style={{
          width: '100%',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '14px',
          color: 'var(--text)',
          outline: 'none',
          marginBottom: '8px',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
        <span>現在の残高</span>
        <strong style={{ color: 'var(--pink)' }}>{balance.toLocaleString()} pt</strong>
      </div>

      {done && (
        <div style={{
          background: 'var(--teal-bg)',
          border: '1px solid var(--teal)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          color: 'var(--teal)',
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: '10px',
        }}>
          応援しました！ありがとうございます 🎉
        </div>
      )}

      {user ? (
        <button
          onClick={handleDonate}
          disabled={loading || pts < 100 || pts > balance}
          style={{
            display: 'block',
            width: '100%',
            background: 'var(--pink)',
            color: '#fff',
            textAlign: 'center',
            padding: '12px',
            borderRadius: '99px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: pts < 100 || pts > balance ? 'not-allowed' : 'pointer',
            opacity: loading || pts < 100 || pts > balance ? 0.6 : 1,
          }}
        >
          {loading ? '処理中...' : '応援する'}
        </button>
      ) : (
        <Link href="/login" style={{
          display: 'block',
          background: 'var(--pink)',
          color: '#fff',
          textAlign: 'center',
          padding: '12px',
          borderRadius: '99px',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
        }}>
          ログインして応援する
        </Link>
      )}
    </div>
  )
}
