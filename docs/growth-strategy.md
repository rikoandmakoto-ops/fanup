# FanUp 集客戦略プラン

> 作成日: 2026-06-27 / 対象: FanUp（ファンクラブ特化型クラウドファンディング）
> 連携資産: YouTube 2チャンネル（「リコとマコトのゆっくり日常科学」「ゆっくり異常存在SCPラボ」）+ ai-orchestrator（自律AI運用基盤）

---

## 0. エグゼクティブサマリー

FanUp は**双方向マーケットプレイス**（クリエイター ↔ ファン）であり、典型的な「鶏が先か卵が先か」問題を抱える。だが普通のスタートアップと違い、**運営者自身が登録者を持つYouTubeチャンネルを2つ保有している**。これが最大の非対称な強み＝コールドスタートを突破する「種火」になる。

したがって戦略の核は1つ:

> **既存YouTube 2チャンネルを「最初のクリエイター」として使い、自分のファンでFanUpの最初のプロジェクトを成立させ、そのループ（買う→投げる→達成→チャンネル開設）が回る証拠を作る。その実績を武器に他クリエイターを口説く。**

需要（ファン）と供給（クリエイター）のうち、**まず運営がコントロールできる供給側（=自分の2チャンネル）を1件成功させる**。ゼロから両側を集めようとしない。

そして集客の反復作業（SNS投稿、停滞プロジェクトの検知とテコ入れ、クリエイター審査、クロスプロモのタイミング判断）を、YouTube Growth と同じ ai-orchestrator の自律ループに `fanup-growth` objective として載せ、**人手をかけずに回す**。

---

## 1. 現状整理：機能・ターゲット・強み

### 1.1 FanUp とは（実装ベース）

| 項目 | 内容 |
|---|---|
| サービス | ファンクラブ特化型クラウドファンディング。「ポイントを買って好きなクリエイターに投げる。**目標達成でチャンネルが開設される**、新しい応援のかたち」 |
| 中核メカニズム | **All-or-Nothing**。プロジェクトが期限までに目標pt到達 → 成立（運営手数料30%、クリエイター70%）。未達 → 支援pt全額返金 |
| 通貨 | ポイント（1pt = ¥1）。Stripe決済で購入（最小500pt〜最大100万pt） |
| 収益源 | ①成立プロジェクトへの30%手数料 ②（決済差益） |
| 言語/対象 | 完全日本語。日本のクリエイター&ファン |
| 技術 | Next.js 16 / React 19 / Supabase(Auth+Postgres+RLS) / Stripe / Resend / Vercel |

### 1.2 実装の完成度（≈80%）

**動く**: 認証、クリエイター申請→管理者承認、プロジェクト作成、ポイント購入(Stripe checkout)、投げ銭(donate)、フォロー、残高台帳、プロジェクト期限切れcron（自動成立/失敗/返金）、メールテンプレ5種、利用規約/プライバシー。

**未設定・要対応（ローンチ前必須）**:
- Stripe 本番キー / `STRIPE_WEBHOOK_SECRET` 未設定 → **決済が本番で失敗する**
- `RESEND_API_KEY` 未設定 → メール通知が飛ばない（graceful degrade はする）
- `CRON_SECRET` 未設定 → 期限切れcronのエンドポイントが無防備
- 動画アップロード/再生（VideoUpload）が未完
- クリエイターへの**実際の出金（payout）機構が無い**（売上計算のみ。Stripe Connect等が必要）
- 検索・通知・コメント機能なし

> ⚠️ **集客の前に「最初の1人が課金して投げて成立する」までの導線が本番で完走することの検証が最優先。** 集めたトラフィックが決済エラーで死ぬのが最悪。

### 1.3 ターゲット（二面）

- **供給側（クリエイター）**: 新しいチャンネル/シリーズ/活動を始めたいが、先に資金と需要の確証が欲しい小〜中規模クリエイター。「やる前にファンに賛同してもらってから始める」モデルと相性が良い層 = VTuber、ゆっくり/解説系、同人音楽/イラスト、インディーゲーム、Vアーティスト。
- **需要側（ファン）**: 推しの「新しい挑戦」を後押ししたい層。返金保証があるので心理的ハードルが低い。

### 1.4 強み / 弱み

