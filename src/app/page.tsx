import Header from '@/components/layout/Header'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// DB が空・未接続のときに表示するフォールバック（従来のデモデータ）
const fallbackCreators = [
  { id: '1', name: 'あかり', cat: '音楽・弾き語り', avatar: '🎵', color: 'linear-gradient(135deg, #a78bfa, #7c3aed)', followers: 134, projects: 2 },
  { id: '2', name: 'けんた', cat: 'ゲーム実況', avatar: '🎮', color: 'linear-gradient(135deg, #6ee7b7, #059669)', followers: 67, projects: 1 },
  { id: '3', name: 'みき', cat: 'コスメ・ファッション', avatar: '💄', color: 'linear-gradient(135deg, #fbbf24, #d97706)', followers: 89, projects: 1 },
]

const fallbackProjects = [
  { id: 1, emoji: '🎵', bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', creator: 'あかり', title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82 },
  { id: 2, emoji: '🎮', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', creator: 'けんた', title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45 },
  { id: 3, emoji: '💄', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', creator: 'みき', title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60 },
]

// クリエイターカードのカバー色（DB クリエイターには index で割り当てる）
const coverPalette = [
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #6ee7b7, #059669)',
  'linear-gradient(135deg, #fbbf24, #d97706)',
]

type CreatorCard = { id: string; name: string; cat: string; avatar: string; color: string; followers: number; projects: number; isInitial?: boolean }
type ProjectCard = { id: string | number; emoji: string; bg: string; creator: string; title: string; pct: number }

export default async function Home() {
  const supabase = await createClient()

  /* === 注目のクリエイター（承認済み）=== */
  const { data: dbCreators } = await supabase
    .from('creators')
    .select('id, name, category')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(3)

  let creators: CreatorCard[] = fallbackCreators
  if (dbCreators && dbCreators.length > 0) {
    const creatorIds = dbCreators.map(c => c.id)

    // 対象クリエイターのプロジェクトを取得しサポーター数を集計
    const { data: projs } = await supabase
      .from('projects')
      .select('id, creator_id')
      .in('creator_id', creatorIds)

    const projectIds = (projs ?? []).map(p => p.id)
    const { data: dons } = projectIds.length > 0
      ? await supabase.from('donations').select('project_id, user_id').in('project_id', projectIds)
      : { data: [] }

    // project_id → creator_id の対応表
    const projToCreator: Record<string, string> = {}
    ;(projs ?? []).forEach(p => { projToCreator[p.id] = p.creator_id })

    const projectCount: Record<string, number> = {}
    ;(projs ?? []).forEach(p => { projectCount[p.creator_id] = (projectCount[p.creator_id] ?? 0) + 1 })

    const supporterSets: Record<string, Set<string>> = {}
    ;(dons ?? []).forEach(d => {
      const cid = projToCreator[d.project_id]
      if (!cid) return
      if (!supporterSets[cid]) supporterSets[cid] = new Set()
      supporterSets[cid].add(d.user_id)
    })

    creators = dbCreators.map((c, i) => ({
      id: c.id,
      name: c.name,
      cat: c.category ?? '',
      avatar: c.name?.[0] ?? '★',
      isInitial: true,
      color: coverPalette[i % coverPalette.length],
      followers: supporterSets[c.id]?.size ?? 0,
      projects: projectCount[c.id] ?? 0,
    }))
  }

  /* === 注目のプロジェクト（募集中・集まったポイント順）=== */
  const { data: dbProjects } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, status, creators(name)')
    .eq('status', 'active')
    .order('current_points', { ascending: false })
    .limit(3)

  let projects: ProjectCard[] = fallbackProjects
  if (dbProjects && dbProjects.length > 0) {
    projects = dbProjects.map(p => {
      const creatorRaw = p.creators as unknown as { name: string } | { name: string }[] | null
      const creator = Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw
      return {
        id: p.id,
        emoji: '📌',
        bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)',
        creator: creator?.name ?? '',
        title: p.title,
        pct: p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0,
      }
    })
  }

  /* === スタッツ（実データ。取得できなければデモ値）=== */
  const [supportersCount, activeCount, succeededCount] = await Promise.all([
    supabase.from('donations').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'succeeded'),
  ])

  const stats = [
    { num: (supportersCount.count ?? 0) > 0 ? supportersCount.count!.toLocaleString() : '1,248', label: 'サポーター' },
    { num: (activeCount.count ?? 0) > 0 ? String(activeCount.count) : '24', label: '進行中プロジェクト' },
    { num: (succeededCount.count ?? 0) > 0 ? String(succeededCount.count) : '8', label: '達成チャンネル' },
    { num: '¥0', label: '手数料（サポーター）' },
  ]

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>

        {/* ヒーローセクション */}
        <section style={{ padding: '64px 0 48px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#7C3AED',
            background: '#EDE9FE',
            border: '1px solid #C4B5FD',
            padding: '5px 16px',
            borderRadius: '99px',
            marginBottom: '24px',
            fontWeight: '500',
          }}>
            ファンクラブ特化型クラウドファンディング
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 56px)',
            fontWeight: '700',
            lineHeight: '1.15',
            marginBottom: '16px',
            letterSpacing: '-1px',
          }}>
            推しを<span style={{ color: '#7C3AED' }}>デビュー</span>させよう。
          </h1>

          <p style={{
            fontSize: '15px',
            color: '#737373',
            maxWidth: '480px',
            margin: '0 auto 36px',
            lineHeight: '1.8',
          }}>
            ポイントを買って好きなクリエイターに投げる。目標達成でチャンネルが開設される、新しい応援のかたち。
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/projects" style={{
              background: '#7C3AED',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '99px',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}>
              プロジェクトを探す
            </Link>
            <Link href="/signup" style={{
              background: '#fff',
              color: '#1a1a1a',
              border: '1.5px solid #e5e5e5',
              padding: '14px 32px',
              borderRadius: '99px',
              fontSize: '15px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              無料で始める
            </Link>
          </div>

          {/* スタッツ */}
          <div className="hero-stats" style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '52px',
            borderTop: '1px solid #e5e5e5',
            paddingTop: '32px',
          }}>
            {stats.map((s, i) => (
              <div key={i} className="hero-stat" style={{
                flex: 1,
                textAlign: 'center',
                padding: '0 24px',
                borderRight: i < 3 ? '1px solid #e5e5e5' : 'none',
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#7C3AED' }}>{s.num}</div>
                <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 注目のクリエイター */}
        <section style={{ paddingBottom: '48px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '4px' }}>FEATURED</div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>注目のクリエイター</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
            {creators.map(c => (
              <Link key={c.id} href={`/creators/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  {/* ミニカバー */}
                  <div style={{ height: '80px', background: c.color }} />
                  <div style={{ padding: '0 18px 18px', position: 'relative' }}>
                    {/* アバター */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '3px solid #fff',
                      background: '#EDE9FE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: c.isInitial ? '26px' : '28px',
                      fontWeight: c.isInitial ? 700 : 400,
                      color: c.isInitial ? '#7C3AED' : 'inherit',
                      marginTop: '-32px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}>
                      {c.avatar}
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>{c.cat}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '13px' }}>
                      <span><strong>{c.followers}</strong> <span style={{ color: '#737373' }}>サポーター</span></span>
                      <span><strong>{c.projects}</strong> <span style={{ color: '#737373' }}>プロジェクト</span></span>
                    </div>
                    {/* プロフィールボタン */}
                    <button style={{
                      width: '100%',
                      marginTop: '14px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1.5px solid #e5e5e5',
                      background: '#fff',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      color: '#1a1a1a',
                    }}>
                      プロフィールを見る
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 注目のプロジェクト */}
        <section style={{ paddingBottom: '60px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '4px' }}>PROJECTS</div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>注目のプロジェクト</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <div style={{ height: '160px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px' }}>
                    {p.emoji}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: '12px', color: '#737373', marginBottom: '8px' }}>{p.creator}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.5', marginBottom: '14px' }}>{p.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '7px' }}>
                      <span style={{ fontWeight: '700', color: '#7C3AED' }}>{p.pct}%</span>
                      <span>達成</span>
                    </div>
                    <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(p.pct, 100)}%`, background: 'linear-gradient(90deg, #7C3AED, #a78bfa)', borderRadius: '99px' }} />
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
