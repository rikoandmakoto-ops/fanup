import Header from '@/components/layout/Header'
import Link from 'next/link'

// 規約系ページ（利用規約・プライバシーポリシー）の共通レイアウト。
// body の要素が string ならそのまま段落、string[] なら箇条書きとして描画する。
export type LegalBlock = string | string[]
export type LegalSection = { heading: string; body: LegalBlock[] }

// 見出しから安定したアンカー ID を作る（目次リンク用）。
// 日本語の条文見出しをそのまま使うため、連番ベースにして URL を単純に保つ。
export function sectionId(index: number) {
  return `s${index + 1}`
}

export default function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
  relatedHref,
  relatedLabel,
}: {
  title: string
  updatedAt: string
  intro?: string
  sections: LegalSection[]
  relatedHref: string
  relatedLabel: string
}) {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>{title}</h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: intro ? '20px' : '32px' }}>
          最終更新日: {updatedAt}
        </p>

        {intro && (
          <p style={{ fontSize: '14px', lineHeight: '1.9', color: '#525252', marginBottom: '32px' }}>
            {intro}
          </p>
        )}

        {/* 目次 */}
        <nav
          aria-label="目次"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: '40px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>目次</div>
          <ol style={{ listStyle: 'none', display: 'grid', gap: '7px' }}>
            {sections.map((s, i) => (
              <li key={s.heading}>
                <a
                  href={`#${sectionId(i)}`}
                  style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', lineHeight: '1.6' }}
                >
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.heading} id={sectionId(i)} style={{ marginBottom: '32px', scrollMarginTop: '80px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)' }}>
              {s.heading}
            </h2>
            {s.body.map((block, bi) =>
              Array.isArray(block) ? (
                <ul key={bi} style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  {block.map((item, ii) => (
                    <li
                      key={ii}
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.9',
                        color: '#525252',
                        listStyle: 'disc',
                        marginBottom: '4px',
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={bi} style={{ fontSize: '14px', lineHeight: '1.9', color: '#525252', marginBottom: '10px' }}>
                  {block}
                </p>
              )
            )}
          </section>
        ))}

        {/* 関連ドキュメントへの導線 */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            marginTop: '48px',
            paddingTop: '20px',
            fontSize: '13px',
            color: 'var(--muted)',
          }}
        >
          あわせてご確認ください：{' '}
          <Link href={relatedHref} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            {relatedLabel}
          </Link>
        </div>
      </main>
    </>
  )
}