**強み**
1. **運営が登録者付きYouTubeチャンネルを2つ保有** ← 種火。CAC実質ゼロの初期トラフィック源。
2. All-or-Nothingの**返金保証**でファンの支援リスクが低い。
3. 「達成でチャンネルが開設」という**プロジェクト型 × ファンクラブ**のユニークな立ち位置（後述の競合と差別化）。
4. ai-orchestratorで**運用を自律AI化できる**＝小人数でも回せる。

**弱み / リスク**
1. 双方向マーケットの初期ゼロ供給・ゼロ需要。
2. 競合が厚い: pixiv FANBOX / Fantia / Ci-en / Enty（月額サブスク型）、CAMPFIRE / Makuake / GREEN FUNDING（プロジェクト型クラファン）。FanUpはこの**中間（ファンクラブ的クラファン）**だが、認知ゼロ。
3. 未デプロイ・決済/出金が未完。
4. ブランド/SEO/SNSプレゼンスが完全にゼロ。

### 1.5 競合ポジショニング

|  | 月額サブスク（FANBOX/Fantia/Ci-en） | プロジェクト型クラファン（CAMPFIRE/Makuake） | **FanUp** |
|---|---|---|---|
| 課金形態 | 継続課金 | 単発・目標額 | ポイント投げ + 目標額 |
| ファンのリスク | 解約まで継続 | リターン未達リスク | **未達は全額返金** |
| クリエイターの旨味 | 安定収入 | まとまった資金 | **需要検証してから開始**できる |
| 立ち位置 | 既にファンがいる人向け | 大型プロジェクト向け | **これから始める/小さく試す人向け** |

→ **差別化メッセージ**:「いきなり始めるな。ファンに賛同してもらってから始めよう。集まらなければ全額返金。」

---

## 2. 集客チャネル候補の洗い出し

| # | チャネル | 対象側 | 内容 |
|---|---|---|---|
| C1 | **保有YouTube 2ch**（コミュニティ投稿/概要欄/動画内CTA/固定コメント） | 需要+供給 | 既存登録者を最初のファンに変換。最初のプロジェクトの資金源 |
| C2 | **X（旧Twitter）** | 両面 | ゆっくり/SCP/解説/VTuberクラスタ。プロジェクト告知・進捗・達成報告 |
| C3 | **SEO/コンテンツ（note・ブログ）** | 供給 | 「ファンクラブ 始め方」「クラファン 比較」「ゆっくり 収益化」等で検索流入＋クリエイター教育 |
| C4 | **クリエイターコミュニティ**（Discord/ニコニコ/同人界隈） | 供給 | 直接スカウト・案件持ち込み |
| C5 | **クリエイター個別スカウト/コラボ** | 供給 | 中堅クリエイターに「あなたの新企画をFanUpで」と1on1提案 |
| C6 | **リファラル（紹介）** | 両面 | クリエイター→ファン、ファン→ファンの招待導線 |
| C7 | **PR/プレスリリース（PR TIMES・note運営記事）** | 認知 | ローンチ時・実績到達時のニュース化 |
| C8 | **TikTok / YouTube Shorts** | 需要 | 達成ドラマ・舞台裏を短尺で。拡散性 |
| C9 | **有料広告**（X Ads / YouTube / Google P-MAX） | 両面 | LTV/CACが見えてから。初期は最小 |
| C10 | **SCPコミュニティ/海外** | 需要 | SCPは世界規模のCC創作。ただし日本語限定なので当面は国内SCPファンのみ |

---

## 3. 各チャネルのコスト・効果・実現性評価

評価軸: コスト（💰低〜💰💰💰高）/ 初期効果 / 実現性（運営の現リソースで今すぐ回せるか）

