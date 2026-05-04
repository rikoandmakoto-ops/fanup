import Header from '@/components/layout/Header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function CreatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // クリエイター情報を取得（未登録なら null）
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, category, bio, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
          <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>クリエイター登録がありません</div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginBottom: '24px' }}>
            クリエイターとしてプロジェクトを作成するには、まず申請が必要です。
          </p>
          {/* 申請フォームへ */}
          <Link href="/creator/apply" style={{
            background: 'var(--pink)',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: '99px',
            fontSize: '14px',
            fontWeight: '500',
            textDecoration: 'none',
          }}>
            クリエイター申請する
          </Link>
        </main>
      </>
    )
  }

  // 自分のプロジェクト一覧
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, deadline, status, created_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })

  // 各プロジェクトのサポーター数を集計
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: donationCounts } = projectIds.length > 0
    ? await supabase
        .from('donations')
        .select('project_id, user_id')
        .in('project_id', projectIds)
    : { data: [] }

  // プロジェクトごとのユニークサポーター数
  const supporterMap: Record<string, Set<string>> = {}
  ;(donationCounts ?? []).forEach(d => {
    if (!supporterMap[d.project_id]) supporterMap[d.project_id] = new Set()
    supporterMap[d.project_id].add(d.user_id)
  })

  // 合計の集計
  const totalRaised = (projects ?? []).reduce((s, p) => s + p.current_points, 0)
  const totalSupporters = new Set((donationCounts ?? []).map(d => d.user_id)).size

  return (
    <>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>クリエイターダッシュボード</div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px' }}>
          {creator.name}（{creator.category ?? 'カテゴリ未設定'}）
          {creator.status === 'pending' && (
            <span style={{ marginLeft: '8px', fontSize: '11px', background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid #fad898', padding: '2px 8px', borderRadius: '99px' }}>審査中</span>
          )}
        </div>

        {/* サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'プロジェクト数', value: `${(projects ?? []).length}件` },
            { label: '合計獲得ポイント', value: `${totalRaised.toLocaleString()} pt` },
            { label: 'サポーター数', value: `${totalSupporters}名` },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--pink)' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* プロジェクト一覧ヘッダー＋新規作成ボタン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>プロジェクト</div>
          {/* 承認済みのみ作成可 */}
          {creator.status === 'approved' && (
            <Link href="/creator/projects/new" style={{
              background: 'var(--pink)',
              color: '#fff',
              padding: '7px 16px',
              borderRadius: '99px',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              + 新規作成
            </Link>
          )}
        </div>

        {!projects || projects.length === 0 ? (
          <div style={{ fontSize: '14px', color: 'var(--muted)', padding: '20px 0' }}>
            まだプロジェクトがありません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map(p => {
              const pct = p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0
              const days = p.deadline ? Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000)) : 0
              const supporters = supporterMap[p.id]?.size ?? 0
              const statusLabel = p.status === 'active' ? '募集中' : p.status === 'succeeded' ? '達成' : p.status === 'failed' ? '未達成' : p.status
              const statusColor = p.status === 'active' ? 'var(--teal)' : p.status === 'succeeded' ? 'var(--pink)' : 'var(--muted)'

              return (
                <div key={p.id} style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700' }}>{p.title}</div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: statusColor, background: p.status === 'active' ? 'var(--teal-bg)' : 'var(--bg3)', padding: '2px 10px', borderRadius: '99px' }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'var(--pink)', borderRadius: '99px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                    <span><strong style={{ color: 'var(--pink)' }}>{pct}%</strong> 達成</span>
                    <span>{p.current_points.toLocaleString()} / {p.goal_points.toLocaleString()} pt</span>
                    <span>{supporters}名 サポーター</span>
                    {p.status === 'active' && <span>残り{days}日</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
