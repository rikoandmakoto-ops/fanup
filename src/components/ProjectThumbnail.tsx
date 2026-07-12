// プロジェクトのサムネイル。画像が未設定でも見栄えするフォールバックを描画する。
// - imageUrl があればそのまま画像表示
// - なければ seed から決定的にグラデーション・装飾絵文字を選び、タイトルを重ねた
//   OGP 風のカードを生成する（全プロジェクトが同じ絵文字にならないようにする）

const GRADIENTS = [
  'linear-gradient(135deg,#8B5CF6,#6D28D9)',
  'linear-gradient(135deg,#10B981,#047857)',
  'linear-gradient(135deg,#F59E0B,#B45309)',
  'linear-gradient(135deg,#EC4899,#BE185D)',
  'linear-gradient(135deg,#3B82F6,#1D4ED8)',
  'linear-gradient(135deg,#F43F5E,#9F1239)',
  'linear-gradient(135deg,#14B8A6,#0F766E)',
  'linear-gradient(135deg,#A855F7,#7E22CE)',
]

const CATEGORY_EMOJI: Record<string, string> = {
  音楽: '🎵',
  ゲーム: '🎮',
  コスメ: '💄',
  ファッション: '👗',
  アート: '🎨',
  料理: '🍳',
  旅行: '✈️',
  教育: '📚',
  その他: '✨',
}

// seed（uuid文字列 or 数値）から安定したインデックスを得る簡易ハッシュ
function hashSeed(seed: string | number): number {
  const s = String(seed)
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

type Props = {
  title: string
  category?: string
  seed: string | number
  variant?: 'card' | 'detail'
  imageUrl?: string | null
}

export default function ProjectThumbnail({ title, category, seed, variant = 'card', imageUrl }: Props) {
  const height = variant === 'detail' ? '260px' : '160px'
  const borderRadius = variant === 'detail' ? '16px' : '0'

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        style={{ width: '100%', height, objectFit: 'cover', borderRadius, display: 'block' }}
      />
    )
  }

  const h = hashSeed(seed)
  const gradient = GRADIENTS[h % GRADIENTS.length]
  const emoji = (category && CATEGORY_EMOJI[category]) || '💜'
  const titleSize = variant === 'detail' ? '22px' : '16px'
  const markSize = variant === 'detail' ? '20px' : '15px'

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius,
        background: gradient,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* 装飾用の大きな絵文字 */}
      <div
        style={{
          position: 'absolute',
          top: variant === 'detail' ? '-24px' : '-14px',
          right: variant === 'detail' ? '4px' : '-2px',
          fontSize: variant === 'detail' ? '150px' : '96px',
          opacity: 0.28,
          lineHeight: 1,
          transform: 'rotate(-8deg)',
          filter: 'grayscale(0.1)',
          userSelect: 'none',
        }}
      >
        {emoji}
      </div>

      {/* FanUp ブランドマーク */}
      <div
        style={{
          position: 'absolute',
          top: variant === 'detail' ? '16px' : '12px',
          left: variant === 'detail' ? '18px' : '14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: markSize,
          fontWeight: 700,
          color: '#fff',
          opacity: 0.95,
        }}
      >
        <span
          style={{
            width: '20px',
            height: '20px',
            background: 'rgba(255,255,255,0.25)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="#fff">
            <path d="M6 10.5C6 10.5 1 7 1 3.8A2.5 2.5 0 0 1 6 2.7 2.5 2.5 0 0 1 11 3.8C11 7 6 10.5 6 10.5z" />
          </svg>
        </span>
        FanUp
      </div>

      {/* タイトルを読ませるためのスクリム＋テキスト */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          padding: variant === 'detail' ? '48px 20px 18px' : '36px 16px 14px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 3px rgba(0,0,0,0.35)',
          }}
        >
          {title}
        </div>
      </div>
    </div>
  )
}
