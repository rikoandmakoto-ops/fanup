'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { daysLeft } from '@/lib/date'

type Props = {
  projectId: string
  initialTitle: string
  initialDescription: string
  initialGoal: number
  deadline: string | null
  hasDonations: boolean
  editable: boolean
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--text)',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '500',
  color: 'var(--muted)',
  marginBottom: '5px',
} as const

// 締め切りプリセット（既存の new ページと揃える + 延長用に 90 を追加）
const extendPresets = [7, 14, 30, 60, 90]

export default function ProjectEditForm({ projectId, initialTitle, initialDescription, initialGoal, deadline, hasDonations, editable }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [goal, setGoal] = useState(String(initialGoal))
  // 締め切りは「今日から N 日後」で再設定する。0 = 変更しない
  const [extendDays, setExtendDays] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  // 目標・締め切りは支援が入る前のみ変更可（All-or-Nothing の公平性のため）
  const lockGoalDeadline = hasDonations
  const currentDaysLeft = daysLeft(deadline)

  const dirty =
    title.trim() !== initialTitle ||
    description.trim() !== initialDescription ||
    (!lockGoalDeadline && Number(goal) !== initialGoal) ||
    extendDays > 0

  const handleSave = async () => {
    setError('')
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!description.trim()) return setError('説明文を入力してください')

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
    }
    if (!lockGoalDeadline) {
      const goalNum = parseInt(goal)
      if (!goalNum || goalNum < 1000) return setError('目標ポイントは1,000以上で指定してください')
      body.goal_points = goalNum
      if (extendDays > 0) body.deadline_days = extendDays
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/creator/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) return setError(data.error ?? '保存に失敗しました')
      setDone(true)
      setExtendDays(0)
      setTimeout(() => setDone(false), 2500)
      router.refresh()
    } catch {
      setLoading(false)
      setError('ネットワークエラーが発生しました')
    }
  }

  if (!editable) {
    return (
      <div className="card" style={{ padding: '20px 22px', fontSize: '14px', color: 'var(--muted)' }}>
        募集が終了したプロジェクトは編集できません。
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* タイトル */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>タイトル</label>
        <input type="text" value={title} maxLength={80} onChange={e => { setTitle(e.target.value); setError('') }} style={inputStyle} />
        <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginTop: '4px' }}>{title.length} / 80</div>
      </div>

      {/* 説明 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>プロジェクトの説明</label>
        <textarea value={description} maxLength={4000} rows={8} onChange={e => { setDescription(e.target.value); setError('') }} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', marginTop: '4px' }}>{description.length} / 4000</div>
      </div>

      {/* 目標ポイント */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>目標ポイント</label>
        <input type="number" value={goal} min="1000" max="10000000" disabled={lockGoalDeadline} onChange={e => { setGoal(e.target.value); setError('') }} style={{ ...inputStyle, opacity: lockGoalDeadline ? 0.6 : 1, cursor: lockGoalDeadline ? 'not-allowed' : 'text' }} />
      </div>

      {/* 締め切り */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>締め切り {!lockGoalDeadline && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>（現在 残り{currentDaysLeft}日）</span>}</label>
        {lockGoalDeadline ? null : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setExtendDays(0)} style={presetStyle(extendDays === 0)}>変更しない</button>
            {extendPresets.map(d => (
              <button key={d} type="button" onClick={() => { setExtendDays(d); setError('') }} style={presetStyle(extendDays === d)}>今日から{d}日</button>
            ))}
          </div>
        )}
      </div>

      {/* 支援後ロックの説明 */}
      {lockGoalDeadline && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid #fad898', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--amber)' }}>目標・締め切りは変更できません</strong><br />
          すでに支援が入っているため、All-or-Nothing の公平性を保つためロックされています。タイトル・説明文は編集できます。
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '14px' }}>{error}</div>
      )}
      {done && (
        <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--teal)', fontWeight: '600', marginBottom: '14px' }}>保存しました</div>
      )}

      <button onClick={handleSave} disabled={loading || !dirty} style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: loading || !dirty ? 'not-allowed' : 'pointer', opacity: loading || !dirty ? 0.5 : 1 }}>
        {loading ? '保存中...' : '変更を保存する'}
      </button>
    </div>
  )
}

function presetStyle(active: boolean) {
  return {
    background: active ? 'var(--primary-light)' : 'var(--bg3)',
    border: `1px solid ${active ? 'var(--primary-border)' : 'var(--border)'}`,
    color: active ? 'var(--primary)' : 'var(--muted)',
    padding: '8px 14px',
    borderRadius: '99px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
  } as const
}