| チャネル | コスト | 初期効果 | 実現性 | 自律AI化 | 総合判断 |
|---|:---:|:---:|:---:|:---:|---|
| **C1 保有YouTube** | 💰 | ★★★★★ | ◎即可 | ◎ | **最優先**。唯一のCACゼロ温かい流入。ここで成立実績を作る |
| **C2 X** | 💰 | ★★★★ | ◎即可 | ◎ | **最優先**。プロジェクトのライブ感を毎日発信。AIで運用可 |
| **C5 個別スカウト** | 💰💰(工数) | ★★★★ | ○ | △(下書きまで) | **高**。供給側の質を作る。実績ができてから本格化 |
| **C3 SEO/note** | 💰 | ★★★(遅効) | ○ | ◎(下書き) | **中**。中期の複利。AIで記事量産→人間が最終確認 |
| **C6 リファラル** | 💰(開発) | ★★★ | △(機能開発要) | ― | **中**。機能実装が前提。実装後は強力 |
| **C8 Shorts/TikTok** | 💰💰(制作) | ★★★ | △ | △ | **中**。既存ゆっくり制作力を転用できるなら強い |
| **C7 PR** | 💰 | ★★(瞬間) | ○ | △ | **中**。実績/節目に合わせて単発投下 |
| **C4 コミュニティ** | 💰(工数) | ★★ | △(規約注意) | × | **低〜中**。スパム認定リスク。地道 |
| **C9 有料広告** | 💰💰💰 | ★★(初期は赤字) | ○ | ○ | **後回し**。CAC/LTV確定後のスケール手段 |
| **C10 SCP海外** | 💰 | ★ | ×(言語) | ― | **保留**。多言語化したら再評価 |

---

## 4. 優先順位つき集客プラン（短期・中期・長期）

### フェーズ0（〜2週間）：ローンチ準備 ※集客の前提

集めたトラフィックを殺さないための最低限。**ここが終わるまで広告も大規模告知もしない。**

- [ ] Stripe本番キー + Webhook Secret 設定、決済→ポイント付与の本番E2E検証
- [ ] `RESEND_API_KEY` / `CRON_SECRET` 設定、メール到達・期限切れcron動作確認
- [ ] クリエイター出金（payout）の運用方針決定（当面は**手動振込**でも可。MVPなら売上を手動精算でも回る）
- [ ] 動画アップロード/再生の完成 or 当面はYouTube埋め込みで代替
- [ ] 本番ドメイン確定（`fanup-rouge.vercel.app` は仮。独自ドメイン推奨＝ブランド/SEO）
- [ ] OGP・LP・規約の最終チェック（SNSシェア時の見栄え）

### 短期（0–3ヶ月）：種火フェーズ — 「ループが回る証拠」を作る

**目標KPI**: 完走プロジェクト1–3件 / 課金ファンアカウント 100–500 / 最初の手数料収益発生

1. **【最優先】自分の2chを"最初のクリエイター"にする**（C1）
   - 既存チャンネルでFanUpにクリエイター登録 → **コンセプトに完全合致する第1号プロジェクト**を立てる。例:
     - 「リコとマコトの**新シリーズ制作費**クラファン（達成で◯◯編スタート）」
     - 「SCPラボ **長編/特別編 制作プロジェクト**（達成で限定エピソード公開）」
   - リターン/特典: 支援者名エンドロール掲載、早期視聴、テーマリクエスト権、限定後日談 等（YouTubeで提供できるものに限定＝出金リスク回避）
   - 導線: **コミュニティタブ投稿 / 動画内CTA・終了画面 / 概要欄リンク / 固定コメント**でFanUpプロジェクトへ送客
   - 狙い: ①ループの実証 ②最初のファンアカウント獲得 ③**他クリエイター勧誘用のケーススタディ**を量産

2. **X運用を立ち上げる**（C2）
   - FanUp公式アカウント開設。第1号プロジェクトの**毎日の進捗・達成カウントダウン・舞台裏**を発信（ライブ感が投げ銭を生む）
   - 2chの世界観（ゆっくり/SCP）と連動した投稿で既存クラスタに刺す

3. **ローンチnote記事**（C3 + C7）
   - 「なぜFanUpを作ったか」「All-or-Nothing×ファンクラブの思想」を運営者視点で。第1号プロジェクトへ送客＋SEO初期資産

4. **計測の土台**（後述のorchestrator観測APIにも使う）
   - 流入元別の登録/課金/投げ銭ファネルを記録（UTM + Supabaseイベント）

### 中期（3–9ヶ月）：供給拡張フェーズ — クリエイターを10–30人にする

**目標KPI**: アクティブクリエイター10–30 / 月次完走プロジェクト5–10件 / 月次GMV（流通額）の右肩上がり

