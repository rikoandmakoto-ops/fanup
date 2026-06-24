'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  creatorId: string
  isLoggedIn: boolean
  initialFollowing: boolean
}

// クリエイタープロフィールのフォロー / フォロー中トグルボタン
export default function FollowButton({ creatorId, isLoggedIn, initialFollowing }: Props) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  // 未ログインならログインページへ誘導
  if (!isLoggedIn) {
    return (
      <button className="btn-outline" onClick={() => router.push('/login')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1v14M1 8h14" />
        </svg>
        フォロー
      </button>
    )
  }

  const toggle = async () => {
    setLoading(true)
    const next = !following
    // 楽観的更新
    setFollowing(next)

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId, action: next ? 'follow' : 'unfollow' }),
      })
      const data = await res.json()
      if (!data.success) {
        // 失敗したら元に戻す
        setFollowing(!next)
      } else {
        // フォロワー数の表示を更新するためにサーバーコンポーネントを再取得
        router.refresh()
      }
    } catch {
      setFollowing(!next)
    }
    setLoading(false)
  }

  return (
    <button
      className="btn-outline"
      onClick={toggle}
      disabled={loading}
      style={following ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : undefined}
    >
      {following ? (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8.5L6.5 12L13 4" />
          </svg>
          フォロー中
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1v14M1 8h14" />
          </svg>
          フォロー
        </>
      )}
    </button>
  )
}
