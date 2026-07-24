import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import { daysLeft } from '@/lib/date'
import { loadRoundedFont } from '@/lib/og'

// プロジェクトごとの動的 OG 画像。進捗バー・達成率・残り日数を可視化する。
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'FanUp プロジェクト'

// フォールバックデータ（DB 未接続時のデモ 3 件）と最低限整合させる
const fallback: Record<string, { title: string; creator: string; category: string; pct: number; raised: number; goal: number; days: number }> = {
  '1': { title: '弾き語りチャンネルを開設して音楽の世界を広げたい', creator: 'あかり', category: '音楽・弾き語り', pct: 82, raised: 82000, goal: 100000, days: 8 },
  '2': { title: 'ゲーム実況チャンネルで毎日配信を届けたい', creator: 'けんた', category: 'ゲーム実況・エンタメ', pct: 45, raised: 45000, goal: 100000, days: 21 },
  '3': { title: 'コスメ・ファッションの本音レビューを発信したい', creator: 'みき', category: 'ファッション・コスメ', pct: 60, raised: 60000, goal: 100000, days: 14 },
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // DB から取得（失敗・不在時はフォールバック、それも無ければブランド既定値）
  let title = 'FanUp プロジェクト'
  let creator = ''
  let category = ''
  let pct = 0
  let raised = 0
  let goal = 0
  let days = 0
  let status = 'active'

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('projects')
      .select('title, goal_points, current_points, deadline, status, creators(name, category)')
      .eq('id', id)
      .single()

    if (data) {
      const c = data.creators as unknown as { name: string; category: string } | { name: string; category: string }[] | null
      const cc = Array.isArray(c) ? c[0] : c
      title = data.title
      creator = cc?.name ?? ''
      category = cc?.category ?? ''
      goal = data.goal_points
      raised = data.current_points
      pct = goal > 0 ? Math.round((raised / goal) * 100) : 0
      days = daysLeft(data.deadline)
      status = data.status
    } else if (fallback[id]) {
      const f = fallback[id]
      title = f.title; creator = f.creator; category = f.category; pct = f.pct; raised = f.raised; goal = f.goal; days = f.days
    }
  } catch {
    if (fallback[id]) {
      const f = fallback[id]
      title = f.title; creator = f.creator; category = f.category; pct = f.pct; raised = f.raised; goal = f.goal; days = f.days
    }
  }

  const succeeded = status === 'succeeded' || pct >= 100
  const statusLabel = status === 'failed' ? '募集終了' : succeeded ? '達成' : '募集中'
  const barPct = Math.min(pct, 100)

  const fontText = title + creator + category + statusLabel + '目標残り日達成率支援pt現在'
  const [bold, medium] = await Promise.all([
    loadRoundedFont(fontText, 700),
    loadRoundedFont(fontText, 500),
  ])
  const fonts = [
    ...(bold ? [{ name: 'Rounded', data: bold, weight: 700 as const, style: 'normal' as const }] : []),
    ...(medium ? [{ name: 'Rounded', data: medium, weight: 500 as const, style: 'normal' as const }] : []),
  ]
  const fam = fonts.length ? 'Rounded' : 'sans-serif'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          fontFamily: fam,
          padding: '64px 72px',
          justifyContent: 'space-between',
        }}
      >
        {/* ヘッダー：ロゴ + ステータス */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 44, fontWeight: 700, color: '#7C3AED', letterSpacing: '-0.02em' }}>
            FanUp
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              color: succeeded ? '#059669' : '#7C3AED',
              background: succeeded ? '#ECFDF5' : '#F5F3FF',
              border: `2px solid ${succeeded ? '#6EE7B7' : '#C4B5FD'}`,
              padding: '8px 24px',
              borderRadius: 999,
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* クリエイター + タイトル */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(creator || category) && (
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, color: '#7C3AED', marginBottom: 18 }}>
              {creator ? `${creator}さん` : ''}{creator && category ? ' ・ ' : ''}{category}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              fontWeight: 700,
              color: '#171717',
              lineHeight: 1.3,
              // 3 行程度で収める
              maxHeight: 240,
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
        </div>

        {/* 進捗エリア */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: 72, fontWeight: 700, color: '#7C3AED' }}>{pct}</span>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#7C3AED', marginLeft: 4 }}>%</span>
              <span style={{ fontSize: 30, fontWeight: 500, color: '#525252', marginLeft: 24 }}>
                {raised.toLocaleString()} / {goal.toLocaleString()} pt
              </span>
            </div>
            {days > 0 && !succeeded && (
              <span style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: '#525252' }}>残り{days}日</span>
            )}
          </div>
          {/* バー */}
          <div style={{ display: 'flex', width: '100%', height: 26, background: '#F1F1F1', borderRadius: 999 }}>
            <div
              style={{
                display: 'flex',
                width: `${barPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  )
}
