import Header from '@/components/layout/Header'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>

        <section style={{ padding: '56px 0 48px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--pink)',
            background: 'var(--pink-bg)',
            border: '1px solid var(--pink-border)',
            padding: '4px 14px',
            borderRadius: '99px',
            marginBottom: '20px',
          }}>
            ファンクラブ特化型クラウドファンディング
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 60px)',
            fontWeight: '700',
            lineHeight: '1.1',
            marginBottom: '16px',
          }}>
            推しを<span style={{ color: 'var(--pink)' }}>デビュー</span>させよう。
          </h1>

          <p style={{
            fontSize: '15px',
            color: 'var(--muted)',
            maxWidth: '500px',
            margin: '0 auto 32px',
            lineHeight: '1.8',
          }}>
            ポイントを買って好きなクリエイターに投げる。目標達成でチャンネルが開設される、新しい応援のかたち。
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/projects" style={{
              background: 'var(--pink)',
              color: '#fff',
              padding: '13px 28px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              プロジェクトを探す
            </Link>
            <Link href="/signup" style={{
              background: 'var(--bg3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '13px 28px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              無料で始める
            </Link>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '48px',
            borderTop: '1px solid var(--border)',
            paddingTop: '32px',
          }}>
            {[
              { num: '1,248', label: 'サポーター' },
              { num: '24', label: '進行中プロジェクト' },
              { num: '8', label: '達成チャンネル' },
              { num: '¥0', label: '手数料（サポーター）' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1,
                textAlign: 'center',
                padding: '0 24px',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--pink)' }}>{s.num}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: '60px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>現在募集中</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>注目のプロジェクト</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
            {[
              { emoji: '🎵', bg: 'linear-gradient(135deg,#fde8ef,#fcd0dd)', creator: 'あかり', title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82, color: 'var(--pink)' },
              { emoji: '🎮', bg: 'linear-gradient(135deg,#e8f8f2,#c8f0e4)', creator: 'けんた', title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45, color: 'var(--teal)' },
              { emoji: '💄', bg: 'linear-gradient(135deg,#fef8e8,#faecc8)', creator: 'みき', title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60, color: 'var(--amber)' },
            ].map((p, i) => (
              <Link key={i} href={`/projects/${i + 1}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                }}>
                  <div style={{ height: '160px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px' }}>
                    {p.emoji}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{p.creator}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.5', marginBottom: '12px' }}>{p.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '7px' }}>
                      <span style={{ fontWeight: '700', color: p.color }}>{p.pct}%</span>
                      <span>100,000 pt 目標</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: '99px' }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}