1. **クリエイター個別スカウト**（C5）— 短期で作った成功事例を持って、ゆっくり/解説/VTuber/同人クラスタの**中堅クリエイターに1on1提案**。「あなたの新企画、ファンに賛同してもらってから始めませんか。集まらなければ全額返金なのでファンも安心」
2. **クロスプロモ**（C1×C5）— 保有2chで、FanUpで成立した他クリエイターの企画を紹介。プラットフォームの「顔」になる
3. **SEO/コンテンツエンジン**（C3）— クリエイター教育記事を継続量産（「ファンクラブの作り方」「クラファン目標額の決め方」「投げ銭で稼ぐには」）。orchestratorで下書き→人間が確認・公開
4. **リファラル機能を実装**（C6）— クリエイターが自分のファンを連れてくる導線（招待リンク・成立時ボーナス）。マーケットの自己増殖エンジン
5. **Shorts/TikTok**（C8）— 「達成の瞬間」「クリエイターの裏側」を短尺化。既存のゆっくり制作パイプラインを転用

### 長期（9–24ヶ月）：スケールフェーズ

**目標KPI**: CAC < LTV が安定 / カテゴリ横展開 / 有料広告で黒字スケール

1. **有料広告**（C9）— 中期で確定したLTV/CACに基づきX Ads / YouTube / P-MAXへ。勝ちクリエイター×勝ち訴求のみに投下
2. **PR第2波**（C7）— 「累計流通額◯円突破」「成立件数◯件」等の節目でPR TIMES
3. **カテゴリ/地域拡張** — 音楽・アート・教育など横展開。多言語化を検討すれば**C10（SCP等の海外CCファンダム）**が開く
4. **プラットフォーム機能深化** — 検索・通知・コメント・クリエイターダッシュボード強化でリテンション底上げ

### 優先順位ワンライナー

> **フェーズ0（決済を完走させる）→ 自分の2chで1件成立させる（C1+C2）→ その実績でクリエイターを口説く（C5）→ コンテンツ/リファラルで複利を効かせる（C3+C6）→ 数字が立ったら広告でスケール（C9）。**

---

## 5. YouTube 2チャンネル連携プラン（詳細）

2チャンネルは「集客チャネル」であると同時に「FanUpの最初のプロダクトショーケース」。3つの役割を持たせる。

| 役割 | 具体策 |
|---|---|
| **① 第1号クリエイター（ドッグフーディング）** | 各chでFanUpプロジェクトを立て、自分のファンで成立させる。コンセプト「達成でチャンネル/シリーズ開設」に完全合致 |
| **② 送客チャネル** | コミュニティ投稿・動画内CTA・終了画面・概要欄・固定コメントからFanUpへ。ゆっくり動画の冒頭/末尾に15秒の告知パートを差し込む |
| **③ ショーケース/勧誘材料** | 「ゆっくりチャンネルがFanUpで◯◯円集めた」実績が、他クリエイターへの最強の営業資料になる |

**特典設計の原則**: 出金機構が未完なので、当面のリターンは**YouTube上で提供できるデジタル特典**に限定（エンドロール掲載・早期公開・リクエスト権・限定後日談・メイキング公開）。物理リターンや高額金銭リターンは出金フロー確立後。

**コンテンツ連動アイデア**:
- 「日常科学」→ 視聴者投票で次テーマを決める**研究シリーズの制作費**プロジェクト
- 「SCPラボ」→ **長編/オリジナルSCP映像化**プロジェクト。SCP国内ファンの熱量を投げ銭に変換
- 達成の瞬間をライブ配信 or 動画化 → それ自体がFanUpのコンテンツ＆拡散ネタ

---

## 6. ai-orchestrator `fanup-growth` objective 設計案

### 6.1 設計思想：YouTube Growth との根本的な違い

| | youtube-growth | **fanup-growth** |
|---|---|---|
| 仕事の性質 | **運用**（マシンを止めず投稿し続ける） | **成長/集客 + 運用監視**（人を集め、ループを止めない） |
| 最重要KPI | 各ch 1日2本投稿 | 流入→登録→課金→投げ銭→成立 のファネルを前進させる |
| 接続先 | YF（HTTP API, localhost:8000） | FanUp（**現状APIなし** → 薄い観測APIを追加） |
| アクション | 投稿発火・テーマ補充 | プロジェクトのテコ入れ告知・クリエイター審査・SNS下書き |

