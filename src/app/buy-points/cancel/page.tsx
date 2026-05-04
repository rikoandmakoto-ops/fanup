'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'

export default function CancelPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😢</div>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>購入がキャンセルされました</div>
        <p style={{ fontSize: '14px', color: '#7a7770', lineHeight: '1.8', marginBottom: '32px' }}>
          決済は行われていません。<br />
          もう一度お試しいただくか、別のプランをお選びください。
        </p>
        <Link href="/buy-points" style={{
          background: '#d94f68',
          color: '#fff',
          padding: '12px 28px',
          borderRadius: '99px',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
        }}>
          ポイント購入に戻る
        </Link>
      </main>
    </>
  )
}
