import type { Metadata, Viewport } from 'next'
import { Inter, M_PLUS_Rounded_1c } from 'next/font/google'
import './globals.css'
import Footer from '@/components/layout/Footer'
import { getAppUrl } from '@/lib/url'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-inter',
})

const mPlusRounded = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-rounded',
})

const siteName = 'FanUp'
const siteTitle = 'FanUp — ファンクラブ クラウドファンディング'
const siteDescription =
  'ポイントを買って好きなクリエイターに投げる。目標達成でチャンネルが開設される、新しい応援のかたち。All-or-Nothing方式で未達なら全額返金。'

export const metadata: Metadata = {
  // OG/Twitter 画像や canonical を絶対 URL に解決するための基準
  metadataBase: new URL(getAppUrl()),
  title: {
    default: siteTitle,
    // 各ページで title を指定すると「◯◯ | FanUp」になる
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'FanUp',
    'ファンクラブ',
    'クラウドファンディング',
    'クリエイター支援',
    '投げ銭',
    'All-or-Nothing',
    'VTuber',
    'YouTube',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: '/',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${mPlusRounded.variable}`}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
        <Footer />
      </body>
    </html>
  )
}