YouTube Growthと同じ「観測→思考→行動→確認」ループ・memory・watchdog・launchdをそのまま流用できる。**コア（orchestrator/）は一切触らず、objective + tools + config を足すだけ**で済む（既存の登録機構に完全準拠）。

### 6.2 前提：FanUp側に「観測/操作API」を薄く足す

orchestratorはFanUpを内部importしない（YFと同じ思想＝疎結合）。FanUpに `Bearer ORCH_SECRET` で叩く専用ルートを追加する。既存の `src/lib/supabase/admin.ts`（service role）をそのまま使えるので実装は軽い。

```
src/app/api/orchestrator/
  metrics/route.ts      GET  : signups(日次), 課金ユーザー数, GMV, アクティブPJ数, ファネル変換率
  projects/route.ts     GET  : 進行中PJ一覧（達成率, 残日数, 直近投げ銭速度）→「停滞」検知用
  creators/route.ts     GET  : pending審査待ち一覧
  creators/[id]/review  POST : approve/reject（管理者自動審査）
```

> 注意: orchestratorは**お金を動かさない・規約/法務判断はしない**。出金・返金・課金まわりは必ず `notify_user` で人間に上げる（YouTube Growthが「UI再認証が必要」を人間に上げるのと同じ規律）。

### 6.3 objective プラグイン本体

`ai-orchestrator/src/objectives/fanup_growth.py`（既存 `youtube_growth.py` と同形）:

```python
"""FanUp 集客・成長の目的プラグイン。"""

from objectives.base import Objective, ObjectiveContext, register
from tools.base import Tool
from tools.memory_tools import build_memory_tools
from tools.notify import build_notify_tool
from tools.shell import SHELL_TOOL
from tools.fanup import FanUpClient, build_fanup_tools          # 新規
from tools.social import build_social_draft_tools              # 新規(SNS下書き)

MISSION = (
    "FanUp（ファンクラブ特化型クラウドファンディング）を着実に成長させる。\n"
    "最重要KPIは『流入→登録→課金→投げ銭→プロジェクト成立』のファネルを前に進めること。\n"
    "短期は、保有YouTube 2チャンネル発の第1号プロジェクトを"
    "確実に成立(All-or-Nothing達成)させること。\n"
    "中期は、停滞プロジェクトの早期検知とテコ入れ、クリエイター審査の滞留解消、"
    "SNS/コンテンツによる継続送客で、月次の成立件数と流通額(GMV)を伸ばす。"
)

GUIDANCE = (
    "# 毎サイクルの基本動作\n"
    "1. fanup_health で疎通確認。落ちていれば notify_user で通知し深追いしない。\n"
    "2. fanup_metrics で当日の登録/課金/GMV/ファネル変換率を観測する。\n"
    "3. fanup_projects で進行中プロジェクトの達成率・残日数・直近の投げ銭速度を把握する。\n"
    "\n# 停滞プロジェクトのテコ入れ（最重要KPI直結）\n"
    "- 残日数が少ないのに達成率が低いPJ、または投げ銭速度が鈍化したPJを『要テコ入れ』と判断。\n"
    "- まず social_draft_post で告知/カウントダウン文面を生成し、状況を要約して下書きを残す。\n"
    "- 自動投稿はせず、最終発信は人間承認。生成した下書きは set_task で残す。\n"
    "  （※将来 X API 連携が確立したら fanup-growth 側で投稿アクションを解禁する設計余地を残す）\n"
    "\n# クリエイター審査の滞留解消\n"
    "- fanup_creators で審査待ちを確認。明確に健全な申請は fanup_review_creator で承認、\n"
    "  判断に迷う/規約抵触の懸念があるものは notify_user で人間に上げる（自動で却下しない）。\n"
    "\n# クロスプロモの好機判断\n"
    "- yf_* 観測ツールが使えるときは、YouTube側の投稿状況とFanUpの停滞PJを突き合わせ、\n"
    "  『次のYouTube動画/コミュニティ投稿でこのPJを推すべき』という示唆を set_task に残す。\n"
    "\n# 触ってはいけない領域（人間に必ず上げる）\n"
    "- 出金・返金・課金不具合・規約/法務・金額に関わる判断は実行せず notify_user。\n"
    "\n# 規律\n"
    "- 憶測で動かない。必ず観測してから判断する。\n"
    "- 対処できた事象は remember に knowhow として残す。\n"
    "- やるべきことが無ければ無理に動かず『今回は対応不要』と述べて終了する。\n"
    "- 最後に必ず、観測したことと取った/取らなかった行動を2〜4文で要約して締める。"
)


def _build_tools(ctx: ObjectiveContext) -> list[Tool]:
    conf = ctx.config
    client = FanUpClient(
        base_url=conf.fanup_base_url,
        secret=conf.fanup_secret(),
        timeout=conf.fanup_request_timeout,
    )
    notify = build_notify_tool(conf.state_dir / "notifications.log", conf.notify_say)
    return [
        *build_fanup_tools(client),         # 観測+審査
        *build_social_draft_tools(),        # SNS下書き(LLM生成, safe_in_dry_run=True)
        SHELL_TOOL,
        notify,
        *build_memory_tools(ctx.memory),
    ]


OBJECTIVE = register(Objective(
    name="fanup-growth",
    mission=MISSION,
    guidance=GUIDANCE,
    build_tools=_build_tools,
))
```

