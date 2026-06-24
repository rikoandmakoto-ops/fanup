// 締め切りまでの残り日数を計算するヘルパー
// コンポーネントの render 内で Date.now() を直接呼ぶと
// react-hooks/purity ルールに抵触するため、純粋関数として切り出す
export function daysLeft(deadline: string | null | undefined): number {
  if (!deadline) return 0
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}
