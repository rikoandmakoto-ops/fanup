import { ImageResponse } from 'next/og'
import { loadRoundedFont } from '@/lib/og'

// サイト全体の既定 OG 画像（SNS シェア時のブランドカード）。
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'FanUp — ファンクラブ クラウドファンディング'

export default async function Image() {
  const catch1 = '目標達成で、チャンネルが開設される。'
  const catch2 = '新しい応援のかたち。'
  const font = await loadRoundedFont(catch1 + catch2)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #4C1D95 100%)',
          color: '#fff',
          fontFamily: font ? 'Rounded' : 'sans-serif',
          padding: '0 80px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: '-0.03em', display: 'flex' }}>
          FanUp
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#F5F3FF',
          }}
        >
          <span>{catch1}</span>
          <span>{catch2}</span>
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 26,
            fontWeight: 500,
            padding: '10px 28px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.4)',
            display: 'flex',
          }}
        >
          All-or-Nothing方式 ・ 未達なら全額返金
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Rounded', data: font, weight: 700, style: 'normal' }] : undefined,
    }
  )
}
