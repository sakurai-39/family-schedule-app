# Plan 8: 自己検証フェーズの定義

Created: 2026-05-09
Strategy: C 案 = iOS 配布前に Ryouさん単独で 1〜2 週間日常使用し、品質を磨く。

## 目的

Plan 1〜7 + Plan 5 followup で MVP 機能が揃ったので、奥さんへ渡す前に **Ryouさん単独で日常使用して品質を確認** する。バグや UX の違和感は GitHub Issues に蓄積し、後続 Plan（8.5 / 9）で集中処理する。

## 開始条件（Plan 8 完了時に揃っているべき状態）

- ✅ `npm test` / `npm run typecheck` / `npm run lint` / `npm run test:rules` 全 pass
- ✅ `npm audit --audit-level=high` exit 0
- ✅ Firestore Security Rules が本番反映済み
- ✅ Android development build が最新コードで動く（Plan 5 followup 時のビルドで OK）
- ✅ `plan-8-kpi-collection.md` で KPI の見方を理解している
- ✅ GitHub Issues のラベル設計が完了している（後述）

## 期間

- 推奨: **1〜2 週間**
- 最短: 4 日（spec 11-4 節「Day 4 KPI 計測開始」と整合）
- 延長条件: クリティカルバグが残っている場合

## GitHub Issues ラベル設計

Ryouさんが GitHub の以下のリンクで作成する:

`https://github.com/sakurai-39/family-schedule-app/labels`

| ラベル | 色（例） | 用途 |
|---|---|---|
| `bug-critical` | `#b60205`（赤） | アプリが落ちる、データが消える、保存できない、認証できない等の致命傷 |
| `bug-minor` | `#fbca04`（黄） | 動作はするが期待通りでない・小さな表示崩れ |
| `ux-polish` | `#0e8a16`（緑） | 余白・色・文言・タップ領域・既読表示・空状態など UX 磨き込み対象 |
| `feature-request` | `#1d76db`（青） | 新機能の要望（MVP スコープ外） |
| `self-validation` | `#5319e7`（紫） | 自己検証フェーズ中に登録された Issue であることを示すサブラベル |

ラベル作成手順:

1. 上記 URL を開く。
2. 右上の「New label」を押す。
3. Name / Description / Color を入れて Create。
4. 5 種類を順次作成。

## 自己検証中の運用ルール

### 毎日

- 思いついた予定 / メモを「とりあえずメモ」に入れる（実体としての利用）
- カレンダー画面を朝 1 回・夜 1 回開く（通知の実装が想定どおり機能するか実観察）

### 違和感を感じたら

- スクリーンショットを撮る（Android: 電源ボタン + 音量小同時押し）
- GitHub Issues で New Issue → 適切なラベルを付けて投稿
- 自分宛の Slack / メモアプリでもよいが、最終的に GitHub Issues に転記する

### Critical バグを発見したら

- 自己検証を一旦止めて、即修正 PR を作成（Plan 8 と独立した hotfix PR で OK）
- 修正後に検証を継続

## 終了判定

| 項目 | 判定基準 |
|---|---|
| クリティカルバグ | `bug-critical` の Open Issue が 0 件 |
| 通知 | 前日 21 時 / 当日 7 時 / 週日 20 時 サマリの 3 種すべて少なくとも 1 回ずつ実観察 |
| とりあえずメモ運用 | 1 日 1 件以上を 5 日以上自然に投入できた |
| 整理動線 | 投入したメモを予定 / 期限あり / やること に変換する一連の操作が苦痛なくできた |
| 蓄積 Issue 件数 | `ux-polish` の件数を確認し、後続フェーズの規模感を見積もる |

## 終了後の判断分岐

- `ux-polish` Issue が 5 件以下 → そのまま Plan 9 へ進み、iOS 対応と一緒に吸収
- `ux-polish` Issue が 6 件以上 → Plan 8.5（UX 磨き込み）を挟んでから Plan 9 へ
- `bug-critical` Issue が残存 → 自己検証期間を延長

Apple Developer 取得タイミング:

- 上記の「終了判定」をすべて満たし、Plan 9 着手の見通しが立った時点で $99/年の支払いを判断する。
- 支払いから iOS development build 作成完了まで Apple 側の手続きで数日かかるため、Plan 9 着手の 3〜5 日前に支払うのが理想。

## NOTE

- 本書はあくまで「Ryouさん単独」での検証フェーズの定義であり、奥さんへの引き渡しは含まない。
- 奥さんへの引き渡しは Plan 9 で iOS development build / Apple Sign-In / 操作説明資料が揃ってから別途キックオフする。
