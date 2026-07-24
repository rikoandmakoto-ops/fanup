import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/url'

// robots.txt をコードから生成する（Next.js のファイル規約）。
// 認証・管理・API・マイページなど、クロール不要／非公開の領域を除外する。
export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/mypage', '/login', '/signup', '/reset-password'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
