'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  projectId: string
  initialUrl: string | null
}

const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']

export default function VideoUpload({ projectId, initialUrl }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const pickFile = () => inputRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setDone(false)
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED.includes(file.type)) {
      setError('対応形式は mp4 / webm / mov / ogg です')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('ファイルサイズは50MB以下にしてください')
      e.target.value = ''
      return
    }

    const body = new FormData()
    body.append('file', file)

    setUploading(true)
    try {
      const res = await fetch(`/api/creator/projects/${projectId}/video`, { method: 'POST', body })
      const data = await res.json()
      setUploading(false)
      e.target.value = ''
      if (!res.ok) return setError(data.error ?? 'アップロードに失敗しました')
      // キャッシュ回避のためクエリを付与して即時反映
      setUrl(`${data.url}?t=${Date.now()}`)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
      router.refresh()
    } catch {
      setUploading(false)
      e.target.value = ''
      setError('ネットワークエラーが発生しました')
    }
  }

  const handleDelete = async () => {
    setError('')
    setDone(false)
    if (!confirm('動画を削除しますか？')) return
    setUploading(true)
    try {
      const res = await fetch(`/api/creator/projects/${projectId}/video`, { method: 'DELETE' })
      const data = await res.json()
      setUploading(false)
      if (!res.ok) return setError(data.error ?? '削除に失敗しました')
      setUrl(null)
      router.refresh()
    } catch {
      setUploading(false)
      setError('ネットワークエラーが発生しました')
    }
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {url ? (
        <div style={{ marginBottom: '16px' }}>
          <video
            key={url}
            src={url}
            controls
            playsInline
            style={{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '420px' }}
          />
        </div>
      ) : (
        <div style={{
          border: '1.5px dashed var(--border)',
          borderRadius: '12px',
          padding: '36px 20px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          まだ動画がアップロードされていません。<br />
          プロジェクトを紹介する動画を追加しましょう。
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '14px' }}>{error}</div>
      )}
      {done && (
        <div style={{ background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--teal)', fontWeight: '600', marginBottom: '14px' }}>アップロードしました</div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={pickFile}
          disabled={uploading}
          style={{
            flex: 1,
            minWidth: '160px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '99px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'アップロード中...' : url ? '動画を差し替える' : '動画をアップロード'}
        </button>
        {url && !uploading && (
          <button
            onClick={handleDelete}
            style={{
              background: 'var(--bg3)',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: '99px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            削除
          </button>
        )}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', lineHeight: '1.6' }}>
        対応形式: mp4 / webm / mov / ogg ・ 最大50MB ・ 1プロジェクトにつき1本
      </div>
    </div>
  )
}
