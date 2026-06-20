'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
      {/* 成功アイコン */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: 'var(--primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 16l6 6 10-12" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
        購入が完了しました
      </div>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginBottom: '32px' }}>
        ポイントが残高に反映されました。<br />
        さっそくお気に入りのクリエイターを応援しましょう。
      </p>

      {sessionId && (
        <div style={{
          fontSize: '11px',
          color: 'var(--muted)',
          marginBottom: '24px',
          background: 'var(--bg3)',
          padding: '8px 14px',
          borderRadius: '8px',
          display: 'inline-block',
        }}>
          セッションID: {sessionId.slice(0, 20)}...
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <Link href="/projects" className="btn-primary" style={{ maxWidth: '200px', borderRadius: '99px' }}>
          プロジェクトを探す
        </Link>
        <Link href="/buy-points" style={{
          background: 'var(--bg3)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          padding: '12px 28px',
          borderRadius: '99px',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
        }}>
          追加購入
        </Link>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>読み込み中...</div>
        </main>
      }>
        <SuccessContent />
      </Suspense>
    </>
  )
}
