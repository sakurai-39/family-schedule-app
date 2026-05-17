# 期限なしタスクの目安日表示 — 設計書

- 作成日: 2026-05-17
- 対象アプリ: family-schedule-app
- 関連 PR: PR #49 (`feat(settings): add notification preferences and task target periods`) で導入された `targetPeriod` 機能の拡張

## 1. 背景と目的

PR #49 で「いつかやるタスク」（期限なしタスク）に「おおまかな目安」（なし / 1週間 / 1か月 / 6か月 / 1年）を設定できるようになった。

しかし現状、タスクカードには `目安 1か月` のように **期間ラベル** しか表示されていないため、利用者は「1か月って具体的にいつまで？」と頭の中で計算する必要がある。

本機能では、登録日を起点に計算した **目安日** をカード上に併記し、利用者がカレンダーを参照しなくても目安日を把握できるようにする。

## 2. 機能仕様

### 2-1. 表示対象

| アイテム条件 | 表示有無 |
|---|---|
| `type === 'task'` かつ `dueAt === null` かつ `targetPeriod !== null` | 表示する |
| `targetPeriod === null`（「なし」） | 表示しない（現状維持） |
| `dueAt !== null`（期限あり通常タスク） | 表示しない |
| `type === 'event'` | 表示しない |

### 2-2. 表示フォーマット

カードのメタ行（既存の「目安 X」表示位置）を以下に拡張:

| 表示パターン | 例 |
|---|---|
| 同年内に収まる | `目安 1か月 (〜8/17頃)` |
| 年を跨ぐ | `目安 1年 (〜2027/5/17頃)` |

- セパレータは半角スペース + 半角括弧
- 月日は `M/D`（ゼロ埋めなし）
- 年表示は「目安日の年 ≠ 現在の年」のときのみ付加
- 末尾の「頃」は固定（厳密な日付ではないことを示す）

### 2-3. 計算ルール

`createdAt` を起点に、暦日ベースで以下を加算した `Date` を「目安日」とする:

| `targetPeriod` | 加算 | 月末調整 |
|---|---|---|
| `week` | +7日 | 不要 |
| `month` | 翌月の同日 | 翌月に同日が存在しない場合は月末日（例: 1/31 + 1m → 2/28 or 2/29） |
| `six_months` | +6か月の同日 | 同上 |
| `year` | 翌年の同日 | うるう年 2/29 → 翌年 2/28 |

- タイムゾーン: 端末ローカル時刻
- 静的固定: `createdAt` が変わらない限り目安日も変わらない（いつ見ても同じ日付）

### 2-4. 動作不変条件

- 既存タスクへの自動適用: 既存の `targetPeriod` を持つタスクも `createdAt` から自動計算される（データ移行不要）
- 完了済みタスク: 既存の `opacity 0.62` 適用のみ。目安日表記はそのまま乗る
- 期限を過ぎた場合: 表記は変えない（`(〜8/17頃)` のまま表示）。シンプルさ優先

## 3. アーキテクチャ

### 3-1. 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/utils/taskTargetPeriod.ts` | 純粋関数 `calculateTargetDate` と `formatTargetDate` を追加 |
| `src/components/CalendarItemCard.tsx` | `getTargetPeriodLabel` を更新し、計算 + フォーマット結果を併記 |
| `src/__tests__/taskTargetPeriod.test.ts` | 新規追加。計算と表示フォーマットの単体テスト |

### 3-2. 変更しない範囲

- Firestore データ構造（`calendar_items.targetPeriod` + `createdAt` で成立）
- `firestore.rules`（本番デプロイ不要）
- `CalendarItemEditScreen`（編集中のプレビュー表示は今回スコープ外）
- 通知（`expo-notifications`）連動（目安日 ≠ 通知トリガー）

### 3-3. インターフェース

