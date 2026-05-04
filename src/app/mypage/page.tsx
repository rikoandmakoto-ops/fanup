import Header from '@/components/layout/Header'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, point_balance')
    .eq('id', user.id)
    .single()

  const { data: purchases } = await supabase
    .from('point_transactions')
    .select('id, type, amount, created_at, related_project_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: donations } = await supabase
    .from('donations')
    .select('id, points, created_at, project_id, projects(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const balance = profile?.point_balance ?? 0
  const displayName = profile?.display_name || profile?.email || 'ユーザー'

  return (
    <>
      <Header />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>マイページ</div>

        {/* プロフィール・残高 */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{displayName}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{profile?.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>保有ポイント</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--pink)' }}>{balance.toLocaleString()} <span style={{ fontSize: '14px' }}>pt</span></div>
            <Link href="/buy-points" style={{
              display: 'inline-block',
              marginTop: '8px',
              background: 'var(--pink)',
              color: '#fff',
              padding: '7px 18px',
              borderRadius: '99px',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              ポイント購入
            </Link>
          </div>
        </div>

        {/* 購入履歴 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>購入履歴</div>
          {!purchases || purchases.length === 0 ? (
            <div style={{ fontSize: '14px', color: 'var(--muted)', padding: '20px 0' }}>まだ購入履歴がありません。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {purchases.map(tx => (
                <div key={tx.id} style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                      {tx.type === 'purchase' ? 'ポイント購入' : tx.type === 'donation' ? '応援' : tx.type === 'refund' ? '返還' : tx.type}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      {new Date(tx.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: tx.type === 'purchase' || tx.type === 'refund' ? 'var(--teal)' : 'var(--pink)',
                  }}>
                    {tx.type === 'purchase' || tx.type === 'refund' ? '+' : '-'}{tx.amount.toLocaleString()} pt
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 応援履歴 */}
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>応援履歴</div>
          {!donations || donations.length === 0 ? (
            <div style={{ fontSize: '14px', color: 'var(--muted)', padding: '20px 0' }}>まだ応援履歴がありません。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {donations.map(d => {
                const projectRaw = d.projects as unknown as { title: string } | { title: string }[] | null
                const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw
                return (
                  <Link key={d.id} href={`/projects/${d.project_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {project?.title ?? `プロジェクト #${d.project_id}`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          {new Date(d.created_at).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--pink)' }}>
                        {d.points.toLocaleString()} pt
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
