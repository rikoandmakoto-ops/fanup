import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/url'
import { createAdminClient } from '@/lib/supabase/admin'

// sitemap.xml を動的生成する（Next.js のファイル規約）。
// 静的ページ＋公開中のプロジェクト／承認済みクリエイターを列挙し、SEO のクロールを助ける。
// リクエストコンテキスト外で走るため、cookie ベースの client ではなく admin client で読む。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl()

  // 静的な公開ページ
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/projects`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/creators`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/buy-points`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // DB から公開対象を取得（失敗しても静的ページ分だけは返す）
  try {
    const supabase = createAdminClient()

    const [{ data: projects }, { data: creators }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, created_at')
        .in('status', ['active', 'succeeded'])
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('creators')
        .select('id, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    const projectRoutes: MetadataRoute.Sitemap = (projects ?? []).map(p => ({
      url: `${base}/projects/${p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: 'daily',
      priority: 0.7,
    }))

    const creatorRoutes: MetadataRoute.Sitemap = (creators ?? []).map(c => ({
      url: `${base}/creators/${c.id}`,
      lastModified: new Date(c.created_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    return [...staticRoutes, ...projectRoutes, ...creatorRoutes]
  } catch {
    return staticRoutes
  }
}
