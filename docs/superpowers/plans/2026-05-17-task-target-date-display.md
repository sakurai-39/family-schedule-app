# Task Target Date Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** いつかやるタスクのカードに、`createdAt + targetPeriod` から計算した目安日を `目安 1か月 (〜8/17頃)` 形式で併記する。

**Architecture:** `src/utils/taskTargetPeriod.ts` に純粋関数 2 つ（`calculateTargetDate` と `formatTargetDate`）を追加し、`CalendarItemCard.tsx` の `getTargetPeriodLabel` から呼び出す。データ構造・Rules 変更なし。

**Tech Stack:** TypeScript / React Native / Jest（既存）

**仕様書:** `docs/superpowers/specs/2026-05-17-task-target-date-display-design.md`

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `src/utils/taskTargetPeriod.ts` | 変更 | 既存の期間ラベル管理 + 新規: 目安日の計算と表示フォーマット |
| `src/components/CalendarItemCard.tsx` | 変更 | カード表示の `getTargetPeriodLabel` が新関数を使う |
| `src/__tests__/taskTargetPeriod.test.ts` | 新規 | 2 つの新関数の単体テスト |

UI コンポーネントのテストは入れない（既存方針）。Firestore データ構造変更なし。

---

## Task 0: ブランチを作成

- [ ] **Step 1: 作業ブランチを作成**

```bash
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" status --short --branch
# `## main...origin/main` のみ（クリーン）を確認

git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" checkout -b feat/task-target-date-display
```

期待: `Switched to a new branch 'feat/task-target-date-display'`

---

## Task 1: `calculateTargetDate` — `week` の最小テスト

**Files:**
- Test: `src/__tests__/taskTargetPeriod.test.ts` (新規)
- Modify: `src/utils/taskTargetPeriod.ts`

- [ ] **Step 1: 失敗するテストを書く**

新規ファイル `src/__tests__/taskTargetPeriod.test.ts` を作成:

```typescript
import { calculateTargetDate } from '../utils/taskTargetPeriod';

