'use client'

import Header from '@/components/layout/Header'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// カテゴリ候補
const categories = ['音楽', 'ゲーム', 'コスメ', 'ファッション', 'アート', '料理', '旅行', '教育', 'その他']

export default function CreatorApplyPage() {
  const router = useRouter()
  // フォーム状態
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // 申請送信
  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }
    setLoading(true)

    const res = await fetch('/api/creator/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), category, bio: bio.trim() || null }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? '申請に失敗しました')
      return
    }

    // 成功 → 完了画面へ
    setDone(true)
    setTimeout(() => router.push('/creator'), 1800)
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '540px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>クリエイター申請</div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          審査後、プロジェクトを作成できるようになります。
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
          {/* 名前 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              活動名 <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：あかり"
              maxLength={60}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          {/* カテゴリ */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              カテゴリ <span style={{ color: 'var(--pink)' }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 自己紹介 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>
              プロフィール（任意・1000文字まで）
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="どんな活動をしているか、これからチャンネルで何をしたいかなど"
              maxLength={1000}
              rows={6}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginTop: '4px' }}>{bio.length} / 1000</div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {done && (
            <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--teal)', marginBottom: '16px', fontWeight: '600' }}>
              申請しました！審査結果をお待ちください。
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || done}
            style={{ width: '100%', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', cursor: loading || done ? 'not-allowed' : 'pointer', opacity: loading || done ? 0.6 : 1 }}
          >
            {loading ? '送信中...' : done ? '送信完了' : '申請する'}
          </button>
        </div>
      </main>
    </>
  )
}
