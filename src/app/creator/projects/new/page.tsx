'use client'

import Header from '@/components/layout/Header'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 募集期間のプリセット
const dayPresets = [7, 14, 30, 60]

export default function NewProjectPage() {
  const router = useRouter()
  // フォーム状態
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalPoints, setGoalPoints] = useState('100000')
  const [days, setDays] = useState(30)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 送信
  const handleSubmit = async () => {
    setError('')

    // クライアント側の簡易チェック
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!description.trim()) return setError('説明文を入力してください')
    const goalNum = parseInt(goalPoints)
    if (!goalNum || goalNum < 1000) return setError('目標ポイントは1,000以上で指定してください')

    setLoading(true)
    const res = await fetch('/api/creator/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        goal_points: goalNum,
        deadline_days: days,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? '作成に失敗しました')
      return
    }

    // 成功 → 作成したプロジェクト詳細へ
    router.push(`/projects/${data.project_id}`)
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', marginBottom: '20px', padding: '0' }}>
          ← 戻る
        </button>

        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>新規プロジェクト</div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          目標ポイントと募集期間を設定し、ファンの応援を集めましょう。
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
          {/* タイトル */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              タイトル <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例：弾き語りチャンネルを開設したい"
              maxLength={80}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginTop: '4px' }}>{title.length} / 80</div>
          </div>

          {/* 説明文 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              プロジェクトの説明 <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="何を実現したいか、どんな活動を予定しているかなどを書きましょう。"
              maxLength={4000}
              rows={8}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginTop: '4px' }}>{description.length} / 4000</div>
          </div>

          {/* 目標ポイント */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              目標ポイント <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <input
              type="number"
              value={goalPoints}
              onChange={e => setGoalPoints(e.target.value)}
              min="1000"
              max="10000000"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>1pt = ¥1。プラットフォーム手数料 30%。</div>
          </div>

          {/* 募集期間 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '8px' }}>
              募集期間 <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {dayPresets.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  style={{
                    background: days === d ? 'var(--pink-bg)' : 'var(--bg3)',
                    border: `1px solid ${days === d ? 'var(--pink-border)' : 'var(--border)'}`,
                    color: days === d ? 'var(--pink)' : 'var(--muted)',
                    padding: '8px 16px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: days === d ? '700' : '400',
                  }}
                >
                  {d}日
                </button>
              ))}
            </div>
          </div>

          {/* All-or-Nothing 注意書き */}
          <div style={{ background: 'var(--amber-bg)', border: '1px solid #fad898', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--amber)', marginBottom: '4px' }}>All-or-Nothing方式</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
              期限内に目標未達の場合、サポーターへ全額返還されます。達成時はプラットフォーム手数料を差し引いた金額が支払われます。
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '作成中...' : 'プロジェクトを公開する'}
          </button>
        </div>
      </main>
    </>
  )
}
