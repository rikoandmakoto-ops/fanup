// FanUp テスト用 実データシードスクリプト
// 使い方: node scripts/seed.mjs
// service-role キーで auth ユーザー / creators / projects / donations を投入する。
// 冪等: 既存メールのユーザーは作り直さず再利用する。
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// .env.local を最小パース（dotenv 非依存）
const env = {}
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
} catch {}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const DAY = 86400000

// 既存メールなら再利用、無ければ作成して profile が出来るのを保証する
async function ensureUser(email, displayName, password) {
  // まず作成を試みる
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (created?.user) return created.user

  if (error && !/already|registered|exist/i.test(error.message)) {
    throw new Error(`createUser failed for ${email}: ${error.message}`)
  }

  // 既存ユーザーを listUsers から検索
  for (let page = 1; page <= 20; page++) {
    const { data, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)
    const found = data.users.find(u => u.email === email)
    if (found) return found
    if (data.users.length < 200) break
  }
  throw new Error(`既存ユーザーが見つかりません: ${email}`)
}

// profile 行が存在することを保証（トリガが効かない場合のフォールバック）
async function ensureProfile(user, displayName) {
  const { data } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!data) {
    await admin.from('profiles').insert({ id: user.id, email: user.email, display_name: displayName })
  }
}

async function ensureCreator(userId, c) {
  const { data: existing } = await admin
    .from('creators')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) {
    await admin.from('creators').update({ name: c.name, category: c.category, bio: c.bio, status: 'approved' }).eq('id', existing.id)
    return existing.id
  }
  const { data, error } = await admin
    .from('creators')
    .insert({ user_id: userId, name: c.name, category: c.category, bio: c.bio, status: 'approved' })
    .select('id')
    .single()
  if (error) throw new Error(`creator insert failed (${c.name}): ${error.message}`)
  return data.id
}

async function ensureProject(creatorId, p) {
  const { data: existing } = await admin
    .from('projects')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('title', p.title)
    .maybeSingle()
  const row = {
    creator_id: creatorId,
    title: p.title,
    description: p.description,
    goal_points: p.goal_points,
    current_points: p.current_points,
    deadline: new Date(Date.now() + p.days * DAY).toISOString(),
    status: 'active',
    platform_fee_rate: 0.3,
  }
  if (existing) {
    await admin.from('projects').update(row).eq('id', existing.id)
    return existing.id
  }
  const { data, error } = await admin.from('projects').insert(row).select('id').single()
  if (error) throw new Error(`project insert failed (${p.title}): ${error.message}`)
  return data.id
}

// ---- シードデータ ----
const PW = 'FanUpSeed!2026'

const creators = [
  {
    email: 'akari.creator@fanup.test',
    name: 'あかり',
    category: '音楽・弾き語り',
    bio: 'ギター弾き語り歴5年。やさしい歌声で日常に寄り添う音楽をお届けします。カバーからオリジナルまで、月に数本ずつ配信中。',
    project: {
      title: '弾き語りチャンネルを開設して音楽の世界を広げたい',
      description:
        'ギターの弾き語りを5年続けてきました。自宅録音から本格的な配信へとステップアップするため、専用のファンクラブチャンネルを開設したいと考えています。\n\n月に最低4本の演奏動画と、月1回のライブ配信を予定しています。チャンネル開設後は限定コンテンツも随時公開していきます。皆さんの応援が大きな力になります！',
      goal_points: 100000,
      current_points: 82000,
      days: 18,
    },
  },
  {
    email: 'kenta.creator@fanup.test',
    name: 'けんた',
    category: 'ゲーム実況・エンタメ',
    bio: 'RPGからFPSまで何でも実況するゲーマー。視聴者と一緒に盛り上がる毎日配信を目指しています。',
    project: {
      title: 'ゲーム実況チャンネルで毎日配信を届けたい',
      description:
        'RPGからFPSまで幅広いジャンルのゲームを実況しています。毎日1本以上の動画投稿を目標に、視聴者と一緒に楽しめるチャンネルを作りたいと思っています。\n\n機材を強化して配信のクオリティを上げ、月に1度は視聴者参加型のオンライン大会も開催予定です。応援よろしくお願いします！',
      goal_points: 120000,
      current_points: 54000,
      days: 25,
    },
  },
  {
    email: 'miki.creator@fanup.test',
    name: 'みき',
    category: 'ファッション・コスメ',
    bio: 'プチプラからデパコスまで、忖度なしのリアルレビューが信条。日常をちょっと楽しくするコスメ・ファッション情報を発信中。',
    project: {
      title: 'コスメ・ファッションの本音レビューを発信したい',
      description:
        'プチプラからデパコスまで、忖度なしのリアルなレビューをお届けしたいと思っています。ファッションも含め、日常をもっと楽しくするコンテンツを発信していきます。\n\n撮影機材と照明を揃えて、色味が正確に伝わる動画レビューを制作します。フォロワーさんからのリクエスト企画も実施予定です。',
      goal_points: 80000,
      current_points: 48000,
      days: 12,
    },
  },
]

async function main() {
  // 支援デモ用のサポーターを1人用意
  const supporter = await ensureUser('supporter@fanup.test', 'たろう', PW)
  await ensureProfile(supporter, 'たろう')
  // サポーターに残高を付与（重複加算を避けるため一定値にセット）
  await admin.from('profiles').update({ point_balance: 50000 }).eq('id', supporter.id)

  for (const c of creators) {
    const user = await ensureUser(c.email, c.name, PW)
    await ensureProfile(user, c.name)
    const creatorId = await ensureCreator(user.id, c)
    const projectId = await ensureProject(creatorId, c.project)
    console.log(`✓ ${c.name} (creator ${creatorId}) / project ${projectId}`)

    // 各プロジェクトに、サポーターからのデモ支援を1件用意（冪等）
    const { data: existingDon } = await admin
      .from('donations')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', supporter.id)
      .maybeSingle()
    if (!existingDon) {
      await admin.from('donations').insert({
        user_id: supporter.id,
        project_id: projectId,
        points: 5000,
        status: 'completed',
      })
    }
  }

  console.log('\nシード完了。ログイン用パスワードは全アカウント共通:', PW)
  console.log('クリエイター: akari/kenta/miki.creator@fanup.test, サポーター: supporter@fanup.test')
}

main().catch(err => {
  console.error('シード失敗:', err)
  process.exit(1)
})