```typescript
// src/utils/taskTargetPeriod.ts

/**
 * 登録日と目安期間から、目安日（Date）を計算する。
 * period が null の場合は null を返す。
 */
export function calculateTargetDate(
  createdAt: Date,
  period: TaskTargetPeriod | null
): Date | null;

/**
 * 目安日を「M/D頃」または「YYYY/M/D頃」形式の文字列にフォーマットする。
 * targetDate が null の場合は null を返す。
 * now は現在日（年比較用、テスト容易性のため引数化）。
 */
export function formatTargetDate(
  targetDate: Date | null,
  now: Date
): string | null;
```

### 3-4. `CalendarItemCard` 側の組み立て

```typescript
function getTargetPeriodLabel(item: CalendarItem, now: Date): string | null {
  if (item.type !== 'task' || item.dueAt !== null) return null;
  if (item.targetPeriod === null) return null;
  const periodLabel = formatTaskTargetPeriod(item.targetPeriod);
  if (!periodLabel) return null;
  const targetDate = calculateTargetDate(item.createdAt, item.targetPeriod);
  const dateText = formatTargetDate(targetDate, now);
  return dateText ? `目安 ${periodLabel} (〜${dateText})` : `目安 ${periodLabel}`;
}
```

`now` はコンポーネントのレンダリングタイミングで `new Date()` を渡す（カードのライフサイクル中は固定）。

## 4. テスト戦略

`src/__tests__/taskTargetPeriod.test.ts` で以下を網羅:

### calculateTargetDate
- `week`: 2026-05-17 → 2026-05-24
- `month` 通常: 2026-05-17 → 2026-06-17
- `month` 月末調整: 2026-01-31 → 2026-02-28 / 2024-01-31 → 2024-02-29
- `six_months` 通常: 2026-05-17 → 2026-11-17
- `six_months` 月末調整: 2026-08-31 → 2027-02-28
- `year` 通常: 2026-05-17 → 2027-05-17
- `year` うるう年: 2024-02-29 → 2025-02-28
- `null`: 返り値 null

### formatTargetDate
- 同年内: 2026-05-17（now=2026-04-01）→ `5/17頃`
- 別年: 2027-05-17（now=2026-12-01）→ `2027/5/17頃`
- `null`: 返り値 null

UI コンポーネント（`CalendarItemCard`）の見た目テストは入れない（既存方針）。

## 5. 影響範囲

| 項目 | 影響 |
|---|---|
| Firestore データ構造 | なし |
| `firestore.rules` | なし（本番デプロイ不要） |
| 通知ロジック | なし |
| 既存タスク | 自動で目安日が計算・表示される（データ修正不要） |
| パフォーマンス | カード描画ごとに `Date` 加算 + 文字列フォーマット（軽量・無視可能） |

## 6. 受け入れ基準

- 「いつかやるタスク」一覧で、目安を設定済みのタスクカードに `目安 X (〜M/D頃)` が表示される
- 目安を「なし」にしたタスクには何も表示されない
- 期限ありの通常タスクには何も表示されない
- 既存のタスクも `createdAt` から自動計算されて表示される
- `npm run typecheck` / `npm run lint` / `npm test -- --runInBand` がすべて pass

## 7. リスクと緩和

| リスク | 緩和策 |
|---|---|
| `createdAt` がローカルとサーバーで微妙にズレている場合に日付がずれる | 端末ローカル時刻基準で割り切る（数時間のズレは UX 影響なし） |
| 月末調整の挙動が JS Date 標準と異なる期待をされる | テストで境界ケースを明示し、振る舞いを固定 |
| 「6か月（〜YYYY/M/D頃）」が長くてカードに収まらない | 既存のメタ行は `flexDirection: 'row'` + `gap: 8` で、本変更でも 1 要素のみの増加なので実機で要確認。問題があればフォローアップで対応 |

## 8. スコープ外（次の検討候補）

- 編集画面で目安を選択した瞬間に「目安日: M/D頃」をプレビュー表示する
- 目安日が近づいた / 過ぎたタスクをハイライト or 通知する
- 目安日でのソート / フィルタ
