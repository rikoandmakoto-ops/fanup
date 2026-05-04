import Header from '@/components/layout/Header'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const fallbackProjects = [
  { id: 1, emoji: '🎵', bg: 'linear-gradient(135deg,#fde8ef,#fcd0dd)', badge: '音楽', creator: 'あかり', title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82, color: '#d94f68', raised: 82000, goal: 100000, days: 8 },
  { id: 2, emoji: '🎮', bg: 'linear-gradient(135deg,#e8f8f2,#c8f0e4)', badge: 'ゲーム', creator: 'けんた', title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45, color: '#1a9e7a', raised: 45000, goal: 100000, days: 21 },
  { id: 3, emoji: '💄', bg: 'linear-gradient(135deg,#fef8e8,#faecc8)', badge: 'コスメ', creator: 'みき', title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60, color: '#c98a10', raised: 60000, goal: 100000, days: 14 },
]

export default async function ProjectsPage() {
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
        const days = p.deadline ? Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000)) : 0
        return {
          id: p.id,
          emoji: '📌',
          bg: 'linear-gradient(135deg,#fde8ef,#fcd0dd)',
          badge: creator?.category ?? '',
          creator: creator?.name ?? '',
          title: p.title,
          pct,
          color: '#d94f68',
          raised: p.current_points,
          goal: p.goal_points,
          days,
        }
      })
    : fallbackProjects

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ padding: '32px 0 20px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>募集中</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>プロジェクト一覧</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px', paddingBottom: '60px' }}>
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ height: '160px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px' }}>
                  {p.emoji}
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{p.creator}</span>
                    <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '99px', background: 'var(--pink-bg)', color: 'var(--pink)', border: '1px solid var(--pink-border)' }}>{p.badge}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.5', marginBottom: '12px' }}>{p.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '7px' }}>
                    <span style={{ fontWeight: '700', color: p.color }}>{p.pct}%</span>
                    <span>残り {p.days}日</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: '99px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '7px' }}>
                    <span>{p.raised.toLocaleString()} pt</span>
                    <span>目標 {p.goal.toLocaleString()} pt</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