describe('calculateTargetDate', () => {
  it('week: 登録日 + 7日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'week');
    expect(result).toEqual(new Date(2026, 4, 24));
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: FAIL — `calculateTargetDate` が export されていないエラー

- [ ] **Step 3: 最小実装**

`src/utils/taskTargetPeriod.ts` に追加（既存 export はそのまま）:

```typescript
export function calculateTargetDate(
  createdAt: Date,
  period: TaskTargetPeriod | null
): Date | null {
  if (period === null) return null;
  const result = new Date(createdAt);
  if (period === 'week') {
    result.setDate(result.getDate() + 7);
    return result;
  }
  return null;
}
```

- [ ] **Step 4: テスト pass を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: PASS（1 test）

- [ ] **Step 5: commit**

```bash
git add src/utils/taskTargetPeriod.ts src/__tests__/taskTargetPeriod.test.ts
git commit -m "feat(tasks): add calculateTargetDate for week period (TDD)"
```

---

## Task 2: `calculateTargetDate` — `month` 通常 + 月末調整

**Files:**
- Test: `src/__tests__/taskTargetPeriod.test.ts`
- Modify: `src/utils/taskTargetPeriod.ts`

- [ ] **Step 1: 失敗するテストを追加**

`src/__tests__/taskTargetPeriod.test.ts` の `describe('calculateTargetDate', ...)` 内に追加:

```typescript
  it('month: 翌月の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2026, 5, 17)); // 2026-06-17
  });

  it('month: 翌月に同日がない場合は月末日にクランプ', () => {
    const createdAt = new Date(2026, 0, 31); // 2026-01-31
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2026, 1, 28)); // 2026-02-28
  });

  it('month: うるう年の月末調整', () => {
    const createdAt = new Date(2024, 0, 31); // 2024-01-31
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2024, 1, 29)); // 2024-02-29
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: FAIL — 3 つの新規テストが失敗（戻り値 null）

- [ ] **Step 3: 月加算ヘルパーを実装**

`src/utils/taskTargetPeriod.ts` の `calculateTargetDate` を以下に置き換え:

```typescript
export function calculateTargetDate(
  createdAt: Date,
  period: TaskTargetPeriod | null
): Date | null {
  if (period === null) return null;
  if (period === 'week') {
    const result = new Date(createdAt);
    result.setDate(result.getDate() + 7);
    return result;
  }
  if (period === 'month') {
    return addMonthsWithClamp(createdAt, 1);
  }
  return null;
}

function addMonthsWithClamp(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetYear = year + Math.floor((month + months) / 12);
  const targetMonth = ((month + months) % 12 + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, clampedDay);
}
```

- [ ] **Step 4: テスト pass を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: PASS（4 tests: week 1 + month 3）

- [ ] **Step 5: commit**

```bash
git add src/utils/taskTargetPeriod.ts src/__tests__/taskTargetPeriod.test.ts
git commit -m "feat(tasks): add month calculation with end-of-month clamp (TDD)"
```

---

## Task 3: `calculateTargetDate` — `six_months` と `year`

**Files:**
- Test: `src/__tests__/taskTargetPeriod.test.ts`
- Modify: `src/utils/taskTargetPeriod.ts`

- [ ] **Step 1: 失敗するテストを追加**

`src/__tests__/taskTargetPeriod.test.ts` の `describe('calculateTargetDate', ...)` 内に追加:

```typescript
  it('six_months: 6か月後の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'six_months');
    expect(result).toEqual(new Date(2026, 10, 17)); // 2026-11-17
  });

  it('six_months: 月末調整あり', () => {
    const createdAt = new Date(2026, 7, 31); // 2026-08-31
    const result = calculateTargetDate(createdAt, 'six_months');
    expect(result).toEqual(new Date(2027, 1, 28)); // 2027-02-28
  });

  it('year: 翌年の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'year');
    expect(result).toEqual(new Date(2027, 4, 17)); // 2027-05-17
  });

  it('year: うるう年 2/29 → 翌年 2/28', () => {
    const createdAt = new Date(2024, 1, 29); // 2024-02-29
    const result = calculateTargetDate(createdAt, 'year');
    expect(result).toEqual(new Date(2025, 1, 28)); // 2025-02-28
  });

  it('null period の場合は null を返す', () => {
    const createdAt = new Date(2026, 4, 17);
    expect(calculateTargetDate(createdAt, null)).toBeNull();
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: FAIL — `six_months` と `year` のテストが失敗（戻り値 null）。`null period` のテストは pass。

- [ ] **Step 3: 残りの period を実装**

`src/utils/taskTargetPeriod.ts` の `calculateTargetDate` を以下に置き換え:

```typescript
export function calculateTargetDate(
  createdAt: Date,
  period: TaskTargetPeriod | null
): Date | null {
  if (period === null) return null;
  if (period === 'week') {
    const result = new Date(createdAt);
    result.setDate(result.getDate() + 7);
    return result;
  }
  if (period === 'month') return addMonthsWithClamp(createdAt, 1);
  if (period === 'six_months') return addMonthsWithClamp(createdAt, 6);
  if (period === 'year') return addMonthsWithClamp(createdAt, 12);
  return null;
}
```

- [ ] **Step 4: テスト pass を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: PASS（9 tests: week 1 + month 3 + six_months 2 + year 2 + null 1）

- [ ] **Step 5: commit**

```bash
git add src/utils/taskTargetPeriod.ts src/__tests__/taskTargetPeriod.test.ts
git commit -m "feat(tasks): add six_months and year calculation (TDD)"
```

---

## Task 4: `formatTargetDate` — 同年/別年/null

**Files:**
- Test: `src/__tests__/taskTargetPeriod.test.ts`
- Modify: `src/utils/taskTargetPeriod.ts`

- [ ] **Step 1: 失敗するテストを追加**

`src/__tests__/taskTargetPeriod.test.ts` の末尾に追加:

```typescript
describe('formatTargetDate', () => {
  it('同年内: M/D頃 を返す', () => {
    const targetDate = new Date(2026, 4, 17); // 2026-05-17
    const now = new Date(2026, 3, 1); // 2026-04-01
    expect(formatTargetDate(targetDate, now)).toBe('5/17頃');
  });

  it('別年: YYYY/M/D頃 を返す', () => {
    const targetDate = new Date(2027, 4, 17); // 2027-05-17
    const now = new Date(2026, 11, 1); // 2026-12-01
    expect(formatTargetDate(targetDate, now)).toBe('2027/5/17頃');
  });

  it('null 入力で null を返す', () => {
    const now = new Date(2026, 3, 1);
    expect(formatTargetDate(null, now)).toBeNull();
  });
});
```

`src/__tests__/taskTargetPeriod.test.ts` 冒頭の import を更新:

```typescript
import { calculateTargetDate, formatTargetDate } from '../utils/taskTargetPeriod';
```

- [ ] **Step 2: テストを実行して失敗を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: FAIL — `formatTargetDate` が export されていないエラー

- [ ] **Step 3: 実装**

`src/utils/taskTargetPeriod.ts` に追加（ファイル末尾）:

```typescript
export function formatTargetDate(targetDate: Date | null, now: Date): string | null {
  if (targetDate === null) return null;
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  if (targetDate.getFullYear() === now.getFullYear()) {
    return `${month}/${day}頃`;
  }
  return `${targetDate.getFullYear()}/${month}/${day}頃`;
}
```

- [ ] **Step 4: テスト pass を確認**

実行: `npm test -- --runInBand --testPathPattern=taskTargetPeriod`
期待: PASS（12 tests: calculateTargetDate 9 + formatTargetDate 3）

- [ ] **Step 5: commit**

```bash
git add src/utils/taskTargetPeriod.ts src/__tests__/taskTargetPeriod.test.ts
git commit -m "feat(tasks): add formatTargetDate for card display (TDD)"
```

---

## Task 5: `CalendarItemCard` 側を更新

**Files:**
- Modify: `src/components/CalendarItemCard.tsx`

UI コンポーネントの単体テストは入れない（既存方針）。型と全テストパスで担保する。

- [ ] **Step 1: import を追加**

`src/components/CalendarItemCard.tsx` の 4 行目を以下に変更:

```typescript
import {
  calculateTargetDate,
  formatTargetDate,
  formatTaskTargetPeriod,
} from '../utils/taskTargetPeriod';
```

- [ ] **Step 2: `getTargetPeriodLabel` を更新**

`src/components/CalendarItemCard.tsx` の `getTargetPeriodLabel` 関数（現在 64〜69行目あたり）を以下に置き換え:

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

- [ ] **Step 3: 呼び出し側に `now` を渡す**

`src/components/CalendarItemCard.tsx` の `CalendarItemCard` 関数内（現在 25 行目あたり）の `const targetPeriodLabel = getTargetPeriodLabel(item);` を以下に置き換え:

```typescript
  const targetPeriodLabel = getTargetPeriodLabel(item, new Date());
```

- [ ] **Step 4: 型チェック・テスト・lint を実行**

実行: `npm run typecheck`
期待: PASS

実行: `npm test -- --runInBand`
期待: PASS（25 + 1 = 26 suites / 165 + 12 = 177 tests）

実行: `npm run lint`
期待: 0 errors / 29 既存 warnings

- [ ] **Step 5: commit**

```bash
git add src/components/CalendarItemCard.tsx
git commit -m "feat(tasks): show target date next to period label on card"
```

---

## Task 6: push・PR テンプレ準備

このタスクは Ryouさん PowerShell 側の作業を含む。Claude が実行できる部分と Ryouさん依頼部分を分ける。

- [ ] **Step 1: 直近 5 コミットが本機能のものであることを確認**

```bash
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" log --oneline -6
# Task 1〜5 の 5 コミットが現ブランチに乗っていることを確認
```

- [ ] **Step 2: ブランチを push**

```bash
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" push -u origin feat/task-target-date-display
```

- [ ] **Step 3: PR 作成テンプレートを `COMMANDS_MEMO.txt` に書き出す**

`20_Projects/family-schedule-app/COMMANDS_MEMO.txt` を以下で上書き:

```
============================================================
 PR 作成手順 — feat(tasks): 目安日表示
============================================================

【1】以下のリンクをブラウザで開く

https://github.com/sakurai-39/family-schedule-app/compare/main...feat/task-target-date-display?quick_pull=1

【2】Title 欄に貼り付け

feat(tasks): show target date alongside period label on undated task cards

【3】PR 本文に貼り付け

## 変更内容

期限なしタスクで「おおまかな目安」を設定したものに、登録日（createdAt）から計算した目安日を併記表示。

例:
  変更前: 目安 1か月
  変更後: 目安 1か月 (〜8/17頃)

- 同年内: `M/D頃`
- 年を跨ぐ: `YYYY/M/D頃`
- 「なし」のタスクは何も表示しない（現状維持）

## 設計書

`docs/superpowers/specs/2026-05-17-task-target-date-display-design.md`

## 影響範囲

- UI 表示のみ。Firestore データ構造・Rules 変更なし。
- 本番 Rules deploy 不要。
- 既存タスクも自動で目安日が計算・表示される（データ移行不要）。

## 検証

- `npm run typecheck`: pass
- `npm run lint`: 0 errors / 29 existing warnings
- `npm test -- --runInBand`: 26 suites / 177 tests pass（新規 12 tests 追加）

【4】緑色の「Create pull request」ボタンを押す

============================================================
 マージ手順（CI 緑になってから）
============================================================

1. PR ページ下部までスクロール
2. 「Squash and merge」ボタンを押す
3. 「Confirm squash and merge」を押す
4. 「Delete branch」ボタンを押す

============================================================
 マージ完了後に Claude へ報告 → 当日ログに追記します
============================================================
```

- [ ] **Step 4: マージ後の片付けは別タスク**

Ryouさんが PR を merge / delete したら、Claude が以下を実行:

```bash
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" checkout main
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" pull origin main
git -C "C:/Users/ryoum/claude_workspace/first-github-project/20_Projects/family-schedule-app" branch -d feat/task-target-date-display
```

その後、当日ログ `90_Project_Logs/2026-05-17_log.md` に PR 情報を追記。

---

## 完了基準

- 「いつかやるタスク」一覧のカードで `目安 X (〜M/D頃)` が表示される
- 「なし」のタスクには何も表示されない
- 期限ありの通常タスクには何も表示されない
- `npm run typecheck` / `npm run lint` / `npm test -- --runInBand` がすべて pass
- PR がマージされ、ローカル main が最新化されている
