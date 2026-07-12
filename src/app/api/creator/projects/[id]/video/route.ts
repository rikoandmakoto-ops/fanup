import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VIDEO_BUCKET } from '@/lib/video'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB（バケットの上限と揃える）
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
const EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
}

// 所有クリエイターかどうかを検証し、creator/project を返す
async function authorize(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'ログインが必要です' }, { status: 401 }) }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!creator) return { error: NextResponse.json({ error: 'クリエイター申請が必要です' }, { status: 403 }) }

  const { data: project } = await supabase
    .from('projects')
    .select('id, creator_id')
    .eq('id', id)
    .maybeSingle()
  if (!project || project.creator_id !== creator.id) {
    return { error: NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 }) }
  }
  return { projectId: project.id as string }
}

// フォルダ内の既存ファイルを全削除（1動画運用のため入れ替え時に掃除する）
async function clearFolder(admin: ReturnType<typeof createAdminClient>, projectId: string) {
  const { data } = await admin.storage.from(VIDEO_BUCKET).list(projectId)
  if (data && data.length > 0) {
    await admin.storage.from(VIDEO_BUCKET).remove(data.map(f => `${projectId}/${f.name}`))
  }
}

// 動画アップロード
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(id)
  if (auth.error) return auth.error
  const projectId = auth.projectId!

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '動画ファイルが必要です' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: '対応形式は mp4 / webm / mov / ogg です' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'ファイルサイズは50MB以下にしてください' }, { status: 400 })
  }

  const admin = createAdminClient()
  await clearFolder(admin, projectId)

  const ext = EXT[file.type] ?? 'mp4'
  const path = `${projectId}/video.${ext}`
  const { error } = await admin.storage.from(VIDEO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) {
    console.error('VideoUpload: upload failed', error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(VIDEO_BUCKET).getPublicUrl(path)
  return NextResponse.json({ success: true, url: pub.publicUrl })
}

// 動画削除
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(id)
  if (auth.error) return auth.error
  const projectId = auth.projectId!

  const admin = createAdminClient()
  await clearFolder(admin, projectId)
  return NextResponse.json({ success: true })
}
