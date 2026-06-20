'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'

export default function CancelPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        {/* キャンセルアイコン */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M10 10l12 12M22 10L10 22" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
          購入がキャンセルされました
        </div>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginBottom: '32px' }}>
          決済は行われていません。<br />
          もう一度お試しいただくか、別のプランをお選びください。
        </p>
        <Link href="/buy-points" className="btn-primary" style={{ maxWidth: '240px', margin: '0 auto', borderRadius: '99px' }}>
          ポイント購入に戻る
        </Link>
      </main>
    </>
  )
}
