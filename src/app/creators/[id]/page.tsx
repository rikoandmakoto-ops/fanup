import Header from '@/components/layout/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { daysLeft } from '@/lib/date'
import FollowButton from '@/components/FollowButton'

/* ダミーデータ（DB未接続時のフォールバック） */
const fallbackCreators = [
  {
    id: '1',
    name: 'あかり',
    category: '音楽・弾き語り',
    bio: '5年間ギターの弾き語りを続けてきました。\n自宅録音から配信へとステップアップするため、専用のファンクラブチャンネルを開設したいと考えています。\n\n月に最低4本の演奏動画と、月1回のライブ配信を予定しています。チャンネル開設後は限定コンテンツも随時公開していきます。',
    status: 'approved',
    coverColor: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)',
    avatar: '🎵',
    stats: { followers: 134, projects: 2, achieved: 0 },
    projects: [
      { id: 1, title: '弾き語りチャンネルを開設して音楽の世界を広げたい', pct: 82, raised: 82000, goal: 100000, days: 8, emoji: '🎵', bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)' },
    ],
  },
  {
    id: '2',
    name: 'けんた',
    category: 'ゲーム実況・エンタメ',
    bio: 'RPGからFPSまで幅広いジャンルのゲームを実況しています。毎日1本以上の動画投稿を目標に、視聴者と一緒に楽しめるチャンネルを作りたいと思っています。',
    status: 'approved',
    coverColor: 'linear-gradient(135deg, #6ee7b7 0%, #059669 50%, #047857 100%)',
    avatar: '🎮',
    stats: { followers: 67, projects: 1, achieved: 0 },
    projects: [
      { id: 2, title: 'ゲーム実況チャンネルで毎日配信を届けたい', pct: 45, raised: 45000, goal: 100000, days: 21, emoji: '🎮', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' },
    ],
  },
  {
    id: '3',
    name: 'みき',
    category: 'ファッション・コスメ',
    bio: 'プチプラからデパコスまで、忖度なしのリアルなレビューをお届けしたいと思っています。ファッションも含め、日常をもっと楽しくするコンテンツを発信していきます。',
    status: 'approved',
    coverColor: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #b45309 100%)',
    avatar: '💄',
    stats: { followers: 89, projects: 1, achieved: 0 },
    projects: [
      { id: 3, title: 'コスメ・ファッションの本音レビューを発信したい', pct: 60, raised: 60000, goal: 100000, days: 14, emoji: '💄', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' },
    ],
  },
]

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  /* DB からクリエイター情報を取得 */
  const { data: dbCreator } = await supabase
    .from('creators')
    .select('id, name, category, bio, status, user_id')
    .eq('id', id)
    .maybeSingle()

  /* DB にいなければフォールバック */
  const fallback = fallbackCreators.find(c => c.id === id)

  if (!dbCreator && !fallback) notFound()

  /* プロジェクト取得 */
  let projects: { id: string | number; title: string; pct: number; raised: number; goal: number; days: number; emoji: string; bg: string }[] = []
  let totalSupporters = 0

  if (dbCreator) {
    const { data: dbProjects } = await supabase
      .from('projects')
      .select('id, title, goal_points, current_points, deadline, status')
      .eq('creator_id', dbCreator.id)
      .order('created_at', { ascending: false })

    projects = (dbProjects ?? []).map(p => ({
      id: p.id,
      title: p.title,
      pct: p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0,
      raised: p.current_points,
      goal: p.goal_points,
      days: daysLeft(p.deadline),
      emoji: '📌',
      bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)',
    }))

    /* サポーター数集計 */
    const projectIds = projects.map(p => p.id)
    if (projectIds.length > 0) {
      const { count } = await supabase
        .from('donations')
        .select('user_id', { count: 'exact', head: true })
        .in('project_id', projectIds)
      totalSupporters = count ?? 0
    }
  }

  /* ログインユーザーとフォロー状態を取得（follows テーブル未作成でも安全に 0/false） */
  const { data: { user } } = await supabase.auth.getUser()
  const targetCreatorId = dbCreator?.id ?? id

  const { count: followerCount } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('creator_id', targetCreatorId)

  let isFollowing = false
  if (user) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('creator_id')
      .eq('creator_id', targetCreatorId)
      .eq('follower_id', user.id)
      .maybeSingle()
    isFollowing = Boolean(followRow)
  }

  /* 表示用データ組み立て */
  const creator = dbCreator
    ? {
        name: dbCreator.name,
        category: dbCreator.category ?? '',
        bio: dbCreator.bio ?? '',
        status: dbCreator.status,
        avatar: dbCreator.name[0],
        coverColor: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)',
        stats: { followers: followerCount ?? totalSupporters, projects: projects.length, achieved: projects.filter(p => p.pct >= 100).length },
        projects,
      }
    : {
        ...fallback!,
      }

  const displayProjects = dbCreator ? projects : (fallback?.projects ?? [])
  // Tip（投げ銭）導線：募集中プロジェクトがあればそこへ、無ければ先頭プロジェクト
  const tipProjectId = displayProjects[0]?.id

  return (
    <>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* === プロフィールカード（FeetFinder風） === */}
        <div style={{
          background: '#fff',
          borderRadius: '0 0 20px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>

          {/* カバー画像（フル幅） */}
          <div className="creator-cover" style={{
            height: '220px',
            background: creator.coverColor,
          }} />

          {/* プロフィール情報セクション */}
          <div className="creator-profile-body" style={{ padding: '0 28px 28px' }}>

            {/* === アバター + 名前 + Stats 1行レイアウト（FeetFinder準拠） === */}
            <div className="creator-head" style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '16px',
              marginTop: '-50px',
            }}>
              {/* アバター（左寄り、カバーにオーバーラップ） */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '4px solid #fff',
                background: '#EDE9FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '42px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                position: 'relative',
              }}>
                {creator.avatar}
                {creator.status === 'approved' && (
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* 名前 + カテゴリ（アバターの右隣） */}
              <div style={{ flex: 1, paddingBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0, lineHeight: '1.2' }}>{creator.name}</h1>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  fontSize: '13px',
                  color: '#737373',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4" fill="#059669"/>
                  </svg>
                  {creator.category}
                </div>
              </div>

              {/* Stats（右端） */}
              <div className="creator-head-stats" style={{ display: 'flex', gap: '24px', textAlign: 'center', paddingBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{creator.stats.followers}</div>
                  <div style={{ fontSize: '11px', color: '#737373', letterSpacing: '0.03em' }}>Followers</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{creator.stats.projects}</div>
                  <div style={{ fontSize: '11px', color: '#737373', letterSpacing: '0.03em' }}>Projects</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{creator.stats.achieved}</div>
                  <div style={{ fontSize: '11px', color: '#737373', letterSpacing: '0.03em' }}>Achieved</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p style={{
              fontSize: '14px',
              color: '#525252',
              lineHeight: '1.8',
              marginTop: '16px',
              whiteSpace: 'pre-line',
            }}>
              {creator.bio}
            </p>

            {/* アクションボタン行（Follow / Tip / Offer / Message） */}
            <div className="creator-actions" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              marginTop: '20px',
            }}>
              {/* フォロー（実機能） */}
              <FollowButton creatorId={targetCreatorId} isLoggedIn={Boolean(user)} initialFollowing={isFollowing} />

              {/* チップ＝既存の応援フローへ。募集中プロジェクトがあればその詳細へ誘導 */}
              {tipProjectId ? (
                <Link href={`/projects/${tipProjectId}`} className="btn-outline">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6"/>
                    <path d="M8 5v3l2 2"/>
                  </svg>
                  チップ
                </Link>
              ) : (
                <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6"/>
                    <path d="M8 5v3l2 2"/>
                  </svg>
                  チップ
                </button>
              )}

              {/* オファー / メッセージは未提供のため準備中表示 */}
              <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 10l-3-3 3-3M2 6l3 3-3 3"/>
                </svg>
                準備中
              </button>
              <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="12" height="10" rx="2"/>
                  <path d="M2 5l6 4 6-4"/>
                </svg>
                準備中
              </button>
            </div>

            {/* メインCTA（Subscribe風） */}
            <Link href={displayProjects.length > 0 ? `/projects/${displayProjects[0].id}` : '#'} className="btn-primary" style={{ marginTop: '14px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 15.5C9 15.5 2 11 2 6.3A3.5 3.5 0 0 1 9 5.2 3.5 3.5 0 0 1 16 6.3C16 11 9 15.5 9 15.5z" fill="white"/>
              </svg>
              応援する
            </Link>
          </div>
        </div>

        {/* === プロジェクト一覧 === */}
        <div style={{ padding: '28px 16px 0' }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            paddingLeft: '4px',
          }}>
            プロジェクト
          </div>

          {displayProjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#737373',
              fontSize: '14px',
            }}>
              まだプロジェクトがありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayProjects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ display: 'flex', overflow: 'hidden' }}>
                    {/* サムネイル */}
                    <div style={{
                      width: '140px',
                      minHeight: '120px',
                      background: p.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      flexShrink: 0,
                    }}>
                      {p.emoji}
                    </div>
                    {/* 情報 */}
                    <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', lineHeight: '1.4', marginBottom: '10px' }}>
                        {p.title}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#7C3AED' }}>{p.pct}%</span>
                        <span>{p.raised.toLocaleString()} / {p.goal.toLocaleString()} pt</span>
                      </div>
                      <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(p.pct, 100)}%`,
                          background: 'linear-gradient(90deg, #7C3AED, #a78bfa)',
                          borderRadius: '99px',
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#737373', marginTop: '6px' }}>
                        残り {p.days}日
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
