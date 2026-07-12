import Header from '@/components/layout/Header'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { daysLeft } from '@/lib/date'
import { getProjectVideoUrl } from '@/lib/video'
import ProjectEditForm from './ProjectEditForm'
import VideoUpload from './VideoUpload'

// クリエイター向けプロジェクト管理ページ。
// 概要 / 支援者一覧 / 編集 を 1 画面で提供する。
export default async function ProjectManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  /* 自分のクリエイター情報 */
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator) redirect('/creator')

  /* プロジェクト取得 + 所有チェック */
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, goal_points, current_points, deadline, status, creator_id, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!project || project.creator_id !== creator.id) notFound()

  /* 支援者（完了済み donation）を新しい順で取得 */
  const { data: donations } = await supabase
    .from('donations')
    .select('id, user_id, points, created_at')
    .eq('project_id', project.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  /* 支援者の表示名を解決（profiles は self-read RLS のため service-role で読む） */
  const supporterIds = [...new Set((donations ?? []).map(d => d.user_id))]
  const nameMap: Record<string, string> = {}
  if (supporterIds.length > 0) {
    const admin = createAdminClient()
    const { data: profs } = await admin
      .from('profiles')
      .select('id, display_name, email')
      .in('id', supporterIds)
    ;(profs ?? []).forEach(p => {
      nameMap[p.id] = p.display_name?.trim() || p.email?.split('@')[0] || 'サポーター'
    })
  }

  const pct = project.goal_points > 0 ? Math.round((project.current_points / project.goal_points) * 100) : 0
  const days = daysLeft(project.deadline)
  const supporterCount = supporterIds.length
  const hasDonations = project.current_points > 0 || (donations ?? []).length > 0

  /* 紐づく紹介動画（Storage パス規約で解決） */
  const videoUrl = await getProjectVideoUrl(project.id)

  const statusLabel = project.status === 'active' ? '募集中' : project.status === 'succeeded' ? '達成' : project.status === 'failed' ? '未達成' : project.status
  const statusColor = project.status === 'active' ? '#059669' : project.status === 'succeeded' ? '#7C3AED' : '#737373'
  const statusBg = project.status === 'active' ? '#ECFDF5' : project.status === 'succeeded' ? '#EDE9FE' : '#f5f5f5'

  return (
    <>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* パンくず */}
        <Link href="/creator" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '18px' }}>
          ← ダッシュボードへ戻る
        </Link>

        {/* タイトル + ステータス */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', lineHeight: '1.4', flex: 1, minWidth: '200px' }}>{project.title}</h1>
          <span style={{ fontSize: '11px', fontWeight: '600', color: statusColor, background: statusBg, padding: '4px 12px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
            {statusLabel}
          </span>
        </div>
        <Link href={`/projects/${project.id}`} style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
          公開ページを見る →
        </Link>

        {/* 進捗バー */}
        <div style={{ margin: '20px 0 8px' }}>
          <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'linear-gradient(90deg, #7C3AED, #a78bfa)', borderRadius: '99px' }} />
          </div>
        </div>

        {/* サマリーカード */}
        <div className="dash-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '16px 0 32px' }}>
          {[
            { label: '達成率', value: `${pct}%` },
            { label: '獲得ポイント', value: project.current_points.toLocaleString() },
            { label: 'サポーター', value: `${supporterCount}名` },
            { label: project.status === 'active' ? '残り日数' : '募集', value: project.status === 'active' ? `${days}日` : '終了' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* === 支援者一覧 === */}
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
          支援者一覧 <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '400' }}>（{(donations ?? []).length}件）</span>
        </div>

        {!donations || donations.length === 0 ? (
          <div className="card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px', marginBottom: '36px' }}>
            まだ支援者がいません。プロジェクトをシェアして応援を集めましょう。
          </div>
        ) : (
          <div className="card" style={{ padding: '6px 0', marginBottom: '36px' }}>
            {donations.map((d, i) => {
              const name = nameMap[d.user_id] ?? 'サポーター'
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 }}>
                    {name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>{new Date(d.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{d.points.toLocaleString()} pt</div>
                </div>
              )
            })}
          </div>
        )}

        {/* === 紹介動画 === */}
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>紹介動画</div>
        <div style={{ marginBottom: '36px' }}>
          <VideoUpload projectId={project.id} initialUrl={videoUrl} />
        </div>

        {/* === 編集 === */}
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>プロジェクトを編集</div>
        <ProjectEditForm
          projectId={project.id}
          initialTitle={project.title}
          initialDescription={project.description ?? ''}
          initialGoal={project.goal_points}
          deadline={project.deadline}
          hasDonations={hasDonations}
          editable={project.status === 'active'}
        />
      </main>
    </>
  )
}
