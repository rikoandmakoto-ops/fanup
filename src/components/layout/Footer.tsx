import Link from 'next/link'

// サイト共通フッター。利用規約・プライバシーポリシーなどへの導線を提供する。
export default function Footer() {
  const linkStyle = {
    fontSize: '13px',
    color: '#737373',
    textDecoration: 'none',
  } as const

  return (
    <footer style={{ borderTop: '1px solid #e5e5e5', background: '#fff', marginTop: 'auto' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* ロゴ + コピーライト */}
        <div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#7C3AED',
            letterSpacing: '-0.5px',
            marginBottom: '6px',
          }}>
            FanUp
          </div>
          <div style={{ fontSize: '12px', color: '#a3a3a3' }}>
            © {2026} FanUp. All rights reserved.
          </div>
        </div>

        {/* リンク群 */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <Link href="/projects" style={linkStyle}>プロジェクト</Link>
          <Link href="/creators" style={linkStyle}>クリエイター</Link>
          <Link href="/terms" style={linkStyle}>利用規約</Link>
          <Link href="/privacy" style={linkStyle}>プライバシーポリシー</Link>
        </nav>
      </div>
    </footer>
  )
}
