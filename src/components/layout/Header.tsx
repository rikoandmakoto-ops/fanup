'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('profiles')
          .select('point_balance')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setBalance(profile.point_balance)
          })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #e5e5e5',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* ロゴ */}
        <Link href="/" style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#7C3AED',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          letterSpacing: '-0.5px',
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#7C3AED"/>
            <path d="M14 20C14 20 8 16 8 11.8A3 3 0 0 1 14 10.5 3 3 0 0 1 20 11.8C20 16 14 20 14 20z" fill="white"/>
          </svg>
          FanUp
        </Link>

        {/* ナビリンク（デスクトップ） */}
        <div className="nav-desktop" style={{ alignItems: 'center', gap: '24px' }}>
          <Link href="/projects" style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#525252',
            textDecoration: 'none',
          }}>
            クリエイター
          </Link>
          <Link href="/projects" style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#525252',
            textDecoration: 'none',
          }}>
            プロジェクト
          </Link>
        </div>

        {/* 右側ボタン（デスクトップ） */}
        <div className="nav-desktop" style={{ alignItems: 'center', gap: '10px' }}>
          {user ? (
            <>
              {/* 残高バッジ */}
              <div style={{
                fontSize: '13px',
                color: '#525252',
                background: '#f5f5f5',
                border: '1px solid #e5e5e5',
                padding: '6px 14px',
                borderRadius: '99px',
              }}>
                <strong style={{ color: '#7C3AED' }}>{balance.toLocaleString()}</strong> pt
              </div>
              {/* ポイント購入 */}
              <Link href="/buy-points" style={{
                background: '#7C3AED',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '600',
              }}>
                ポイント購入
              </Link>
              {/* クリエイター */}
              <Link href="/creator" style={{
                background: '#f5f5f5',
                color: '#1a1a1a',
                border: '1px solid #e5e5e5',
                padding: '8px 18px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                ダッシュボード
              </Link>
              {/* マイページ */}
              <Link href="/mypage" style={{
                background: '#f5f5f5',
                color: '#1a1a1a',
                border: '1px solid #e5e5e5',
                padding: '8px 18px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                マイページ
              </Link>
              {/* ログアウト */}
              <button onClick={handleLogout} style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#737373',
                cursor: 'pointer',
                padding: '8px',
              }}>
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{
                background: '#fff',
                color: '#1a1a1a',
                border: '1.5px solid #e5e5e5',
                padding: '8px 22px',
                borderRadius: '99px',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                ログイン
              </Link>
              <Link href="/signup" style={{
                background: '#7C3AED',
                color: '#fff',
                padding: '8px 22px',
                borderRadius: '99px',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: '600',
              }}>
                無料登録
              </Link>
            </>
          )}
        </div>

        {/* ハンバーガー（モバイル） */}
        <button
          className="nav-hamburger"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* モバイルメニューパネル */}
      <div
        className={`nav-mobile-panel ${menuOpen ? 'open' : ''}`}
        style={{
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 20px 20px',
          borderTop: '1px solid #e5e5e5',
        }}
      >
        {user && (
          <div style={{
            fontSize: '14px',
            color: '#525252',
            background: '#f5f5f5',
            border: '1px solid #e5e5e5',
            padding: '12px 16px',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            残高 <strong style={{ color: '#7C3AED' }}>{balance.toLocaleString()}</strong> pt
          </div>
        )}

        <Link href="/projects" onClick={closeMenu} style={mobileLinkStyle}>クリエイター</Link>
        <Link href="/projects" onClick={closeMenu} style={mobileLinkStyle}>プロジェクト</Link>

        {user ? (
          <>
            <Link href="/buy-points" onClick={closeMenu} style={{ ...mobileLinkStyle, background: '#7C3AED', color: '#fff', fontWeight: 600 }}>ポイント購入</Link>
            <Link href="/creator" onClick={closeMenu} style={mobileLinkStyle}>ダッシュボード</Link>
            <Link href="/mypage" onClick={closeMenu} style={mobileLinkStyle}>マイページ</Link>
            <button onClick={() => { closeMenu(); handleLogout() }} style={{ ...mobileLinkStyle, background: 'none', border: '1px solid #e5e5e5', color: '#737373', cursor: 'pointer' }}>
              ログアウト
            </button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={closeMenu} style={mobileLinkStyle}>ログイン</Link>
            <Link href="/signup" onClick={closeMenu} style={{ ...mobileLinkStyle, background: '#7C3AED', color: '#fff', fontWeight: 600 }}>無料登録</Link>
          </>
        )}
      </div>
    </nav>
  )
}

const mobileLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '46px',
  padding: '12px 16px',
  borderRadius: '12px',
  background: '#f5f5f5',
  border: '1px solid #e5e5e5',
  color: '#1a1a1a',
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
}
