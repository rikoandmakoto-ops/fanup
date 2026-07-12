import Header from '@/components/layout/Header'
import Link from 'next/link'
import ProjectThumbnail from '@/components/ProjectThumbnail'
import { createClient } from '@/lib/supabase/server'
import { daysLeft } from '@/lib/date'

const fallbackProjects = [
  { id: 1, emoji: '🎵', bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', badge: '音楽', creator: 'あかり', title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82, raised: 82000, goal: 100000, days: 8 },
  { id: 2, emoji: '🎮', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', badge: 'ゲーム', creator: 'けんた', title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45, raised: 45000, goal: 100000, days: 21 },
  { id: 3, emoji: '💄', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', badge: 'コスメ', creator: 'みき', title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60, raised: 60000, goal: 100000, days: 14 },
]

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: selectedCategory } = await searchParams
  const supabase = await createClient()

  const { data: dbProjects } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, deadline, status, creators(name, category)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const projects = dbProjects && dbProjects.length > 0
    ? dbProjects.map(p => {
        const creatorRaw = p.creators as unknown as { name: string; category: string } | { name: string; category: string }[] | null
        const creator = Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw
        const pct = p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0
        const days = daysLeft(p.deadline)
        return {
          id: p.id,
          emoji: '📌',
          bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)',
          badge: creator?.category ?? '',
          creator: creator?.name ?? '',
          title: p.title,
          pct,
          raised: p.current_points,
          goal: p.goal_points,
          days,
        }
      })
    : fallbackProjects

  // 利用可能なカテゴリ（プロジェクトに紐づくものだけ・重複排除）
  const categories = Array.from(
    new Set(projects.map(p => p.badge).filter((b): b is string => Boolean(b)))
  )

  // 選択中カテゴリで絞り込み（未指定または該当なしなら全件）
  const isFiltering = Boolean(selectedCategory) && categories.includes(selectedCategory!)
  const visibleProjects = isFiltering
    ? projects.filter(p => p.badge === selectedCategory)
    : projects

  const chipBase = {
    fontSize: '13px',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '99px',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    border: '1px solid',
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ padding: '32px 0 24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '4px' }}>PROJECTS</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>プロジェクト一覧</div>
        </div>

        {/* カテゴリ絞り込み */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '24px' }}>
            <Link
              href="/projects"
              style={{
                ...chipBase,
                background: !isFiltering ? '#7C3AED' : '#fff',
                color: !isFiltering ? '#fff' : '#525252',
                borderColor: !isFiltering ? '#7C3AED' : '#e5e5e5',
              }}
            >
              すべて
            </Link>
            {categories.map(cat => {
              const active = selectedCategory === cat
              return (
                <Link
                  key={cat}
                  href={`/projects?category=${encodeURIComponent(cat)}`}
                  style={{
                    ...chipBase,
                    background: active ? '#7C3AED' : '#fff',
                    color: active ? '#fff' : '#525252',
                    borderColor: active ? '#7C3AED' : '#e5e5e5',
                  }}
                >
                  {cat}
                </Link>
              )
            })}
          </div>
        )}

        {visibleProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#737373', fontSize: '14px' }}>
            このカテゴリのプロジェクトはまだありません
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px', paddingBottom: '60px' }}>
            {visibleProjects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <ProjectThumbnail title={p.title} category={p.badge} seed={p.id} variant="card" />
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#737373' }}>{p.creator}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '99px',
                        background: '#EDE9FE',
                        color: '#7C3AED',
                        border: '1px solid #C4B5FD',
                      }}>
                        {p.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.5', marginBottom: '14px' }}>{p.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '7px' }}>
                      <span style={{ fontWeight: '700', color: '#7C3AED' }}>{p.pct}%</span>
                      <span>残り {p.days}日</span>
                    </div>
                    <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${p.pct}%`,
                        background: 'linear-gradient(90deg, #7C3AED, #a78bfa)',
                        borderRadius: '99px',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#737373', marginTop: '7px' }}>
                      <span>{p.raised.toLocaleString()} pt</span>
                      <span>目標 {p.goal.toLocaleString()} pt</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
