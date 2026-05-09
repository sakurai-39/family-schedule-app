# Plan 8: KPI 集計手順書

Created: 2026-05-09

## 目的

spec 第 11-4 節「奥さん検証 KPI」のうち、**アプリ側で記録される指標** を Firebase Console から手動で読み取るための手順をまとめる。

実装は Codex が Plan 5 で完了済み（`InboxScreen.tsx` の `startedAtMs` → `Date.now()` 差分 → `createInboxItem` の `inputDurationMs`）。本書はその数値を「いつ・どこを開いて・何を計算するか」を非エンジニア向けに記述する。

---

## 計測対象の KPI と保存場所

| KPI | spec 11-4 番号 | データ取得元 | 計算方法 |
|---|---|---|---|
| 自発的入力日数 | #1 | `calendar_items.createdBy` + `createdAt` | 日付ごとに `createdBy = 妻の userId` のドキュメント数を数える |
| とりあえずメモ利用率 | #2 | `calendar_items.status` + `createdBy` | 妻が作成した全件のうち `status='inbox'` から始まったものの割合 |
| 入力スピード | #3 | `calendar_items.inputDurationMs` | 妻の inbox ドキュメントの `inputDurationMs` のうち 10000 ms 以下の割合 |
| 整理率 | #4 | `calendar_items.status` 遷移 | 妻が作成した inbox のうち、7 日以内に `scheduled` に変わった割合 |
| 妻の定性反応 | #5 | アプリ外（口頭ヒアリング） | 別途記録 |

NOTE: 自己検証フェーズ中（Ryouさん単独）は、`createdBy` がすべて Ryouさんなので、奥さん固有の数字ではなく「動作確認用の暫定数値」として読む。

---

## Firebase Console での読み取り手順

### Step 1. Firebase Console を開く

1. ブラウザで `https://console.firebase.google.com/` を開く。
2. プロジェクト `family-schedule-app-b768e` を選択。
3. 左メニューから「Build > Firestore Database」を選ぶ。

### Step 2. 自分の household を特定する

1. 上部のパス欄が `households` のコレクションになっていることを確認。
2. Document ID 一覧から、自分の household を特定（複数ある場合は `members` 配列に自分の userId が入っている方）。
3. クリックして開く。

### Step 3. calendar_items サブコレクションを開く

1. household ドキュメントの右側で「Add collection」の隣にある既存サブコレクション「calendar_items」を選ぶ。
2. ドキュメント一覧が表示される。
3. 各ドキュメントをクリックすると、フィールド一覧が見られる。

### Step 4. 必要なフィールドを目視で読む

各ドキュメントで以下を読む：

| フィールド | 意味 |
|---|---|
| `createdBy` | 作成者の userId（妻 / Ryouさん の判別） |
| `createdAt` | 作成日時（タイムスタンプ） |
| `status` | `inbox`（未整理）or `scheduled`（整理後） |
| `inputDurationMs` | 入力にかかったミリ秒（数値）or null |
| `updatedAt` | 最終更新（status 遷移時刻が分かる） |

---

## 週次集計のテンプレート

毎週日曜の夜に以下を Excel / Google Sheets / 紙のノート に転記する。

```
== Week N (yyyy-mm-dd 〜 yyyy-mm-dd) ==

[1] 妻の自発的入力日数 (week 内のユニーク日数)
   月 火 水 木 金 土 日 → 合計 N 日 (目標: 3 日以上)

[2] 妻の入力件数（合計）
   inbox: N 件 / scheduled (直接): N 件 / 計: N 件

[3] とりあえずメモ利用率
   inbox 件数 / 全件 = N %  (目標: 40 % 以上)

[4] 入力スピード
   inputDurationMs ≦ 10000 (10 秒) の件数 / 計測ありの件数 = N %  (目標: 80 % 以上)

[5] 整理率
   week 開始時点で 7 日以内に inbox 化されたメモのうち scheduled に変わった割合 = N %  (目標: 60 % 以上)

[6] 妻の定性反応
   - 「TimeTree に戻りたい」: yes / no
   - 自由コメント: ...
```

---

## Day 0 から Week 4 までの判定フロー

| 時点 | アクション |
|---|---|
| Day 0 | アプリ操作説明（1 回のみ）→ KPI 計測開始 |
| Day 4 | 計測の妥当性チェック（`inputDurationMs` がそもそも記録されているか）|
| Week 1 末 | 上記テンプレート初回記入。傾向を見る |
| Week 2 末 | 中間判定。指標 #1 が週 1 日以下なら早期撤退検討 |
| Week 4 末 | 最終判定（spec 11-4 節「判定マトリクス」参照）|

判定マトリクス（spec 11-4 節より再掲）:

- 成功: #1 週 3 日 + #2 40 % 以上 + #5 ポジティブ → フェーズ 2 移行
- 継続: #1 週 2 日 + 他は良好 → UI/UX 改善後にもう 2 週間
- 撤退検討: #1 週 1 日以下が 4 週続く → ピボット or 終了
- 即撤退: #5「TimeTree に戻りたい」

---

## トラブルシュート

### `inputDurationMs` が null のドキュメントがある

InboxScreen の `handleChangeTitle` で「**最初に非空文字を入れた瞬間**」に `startedAtMs` をセットする実装になっているため、

- 入力途中で別画面に戻った
- ペースト 1 発で何も追加入力していない

などのケースで `startedAtMs` がセットされず、保存時に `inputDurationMs = null` で送られる。null は KPI #3 の母数から除外する。

### `createdBy` が分からない

`users/{userId}` を Firestore Console で開くと `displayName` が見られる。`displayName` が「みき」（妻）なら妻の userId、「ゆうた」（Ryouさん）なら Ryouさんの userId として読み替える。

---

## 後続の自動化候補（Plan 8.5 / Plan 9）

手動集計が辛いと感じたら以下のいずれかを追加する：

- Firebase Console の「Export Collection to Storage」機能で JSON エクスポート → Excel / Python で集計
- Firebase Web SDK を使った認証付き読み取り Node.js スクリプト（CLAUDE.md 第 0-2「Firebase Admin SDK 禁止」を守るため Web SDK 限定）
- 簡易 KPI ダッシュボード（自分専用の隠し画面・PIN コードで保護）

NOTE: 4 週間の検証目的で 1 人が手動で読む規模なので、初動は手動推奨。
