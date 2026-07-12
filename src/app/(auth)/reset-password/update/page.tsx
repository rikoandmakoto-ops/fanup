'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  // リカバリーセッションの状態: null=判定中, true=有効, false=無効/期限切れ
  const [ready, setReady] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // メールリンクから来た場合、ブラウザクライアントが URL を処理してセッションを確立する。
    // PASSWORD_RECOVERY イベント、または既存セッションのどちらかで再設定を許可する。
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
      }
    })

    // 既にセッション確立済み（イベント発火後）のケースも拾う
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        // URL 処理は非同期なので、少し待ってからセッションが無ければ無効扱いにする
        setTimeout(() => {
          setReady(prev => (prev === null ? false : prev))
        }, 1500)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const handleUpdate = async () => {
    setError('')
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。')
      return
    }
    setDone(true)
    // 再設定後はサインアウトして、新しいパスワードでログインしてもらう
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2000)
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
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '16px' }}>新しいパスワードの設定</div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          {ready === null ? (
            <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
              確認中...
            </div>
          ) : ready === false ? (
            <>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px', lineHeight: 1.6 }}>
                リンクが無効か、有効期限が切れています。<br />
                お手数ですが、もう一度リセットメールを送信してください。
              </div>
              <Link href="/reset-password" style={{ display: 'block', textAlign: 'center', background: 'var(--pink)', color: '#fff', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                リセットメールを再送
              </Link>
            </>
          ) : done ? (
            <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: '8px', padding: '14px', fontSize: '13px', color: 'var(--teal)', fontWeight: '600', textAlign: 'center', lineHeight: 1.6 }}>
              パスワードを更新しました。<br />
              新しいパスワードでログインしてください。
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>新しいパスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--muted)', marginBottom: '5px' }}>新しいパスワード（確認）</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdate() }}
                  placeholder="もう一度入力"
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={loading}
                style={{ width: '100%', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '更新中...' : 'パスワードを更新'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