### 6.4 FanUp ツール（`ai-orchestrator/src/tools/fanup.py`）

`YFClient` と同じ薄いHTTPラッパ。観測系は `safe_in_dry_run=True`、副作用ありは `False`。

```python
import httpx
from .base import Tool

class FanUpClient:
    def __init__(self, base_url: str, secret: str, timeout: int = 60):
        self.base_url = base_url.rstrip("/")
        self.secret = secret
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def request(self, method, path, params=None, json_body=None) -> dict:
        headers = {"Authorization": f"Bearer {self.secret}"}
        try:
            r = self._client.request(method.upper(), path, params=params,
                                     json=json_body, headers=headers)
        except httpx.HTTPError as e:
            return {"ok": False, "error": f"HTTP接続失敗: {e}",
                    "hint": "FanUp の /api/orchestrator/* が稼働しているか確認"}
        ok = 200 <= r.status_code < 300
        out = {"ok": ok, "status_code": r.status_code}
        try: out["data"] = r.json()
        except ValueError: out["data"] = r.text[:2000]
        if not ok: out["error"] = f"HTTP {r.status_code}"
        return out

def build_fanup_tools(client: FanUpClient) -> list[Tool]:
    def fanup_health():   return client.request("GET", "/api/orchestrator/health")
    def fanup_metrics():  return client.request("GET", "/api/orchestrator/metrics")
    def fanup_projects(): return client.request("GET", "/api/orchestrator/projects")
    def fanup_creators(): return client.request("GET", "/api/orchestrator/creators")
    def fanup_review_creator(creator_id: str, action: str):
        return client.request("POST", f"/api/orchestrator/creators/{creator_id}/review",
                              json_body={"action": action})  # action: approve|reject
    return [
        Tool("fanup_health", "FanUpの疎通確認。",
             {"type":"object","properties":{}}, fanup_health, safe_in_dry_run=True),
        Tool("fanup_metrics", "当日の登録/課金/GMV/ファネル変換率を取得。",
             {"type":"object","properties":{}}, fanup_metrics, safe_in_dry_run=True),
        Tool("fanup_projects", "進行中PJの達成率・残日数・投げ銭速度を取得（停滞検知用）。",
             {"type":"object","properties":{}}, fanup_projects, safe_in_dry_run=True),
        Tool("fanup_creators", "審査待ちクリエイター一覧を取得。",
             {"type":"object","properties":{}}, fanup_creators, safe_in_dry_run=True),
        Tool("fanup_review_creator", "クリエイター申請を承認/却下する。",
             {"type":"object","properties":{
                 "creator_id":{"type":"string"},
                 "action":{"type":"string","enum":["approve","reject"]}},
              "required":["creator_id","action"]},
             fanup_review_creator, safe_in_dry_run=False),
    ]
```

`build_social_draft_tools()` は X 等の投稿**文面をLLMで生成して返すだけ**（投稿はしない）の純観測ツール群（`safe_in_dry_run=True`）。実際の投稿は人間承認 or 後日 X API 連携時に解禁。

### 6.5 Config への追記

