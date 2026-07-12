'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password/update`,
    })
    setLoading(false)
    if (error) {
      setError('メールの送信に失敗しました。時間をおいて再度お試しください。')
      return
    }
    // メールアドレスの存在有無を漏らさないよう、常に成功表示にする
    setSent(true)
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
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '16px' }}>パスワードの再設定</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            登録済みのメールアドレスにリセット用リンクを送信します
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          {sent ? (
            <>
              <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: '8px', padding: '14px', fontSize: '13px', color: 'var(--teal)', fontWeight: '600', marginBottom: '16px', lineHeight: 1.6 }}>
                <strong>{email}</strong> 宛にリセット用のメールを送信しました。<br />
                メール内のリンクから新しいパスワードを設定してください。
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                メールが届かない場合は迷惑メールフォルダもご確認ください。
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                  placeholder="your@email.com"
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={loading}
                style={{ width: '100%', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '送信中...' : 'リセットメールを送信'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
          <Link href="/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← ログインに戻る</Link>
        </div>

      </div>
    </div>
  )
}
