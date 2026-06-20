'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  projectId: number | string
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
  const [error, setError] = useState('')

  const pts = parseInt(amount) || 0
  const insufficientBalance = pts > 0 && pts > balance

  const handleDonate = async () => {
    if (pts < 100 || pts > balance) return
    setLoading(true)
    setError('')

    try {
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
        setError(data.error || 'エラーが発生しました')
      }
    } catch {
      setError('ネットワークエラーが発生しました')
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
        <span style={{ color: 'var(--primary)' }}>{raised.toLocaleString()}</span> pt
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
        目標 <strong>{goal.toLocaleString()} pt</strong>
      </div>

      {/* プログレスバー */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '6px' }}>{pct}% 達成</div>
      <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: 'linear-gradient(90deg, #7C3AED, #a78bfa)',
          borderRadius: '99px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* スタッツ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0' }}>
        <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>{supporters}名</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>サポーター</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>残{days}日</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>終了まで</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '16px' }} />
      <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>ポイントを投げる</div>

      {/* プリセットボタン */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {presets.map(v => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            style={{
              background: pts === v ? 'var(--primary-light)' : 'var(--bg3)',
              border: `1.5px solid ${pts === v ? 'var(--primary-border)' : 'var(--border)'}`,
              color: pts === v ? 'var(--primary)' : 'var(--muted)',
              padding: '6px 14px',
              borderRadius: '99px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: pts === v ? '700' : '400',
              transition: 'all 0.15s ease',
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
        onChange={e => { setAmount(e.target.value); setError('') }}
        min="100"
        style={{
          width: '100%',
          background: 'var(--bg3)',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          padding: '11px 14px',
          fontSize: '14px',
          color: 'var(--text)',
          outline: 'none',
          marginBottom: '8px',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
        <span>現在の残高</span>
        <strong style={{ color: 'var(--primary)' }}>{balance.toLocaleString()} pt</strong>
      </div>

      {/* 残高不足の案内 */}
      {insufficientBalance && user && (
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid var(--primary-border)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '12px',
          color: 'var(--primary)',
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          残高が不足しています。
          <Link
            href="/buy-points"
            style={{
              color: 'var(--primary)',
              fontWeight: '700',
              textDecoration: 'underline',
              marginLeft: '4px',
            }}
          >
            ポイントを購入 &rarr;
          </Link>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          color: '#DC2626',
          textAlign: 'center',
          marginBottom: '10px',
        }}>
          {error}
        </div>
      )}

      {/* 成功メッセージ */}
      {done && (
        <div style={{
          background: 'var(--teal-bg)',
          border: '1px solid var(--teal)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          color: 'var(--teal)',
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
