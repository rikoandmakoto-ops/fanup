import Header from '@/components/layout/Header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { daysLeft } from '@/lib/date'
import StripeConnectCard, { type ConnectStatus } from '@/components/creator/StripeConnectCard'

const CONNECT_STATUSES: ConnectStatus[] = ['none', 'pending', 'active', 'restricted']

// Stripe 関連カラムは 0002 未適用の DB では取得できないため optional にしておく。
type CreatorRow = {
  id: string
  name: string
  category: string | null
  bio: string | null
  status: string
  stripe_connect_status?: string | null
  stripe_disabled_reason?: string | null
}

// オンボーディング復帰時（/api/stripe/connect/callback からのリダイレクト）に出すバナー
const CONNECT_BANNER: Record<string, { text: string; color: string; bg: string; border: string }> = {
  active: { text: '受取口座の連携が完了しました。達成した売上は自動でお振り込みします。', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  pending: { text: 'Stripe の手続きが途中で終了しています。審査完了までお待ちいただくか、続きから再開してください。', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  restricted: { text: 'Stripe から追加情報の提出を求められています。登録情報を更新してください。', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  error: { text: 'Stripe 連携の処理に失敗しました。時間をおいて再度お試しください。', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

export default async function CreatorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>
}) {
  const { connect } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  /* クリエイター情報を取得
     0002_stripe_connect.sql が未適用の DB では Stripe 関連カラムが無く select が
     失敗するため、その場合は基本カラムだけで取り直してダッシュボードは表示する。 */
  const { data: creatorWithConnect, error: creatorError } = await supabase
    .from('creators')
    .select('id, name, category, bio, status, stripe_connect_status, stripe_disabled_reason')
    .eq('user_id', user.id)
    .maybeSingle<CreatorRow>()

  let creator = creatorWithConnect
  if (creatorError) {
    console.warn('CreatorDashboard: Stripe 連携カラムの取得に失敗（0002 未適用？）', creatorError.message)
    const { data: fallback } = await supabase
      .from('creators')
      .select('id, name, category, bio, status')
      .eq('user_id', user.id)
      .maybeSingle<CreatorRow>()
    creator = fallback
  }

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

  /* 出金履歴（payouts は「クリエイター本人のみ read」の RLS が効いている） */
  const { data: payouts } = await supabase
    .from('payouts')
    .select('id, project_id, status, gross_points, fee_amount, net_amount, platform_fee_rate, error_message, paid_at, created_at')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })

  const projectTitleById = new Map((projects ?? []).map(p => [p.id, p.title]))

  const paidTotal = (payouts ?? [])
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + p.net_amount, 0)
  // pending / failed はまだ手元に届いていない = 振込待ち
  const pendingTotal = (payouts ?? [])
    .filter(p => p.status !== 'paid')
    .reduce((s, p) => s + p.net_amount, 0)
  const feeTotal = (payouts ?? []).reduce((s, p) => s + p.fee_amount, 0)

  const rawConnectStatus = creator.stripe_connect_status ?? 'none'
  const connectStatus: ConnectStatus = CONNECT_STATUSES.includes(rawConnectStatus as ConnectStatus)
    ? (rawConnectStatus as ConnectStatus)
    : 'none'

  const banner = connect ? CONNECT_BANNER[connect] : undefined

  return (
    <>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Stripe 連携の結果通知 */}
        {banner && (
          <div style={{
            fontSize: '13px',
            lineHeight: '1.7',
            color: banner.color,
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
          }}>
            {banner.text}
          </div>
        )}

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

        {/* Stripe Connect 連携 */}
        <StripeConnectCard
          status={connectStatus}
          disabledReason={creator.stripe_disabled_reason ?? null}
          pendingAmount={pendingTotal}
        />

        {/* 売上・出金 */}
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>売上・出金</div>

        <div className="dash-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {[
            { label: '送金済み', value: `¥${paidTotal.toLocaleString()}` },
            { label: '振込待ち', value: `¥${pendingTotal.toLocaleString()}` },
            { label: 'プラットフォーム手数料', value: `¥${feeTotal.toLocaleString()}` },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#7C3AED' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#737373', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {!payouts || payouts.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#737373', padding: '4px 0 32px' }}>
            まだ出金履歴はありません。プロジェクトが目標を達成すると、ここに振込の記録が表示されます。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {payouts.map(po => {
              const label = po.status === 'paid' ? '送金済み' : po.status === 'pending' ? '処理中' : '保留中'
              const color = po.status === 'paid' ? '#059669' : po.status === 'pending' ? '#D97706' : '#DC2626'
              const bg = po.status === 'paid' ? '#ECFDF5' : po.status === 'pending' ? '#FFFBEB' : '#FEF2F2'
              const date = new Date(po.paid_at ?? po.created_at).toLocaleDateString('ja-JP')
              const feePct = Math.round(Number(po.platform_fee_rate) * 100)

              return (
                <div key={po.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>
                      {projectTitleById.get(po.project_id) ?? 'プロジェクト'}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color,
                      background: bg,
                      padding: '3px 12px',
                      borderRadius: '99px',
                      whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#737373' }}>
                    <span>{date}</span>
                    <span>支援総額 ¥{po.gross_points.toLocaleString()}</span>
                    <span>手数料 {feePct}%（− ¥{po.fee_amount.toLocaleString()}）</span>
                    <span style={{ color: '#7C3AED', fontWeight: '600' }}>
                      受取 ¥{po.net_amount.toLocaleString()}
                    </span>
                  </div>
                  {po.status === 'failed' && po.error_message && (
                    <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px' }}>
                      {po.error_message}（設定完了後、自動で再試行します）
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

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
