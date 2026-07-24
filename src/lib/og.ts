// next/og の ImageResponse で日本語を描画するためのフォントローダー。
//
// satori（ImageResponse の内部エンジン）は woff2 に非対応で、標準フォントに
// 日本語グリフを持たないため、そのままでは日本語が豆腐（□）になる。
// そこで Google Fonts CSS2 API に text= を付けて「使う文字だけ」をサブセット化した
// ttf を取得し、軽量なフォントバッファを ImageResponse に渡す。
//
// 古い User-Agent を送ると Google Fonts が woff2 ではなく ttf(truetype) を返すため、
// satori がそのまま扱える。

// OG 画像で常に登場する固定ラベル文字。タイトルと結合してサブセット対象にする。
const STATIC_GLYPHS =
  'FanUpファンクラブクラウドファンディング目標達成でチャンネルが開設される新しい応援のかたち' +
  '残り日達成成立募集中全額返金方式目標支援者現在pt円ポイント％%・、。／/,.-0123456789'

// M PLUS Rounded 1c の指定ウェイトを、text で指定した文字だけサブセットして ttf で取得する。
export async function loadRoundedFont(
  text: string,
  weight: 400 | 500 | 700 = 700
): Promise<ArrayBuffer | null> {
  // 重複を除いた文字集合（サブセットを最小化）
  const chars = Array.from(new Set((STATIC_GLYPHS + text).split(''))).join('')
  const family = 'M PLUS Rounded 1c'
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}` +
    `&text=${encodeURIComponent(chars)}`

  try {
    const cssRes = await fetch(cssUrl, {
      headers: {
        // 古い UA を偽装して ttf(truetype) を返させる（woff2 は satori 非対応）
        'User-Agent':
          'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0 Safari/537.36',
      },
    })
    if (!cssRes.ok) return null
    const css = await cssRes.text()

    // src: url(...) format('truetype') を抜き出す
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)
    if (!match) return null

    const fontRes = await fetch(match[1])
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    // フォント取得に失敗しても OG 画像自体は（豆腐になるが）生成を続ける
    return null
  }
}
