'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)

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

  return (
    <nav style={{
      background: 'rgba(250,250,249,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e8e6e1',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 20px',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: '#1a1916',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: '#d94f68',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M6 10.5C6 10.5 1 7 1 3.8A2.5 2.5 0 0 1 6 2.7 2.5 2.5 0 0 1 11 3.8C11 7 6 10.5 6 10.5z"/>
            </svg>
          </div>
          FanUp
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <>
              <div style={{
                fontSize: '13px',
                color: '#7a7770',
                background: '#f4f3f0',
                border: '1px solid #e8e6e1',
                padding: '5px 12px',
                borderRadius: '99px',
              }}>
                残高 <strong style={{ color: '#d94f68' }}>{balance.toLocaleString()}</strong> pt
              </div>
              <Link href="/buy-points" style={{
                background: '#d94f68',
                color: '#fff',
                padding: '7px 16px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                ポイント購入
              </Link>
              <Link href="/creator" style={{
                background: '#f4f3f0',
                color: '#1a1916',
                border: '1px solid #e8e6e1',
                padding: '7px 16px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                クリエイター
              </Link>
              <Link href="/mypage" style={{
                background: '#f4f3f0',
                color: '#1a1916',
                border: '1px solid #e8e6e1',
                padding: '7px 16px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                マイページ
              </Link>
              <button onClick={handleLogout} style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#7a7770',
                cursor: 'pointer',
                padding: '7px 12px',
              }}>
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{
                background: '#f4f3f0',
                color: '#1a1916',
                border: '1px solid #e8e6e1',
                padding: '7px 16px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                ログイン
              </Link>
              <Link href="/signup" style={{
                background: '#d94f68',
                color: '#fff',
                padding: '7px 16px',
                borderRadius: '99px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500',
              }}>
                無料登録
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}