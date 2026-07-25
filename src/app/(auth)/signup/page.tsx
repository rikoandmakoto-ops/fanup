'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  // 利用規約・プライバシーポリシーへの同意（登録の必須条件）
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!agreed) {
      setError('利用規約とプライバシーポリシーへの同意が必要です')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: '700' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--pink)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M6 10.5C6 10.5 1 7 1 3.8A2.5 2.5 0 0 1 6 2.7 2.5 2.5 0 0 1 11 3.8C11 7 6 10.5 6 10.5z"/></svg>
            </div>
            FanUp
          </Link>
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '16px' }}>新規登録</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            すでにアカウントをお持ちの方は <Link href="/login" style={{ color: 'var(--pink)' }}>ログイン</Link>
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>表示名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：山﨑 歩希"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>パスワード（8文字以上）</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          {/* 利用規約・プライバシーポリシーへの同意 */}
          <label
            htmlFor="agree-terms"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: '20px', cursor: 'pointer' }}
          >
            <input
              id="agree-terms"
              type="checkbox"
              checked={agreed}
              onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setError('') }}
              style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--pink)', flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', lineHeight: '1.7', color: 'var(--muted)' }}>
              <Link href="/terms" target="_blank" style={{ color: 'var(--pink)' }}>利用規約</Link>
              {' '}と{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'var(--pink)' }}>プライバシーポリシー</Link>
              {' '}に同意します
            </span>
          </label>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading || !agreed}
            style={{ width: '100%', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', cursor: loading || !agreed ? 'not-allowed' : 'pointer', opacity: loading || !agreed ? 0.5 : 1 }}
          >
            {loading ? '処理中...' : '無料で登録する'}
          </button>
        </div>

      </div>
    </div>
  )
}