'use client'

import Header from '@/components/layout/Header'
import Link from 'next/link'

export default function SuccessPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>購入が完了しました！</div>
        <p style={{ fontSize: '14px', color: '#7a7770', lineHeight: '1.8', marginBottom: '32px' }}>
          ポイントが残高に反映されました。<br />
          さっそくお気に入りのクリエイターを応援しましょう。
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/projects" style={{
            background: '#d94f68',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: '99px',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
          }}>
            プロジェクトを探す
          </Link>
          <Link href="/buy-points" style={{
            background: '#f4f3f0',
            color: '#1a1916',
            border: '1px solid #e8e6e1',
            padding: '12px 28px',
            borderRadius: '99px',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
          }}>
            追加購入
          </Link>
        </div>
      </main>
    </>
  )
}