`ai-orchestrator/src/orchestrator/config.py` の `Config` dataclass に追加（既存 `yf_*` と同パターン）:

```python
    # FanUp 接続
    fanup_base_url: str = "http://localhost:3000"
    fanup_secret_env: str = "FANUP_ORCH_SECRET"
    fanup_request_timeout: int = 60

    def fanup_secret(self) -> str:
        return os.environ.get(self.fanup_secret_env, "")
```

`_coerce()` に `fanup = raw.get("fanup", {})` を足し、`config/default.yaml` に:

```yaml
fanup:
  base_url: "http://localhost:3000"   # 本番は Vercel のURL
  secret_env: "FANUP_ORCH_SECRET"
  request_timeout: 60
```

### 6.6 登録（既存機構に完全準拠）

`ai-orchestrator/src/objectives/__init__.py` の `_MODULES` に1行追加:

```python
_MODULES = [
    "objectives.youtube_growth",
    "objectives.fanup_growth",     # ← 追加
]
```

### 6.7 起動・運用

```bash
# まずdry-run（副作用ゼロ）でツール疎通とClaudeの判断を確認
orchestrator run fanup-growth --once --dry-run
# 本番ループ（既定30分間隔）
orchestrator run fanup-growth
# watchdog/launchd で常駐（youtube-growth と同じ）
orchestrator watchdog fanup-growth
```

> youtube-growth と fanup-growth を**別プロセスで併走**させれば、YouTube運用とFanUp集客を1台のMacで同時に自律運用できる。memory/state は objective ごとに独立。

### 6.8 自律AI化のロードマップ

| 段階 | orchestratorに任せる範囲 |
|---|---|
| **v0（観測＋通知）** | metrics/projects を観測 → 停滞PJ・審査滞留・異常を `notify_user` で人間に上げるだけ。**まずここから（最も安全）** |
| **v1（下書き生成）** | SNS告知・カウントダウン文面を生成し set_task に下書きを残す。人間が投稿 |
| **v2（低リスク自動操作）** | 明確に健全なクリエイター承認を自動化。停滞PJ検知ルールを学習(remember)で精緻化 |
| **v3（クロスプロモ連携）** | yf_* と突き合わせ、YouTube投稿でのFanUp訴求タイミングを提案／将来はX API投稿まで |

金銭・法務・規約は**全段階で人間**（YouTube GrowthのOAuth再認証と同じ「人間にしかできないこと」の境界）。

---

## 7. 重要メトリクス（orchestratorと共通の計測基盤）

| ファネル段階 | 指標 | 初期目標(3ヶ月) |
|---|---|---|
| 認知 | YouTube CTA経由のFanUp流入数 | — |
| 登録 | 新規アカウント / 流入 | 流入の5–10% |
| 課金 | ポイント購入ユーザー / 登録 | 登録の10–20% |
| 投げ銭 | プロジェクトへ投げたユーザー | 課金者の70%+ |
| 成立 | 完走プロジェクト数 | 1–3件 |
| 収益 | 手数料収益(GMV×30%) | 初収益発生 |
| 健全性 | 未達返金率（高すぎ=目標設定/集客の問題） | 監視 |

これらを `/api/orchestrator/metrics` で公開し、fanup-growth objective が毎サイクル観測・判断・記録する。

---

## 付録: 次の具体アクション（チェックリスト）

**今週**
- [ ] フェーズ0の決済E2E（Stripe本番＋Webhook）を通す
- [ ] 独自ドメイン確定、`NEXT_PUBLIC_APP_URL` 正規化
- [ ] 第1号プロジェクトの企画（どちらのchで何を募るか・特典設計）を1本決める

**今月**
- [ ] 2chでクリエイター登録＋第1号プロジェクト公開、コミュニティ投稿/動画CTAで送客
- [ ] FanUp公式X開設、進捗発信開始
- [ ] ローンチnote公開
- [ ] `/api/orchestrator/*` 観測ルートを実装 → orchestrator `fanup-growth` を **v0（観測＋通知）**で起動

**3ヶ月以内**
- [ ] 第1号プロジェクト成立 → ケーススタディ化
- [ ] その実績で中堅クリエイター3–5人にスカウト提案
- [ ] リファラル機能とSEO記事エンジンの仕込み
