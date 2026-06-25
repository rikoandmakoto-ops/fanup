import Header from '@/components/layout/Header'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatorReviewActions from '@/components/admin/CreatorReviewActions'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // admin 権限チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return (
      <>
        <Header />
        <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>アクセス権限がありません</div>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>このページは管理者のみ閲覧できます。</p>
        </main>
      </>
    )
  }

  // 各種データ取得を並列実行
  const [usersRes, creatorsRes, projectsRes, transactionsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, point_balance, role, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('creators').select('id, user_id, name, category, status, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('projects').select('id, title, goal_points, current_points, status, deadline, created_at, creator_id').order('created_at', { ascending: false }).limit(50),
    supabase.from('point_transactions').select('id, user_id, type, amount, stripe_session_id, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  const users = usersRes.data ?? []
  const creators = creatorsRes.data ?? []
  const projects = projectsRes.data ?? []
  const transactions = transactionsRes.data ?? []

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '28px' }}>管理画面</div>

        {/* サマリー */}
        <div className="admin-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '36px' }}>
          {[
            { label: 'ユーザー', value: users.length },
            { label: 'クリエイター', value: creators.length },
            { label: 'プロジェクト', value: projects.length },
            { label: '決済件数', value: transactions.filter(t => t.type === 'purchase').length },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--pink)' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* クリエイター審査 */}
        <Section title="クリエイター審査">
          {creators.filter(c => c.status === 'pending').length === 0 ? (
            <Empty text="審査待ちのクリエイターはいません。" />
          ) : (
            <Table
              headers={['名前', 'カテゴリ', '申請日', 'ステータス', '操作']}
              rows={creators.filter(c => c.status === 'pending').map(c => [
                c.name,
                c.category ?? '—',
                formatDate(c.created_at),
                <StatusBadge key={c.id} status={c.status} />,
                <CreatorReviewActions key={`act-${c.id}`} creatorId={c.id} />,
              ])}
            />
          )}
        </Section>

        {/* プロジェクト管理 */}
        <Section title="プロジェクト管理">
          {projects.length === 0 ? (
            <Empty text="プロジェクトがありません。" />
          ) : (
            <Table
              headers={['タイトル', '進捗', '目標', 'ステータス', '期限']}
              rows={projects.map(p => {
                const pct = p.goal_points > 0 ? Math.round((p.current_points / p.goal_points) * 100) : 0
                return [
                  p.title,
                  `${pct}%（${p.current_points.toLocaleString()} pt）`,
                  `${p.goal_points.toLocaleString()} pt`,
                  <StatusBadge key={p.id} status={p.status} />,
                  p.deadline ? formatDate(p.deadline) : '—',
                ]
              })}
            />
          )}
        </Section>

        {/* ユーザー管理 */}
        <Section title="ユーザー管理">
          <Table
            headers={['メール', '名前', '残高', '権限', '登録日']}
            rows={users.map(u => [
              u.email ?? '—',
              u.display_name ?? '—',
              `${(u.point_balance ?? 0).toLocaleString()} pt`,
              u.role ?? 'user',
              formatDate(u.created_at),
            ])}
          />
        </Section>

        {/* 決済ログ */}
        <Section title="決済ログ">
          {transactions.length === 0 ? (
            <Empty text="決済履歴がありません。" />
          ) : (
            <Table
              headers={['種別', '金額', 'Stripe Session', '日時']}
              rows={transactions.map(t => [
                t.type === 'purchase' ? '購入' : t.type === 'donation' ? '応援' : t.type === 'refund' ? '返還' : t.type,
                `${t.amount.toLocaleString()} pt`,
                t.stripe_session_id ? `${t.stripe_session_id.slice(0, 20)}…` : '—',
                formatDate(t.created_at),
              ])}
            />
          )}
        </Section>
      </main>
    </>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ja-JP')
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{title}</div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: '14px', color: 'var(--muted)', padding: '16px 0' }}>{text}</div>
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border)', color: 'var(--muted)', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'var(--teal-bg)', color: 'var(--teal)', label: '募集中' },
    succeeded: { bg: 'var(--pink-bg)', color: 'var(--pink)', label: '達成' },
    failed: { bg: 'var(--bg3)', color: 'var(--muted)', label: '未達成' },
    pending: { bg: 'var(--amber-bg)', color: 'var(--amber)', label: '審査中' },
    approved: { bg: 'var(--teal-bg)', color: 'var(--teal)', label: '承認済' },
    rejected: { bg: 'var(--bg3)', color: 'var(--muted)', label: '却下' },
  }
  const s = map[status] ?? { bg: 'var(--bg3)', color: 'var(--muted)', label: status }
  return (
    <span style={{ fontSize: '11px', fontWeight: '600', background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '99px' }}>
      {s.label}
    </span>
  )
}
