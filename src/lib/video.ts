import { createAdminClient } from '@/lib/supabase/admin'

// プロジェクト動画を保存する Storage バケット名。
// public バケットのため、保存後の公開URLは決め打ちで生成できる。
export const VIDEO_BUCKET = 'project-videos'

// 1プロジェクト1動画とし、フォルダ `${projectId}/` 配下に1ファイルだけ置く運用。
// DB にカラムを追加せず、ストレージのパス規約だけで動画を紐づける。
export async function getProjectVideoUrl(projectId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(VIDEO_BUCKET).list(projectId, { limit: 1 })
  if (error || !data || data.length === 0) return null
  const file = data[0]
  const { data: pub } = admin.storage.from(VIDEO_BUCKET).getPublicUrl(`${projectId}/${file.name}`)
  return pub.publicUrl
}
