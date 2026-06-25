import type { Metadata, Viewport } from 'next'
import { Inter, M_PLUS_Rounded_1c } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'FanUp — ファンクラブ クラウドファンディング',
  description: 'ポイントを買って好きなクリエイターに投げる。目標達成でチャンネルが開設される、新しい応援のかたち。',
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
      <body>
        {children}
      </body>
    </html>
  )
}
