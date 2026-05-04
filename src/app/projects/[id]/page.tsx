import Header from '@/components/layout/Header'
import DonateCard from '@/components/DonateCard'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const fallbackProjects = [
  { id: 1, emoji: '🎵', bg: 'linear-gradient(135deg,#fde8ef,#fcd0dd)', badge: '音楽', creator: 'あかり', cat: '音楽・弾き語り', title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82, color: '#d94f68', raised: 82000, goal: 100000, days: 8, supporters: 134, desc: 'ギターの弾き語りを5年続けてきました。自宅録音から配信へとステップアップするため、専用のファンクラブチャンネルを開設したいと考えています。\n\n月に最低4本の演奏動画と、月1回のライブ配信を予定しています。チャンネル開設後は限定コンテンツも随時公開していきます。皆さんの応援が大きな力になります！' },
  { id: 2, emoji: '🎮', bg: 'linear-gradient(135deg,#e8f8f2,#c8f0e4)', badge: 'ゲーム', creator: 'けんた', cat: 'ゲーム実況・エンタメ', title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45, color: '#1a9e7a', raised: 45000, goal: 100000, days: 21, supporters: 67, desc: 'RPGからFPSまで幅広いジャンルのゲームを実況しています。毎日1本以上の動画投稿を目標に、視聴者と一緒に楽しめるチャンネルを作りたいと思っています。' },
  { id: 3, emoji: '💄', bg: 'linear-gradient(135deg,#fef8e8,#faecc8)', badge: 'コスメ', creator: 'みき', cat: 'ファッション・コスメ', title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60, color: '#c98a10', raised: 60000, goal: 100000, days: 14, supporters: 89, desc: 'プチプラからデパコスまで、忖度なしのリアルなレビューをお届けしたいと思っています。ファッションも含め、日常をもっと楽しくするコンテンツを発信していきます。' },
]

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // DB からプロジェクト取得を試みる
  const { data: dbProject } = await supabase
    .from('projects')
    .select('id, title, description, goal_points, current_points, deadline, status, creators(name, category)')
    .eq('id', id)
    .single()

  // サポーター数を取得
  let dbSupporters = 0
  if (dbProject) {
    const { count } = await supabase
      .from('donations')
      .select('user_id', { count: 'exact', head: true })
      .eq('project_id', dbProject.id)
    dbSupporters = count ?? 0
  }

  // DB データをフォーマット、なければフォールバック
  const creatorRaw = dbProject?.creators as unknown as { name: string; category: string } | { name: string; category: string }[] | null
  const creatorData = Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw

  const p = dbProject
    ? {
        id: dbProject.id,
        emoji: '📌',
        bg: 'linear-gradient(135deg,#fde8ef,#fcd0dd)',
        badge: creatorData?.category ?? '',
        creator: creatorData?.name ?? '',
        cat: creatorData?.category ?? '',
        title: dbProject.title,
        pct: dbProject.goal_points > 0 ? Math.round((dbProject.current_points / dbProject.goal_points) * 100) : 0,
        color: '#d94f68',
        raised: dbProject.current_points,
        goal: dbProject.goal_points,
        days: dbProject.deadline ? Math.max(0, Math.ceil((new Date(dbProject.deadline).getTime() - Date.now()) / 86400000)) : 0,
        supporters: dbSupporters,
        desc: dbProject.description ?? '',
      }
    : fallbackProjects.find(x => x.id === Number(id))

  if (!p) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let balance = 0
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('point_balance')
      .eq('id', user.id)
      .single()
    balance = profile?.point_balance ?? 0
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ padding: '24px 0 0' }}>
          <Link href="/projects" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>← 一覧へ戻る</Link>
        </div>

        <div style={{ height: '220px', background: p.bg, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '72px', marginBottom: '22px' }}>
          {p.emoji}
        </div>

        <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '99px', background: 'var(--pink-bg)', color: 'var(--pink)', border: '1px solid var(--pink-border)', marginBottom: '12px', display: 'inline-block' }}>{p.badge}</span>
        <h1 style={{ fontSize: '22px', fontWeight: '700', lineHeight: '1.4', margin: '10px 0 16px' }}>{p.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--pink-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--pink)' }}>{p.creator[0]}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{p.creator}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{p.cat}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.9', whiteSpace: 'pre-line', marginBottom: '24px' }}>{p.desc}</p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)' }}>
              <span>目標 <strong style={{ color: 'var(--text)' }}>{p.goal.toLocaleString()} pt</strong></span>
              <span>期限 <strong style={{ color: 'var(--text)' }}>残り{p.days}日</strong></span>
              <span>方式 <strong style={{ color: 'var(--text)' }}>All-or-Nothing</strong></span>
            </div>
            <div style={{ background: 'var(--amber-bg)', border: '1px solid #fad898', borderRadius: '8px', padding: '14px 16px', marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--amber)', marginBottom: '4px' }}>All-or-Nothing方式</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>期限内に目標未達の場合、支援ポイントは全額返還されます。</div>
            </div>
          </div>

          <DonateCard
            projectId={p.id}
            user={user ? { id: user.id } : null}
            balance={balance}
            raised={p.raised}
            goal={p.goal}
            pct={p.pct}
            supporters={p.supporters}
            days={p.days}
            color={p.color}
          />
        </div>
      </main>
    </>
  )
}
