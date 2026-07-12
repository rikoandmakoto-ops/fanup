import Header from '@/components/layout/Header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { daysLeft } from '@/lib/date'

export default async function CreatorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  /* クリエイター情報を取得 */
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, category, bio, status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!creator) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
          <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>クリエイター登録がありません</div>
          <p style={{ fontSize: '14px', color: '#737373', lineHeight: '1.8', marginBottom: '28px' }}>
            クリエイターとしてプロジェクトを作成するには、まず申請が必要です。
          </p>
          <Link href="/creator/apply" className="btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }}>
            クリエイター申請する
          </Link>
        </main>
      </>
    )
  }

  /* 自分のプロジェクト一覧 */
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, goal_points, current_points, deadline, status, created_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })

  /* 各プロジェクトのサポーター数を集計 */
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: donationCounts } = projectIds.length > 0
    ? await supabase
        .from('donations')
        .select('project_id, user_id')
        .in('project_id', projectIds)
    : { data: [] }

  const supporterMap: Record<string, Set<string>> = {}
  ;(donationCounts ?? []).forEach(d => {
    if (!supporterMap[d.project_id]) supporterMap[d.project_id] = new Set()
    supporterMap[d.project_id].add(d.user_id)
  })

  const totalRaised = (projects ?? []).reduce((s, p) => s + p.current_points, 0)
  const totalSupporters = new Set((donationCounts ?? []).map(d => d.user_id)).size

  return (
    <>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>ダッシュボード</div>
            <div style={{ fontSize: '14px', color: '#737373', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {creator.name}（{creator.category ?? 'カテゴリ未設定'}）
              {creator.status === 'pending' && (
                <span style={{
                  fontSize: '11px',
                  background: '#FFFBEB',
                  color: '#D97706',
                  border: '1px solid #FCD34D',
                  padding: '2px 10px',
                  borderRadius: '99px',
                  fontWeight: '600',
                }}>
                  審査中
                </span>
              )}
            </div>
          </div>
          <Link href={`/creators/${creator.id}`} style={{
            fontSize: '13px',
            color: '#7C3AED',
            textDecoration: 'none',
            fontWeight: '500',
          }}>
            公開プロフィール →
          </Link>
        </div>

        {/* サマリーカード */}
        <div className="dash-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
          {[
            { label: 'プロジェクト数', value: `${(projects ?? []).length}件` },
            { label: '合計獲得ポイント', value: `${totalRaised.toLocaleString()} pt` },
            { label: 'サポーター数', value: `${totalSupporters}名` },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7C3AED' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* プロジェクト一覧ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>プロジェクト</div>
          {creator.status === 'approved' && (
            <Link href="/creator/projects/new" style={{
              background: '#7C3AED',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '99px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
            }}>
              + 新規作成
            </Link>
          )}
        </div>

        {/* プロジェクトリスト */}
        {!projects || projects.length === 0 ? (
          <div style={{ fontSize: '14px', color: '#737373', padding: '24px 0' }}>
            まだプロジェクトがありません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projects.map(p => {
              const pct = p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0
              const days = daysLeft(p.deadline)
              const supporters = supporterMap[p.id]?.size ?? 0
              const statusLabel = p.status === 'active' ? '募集中' : p.status === 'succeeded' ? '達成' : p.status === 'failed' ? '未達成' : p.status
              const statusColor = p.status === 'active' ? '#059669' : p.status === 'succeeded' ? '#7C3AED' : '#737373'
              const statusBg = p.status === 'active' ? '#ECFDF5' : p.status === 'succeeded' ? '#EDE9FE' : '#f5f5f5'

              return (
                <Link key={p.id} href={`/creator/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ padding: '20px 22px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700' }}>{p.title}</div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: statusColor,
                        background: statusBg,
                        padding: '3px 12px',
                        borderRadius: '99px',
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f5f5f5', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        background: 'linear-gradient(90deg, #7C3AED, #a78bfa)',
                        borderRadius: '99px',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '18px', fontSize: '12px', color: '#737373', flexWrap: 'wrap' }}>
                        <span><strong style={{ color: '#7C3AED' }}>{pct}%</strong> 達成</span>
                        <span>{p.current_points.toLocaleString()} / {p.goal_points.toLocaleString()} pt</span>
                        <span>{supporters}名 サポーター</span>
                        {p.status === 'active' && <span>残り{days}日</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: '600' }}>管理 →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
