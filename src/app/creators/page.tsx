import Header from '@/components/layout/Header'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// DB が空・未接続のときに表示するフォールバック（ホームと共通のデモデータ）
const fallbackCreators = [
  { id: '1', name: 'あかり', cat: '音楽・弾き語り', avatar: '🎵', followers: 134, projects: 2 },
  { id: '2', name: 'けんた', cat: 'ゲーム実況', avatar: '🎮', followers: 67, projects: 1 },
  { id: '3', name: 'みき', cat: 'コスメ・ファッション', avatar: '💄', followers: 89, projects: 1 },
]

// クリエイターカードのカバー色（index で割り当てる）
const coverPalette = [
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #6ee7b7, #059669)',
  'linear-gradient(135deg, #fbbf24, #d97706)',
  'linear-gradient(135deg, #f9a8d4, #db2777)',
  'linear-gradient(135deg, #93c5fd, #2563eb)',
  'linear-gradient(135deg, #fdba74, #ea580c)',
]

type CreatorCard = { id: string; name: string; cat: string; avatar: string; followers: number; projects: number; isInitial?: boolean }

export default async function CreatorsPage() {
  const supabase = await createClient()

  /* === 承認済みクリエイター一覧 === */
  const { data: dbCreators } = await supabase
    .from('creators')
    .select('id, name, category')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  let creators: CreatorCard[] = fallbackCreators
  if (dbCreators && dbCreators.length > 0) {
    const creatorIds = dbCreators.map(c => c.id)

    // 対象クリエイターのプロジェクトを取得し、件数とサポーター数を集計
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

    creators = dbCreators.map(c => ({
      id: c.id,
      name: c.name,
      cat: c.category ?? '',
      avatar: c.name?.[0] ?? '★',
      isInitial: true,
      followers: supporterSets[c.id]?.size ?? 0,
      projects: projectCount[c.id] ?? 0,
    }))
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ padding: '32px 0 24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '4px' }}>CREATORS</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>クリエイター一覧</div>
        </div>

        {creators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#737373', fontSize: '14px' }}>
            まだクリエイターがいません
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px', paddingBottom: '60px' }}>
            {creators.map((c, i) => (
              <Link key={c.id} href={`/creators/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  {/* ミニカバー */}
                  <div style={{ height: '80px', background: coverPalette[i % coverPalette.length] }} />
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
        )}
      </main>
    </>
  )
}
