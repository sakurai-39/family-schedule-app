# Plan 8.5 / Feature: カレンダーから直接予定追加

Created: 2026-05-10 (Ryouさん自己検証フィードバック由来)
Status: 計画案（Ryouさんレビュー待ち）

## 背景

自己検証中に Ryouさんから以下のフィードバック:

> 現在はメモを追加→未整理のメモをタップの順でないと予定を入力できません。カレンダーの画面から追加できるボタンがあれば、日にちを選択して予定を入れるステップが簡単になるのに、と思いました。

現状の予定登録フロー（8 ステップ）:

```
予定を入れたい
 → FAB（+ボタン）押す
 → とりあえずメモ画面でテキスト入力
 → 「メモを追加」
 → 一覧から該当メモをタップ
 → 「予定」を選ぶ
 → 日付ピッカー
 → 時刻ピッカー
 → 保存
```

これを 4-5 ステップに短縮したい。

## ゴール

カレンダー画面で日付を選んだ後、「この日に予定を追加」ボタンを押すと、予定編集画面が `startAt = 選択した日付 12:00` でプリフィルされた状態で開く。  
ユーザーはタイトル + 担当 + 必要なら時刻調整 + メモ → 保存。

新フロー（5 ステップ）:

```
予定を入れたい日をカレンダーでタップ
 → 「この日に予定を追加」ボタン押す
 → 編集画面（種類: 予定、日付: 既に入っている、時刻: 12:00 デフォルト）
 → タイトル/担当/時刻調整/メモ
 → 保存
```

## UI 配置（A 案）

CalendarScreen の月カレンダーグリッドと `今日/やること` タブの間に、新しいセクションを追加:

```
[ 月カレンダーグリッド ]
[ + この日に予定を追加 ]  ← 新規ボタン
[ 今日 / やること タブ ]
[ 選択した日の予定リスト ]
```

ボタンはセカンダリスタイル（背景白 + 緑文字 + 緑枠）で、サイズは横幅いっぱい。

## 実装方針

### バックエンド：2-step 作成

Firestore Rules（plan 5 で強化済）の制約により、`status='scheduled'` の直接作成は不可。`status='inbox'` で作成 → `promoteInboxToScheduled` で昇格、の 2-step を内部で行う。

これは UX 上は 1 つの保存操作に見えるが、内部では 2 回の Firestore 書き込みになる。

代替案として Rules を緩和して直接 scheduled 作成を許可する手もあるが、

- 既存の Rules テストや invariant を変更するリスク
- 2-step は数百ミリ秒の追加レイテンシだけ
- inbox→scheduled の整合性チェック（spec 第 4-4 節）を引き続き効かせられる

ため、まず 2-step で実装する。

### フロントエンド変更

#### 1. App.tsx

新しい画面状態を追加:

```typescript
type ActiveScreen =
  | { name: 'calendar' }
  | { name: 'invite' }
  | { name: 'inbox' }
  | { name: 'edit'; item: CalendarItem }
  | { name: 'create-event'; presetDate: Date };  // 新規
```

`CalendarItemEditScreen` にプロパティを追加して mode を切り替える。

#### 2. CalendarScreen.tsx

`onCreateEventForDate?: (date: Date) => void` プロパティを追加。月カレンダーの下に「+ この日に予定を追加」ボタンを配置。タップで `onCreateEventForDate(selectedDate)` を呼ぶ。

#### 3. CalendarItemEditScreen.tsx

現状は `item: CalendarItem` を必須プロパティとして受け取る。これを以下に変更:

```typescript
type CalendarItemEditScreenProps =
  | { mode: 'edit'; item: CalendarItem; ... }
  | { mode: 'create'; presetDate: Date; user: User; ... };
```

`mode === 'create'` の場合:

- 種類: 予定 (event) でデフォルト
- 日付: presetDate からセット
- 時刻: 12:00 デフォルト
- 担当: 自分（user.userId）
- タイトル/メモ: 空

保存時:

```typescript
// services/firestore.ts に新規追加
export async function createScheduledItem(
  db: Firestore,
  householdId: string,
  draft: ScheduledItemDraft,
  createdBy: string,
  inputDurationMs: number | null
): Promise<string> {
  // 1. inbox として作成
  const itemId = await createInboxItem(db, householdId, {
    title: draft.title,
    createdBy,
    inputDurationMs,
  });
  // 2. scheduled に昇格
  await promoteInboxToScheduled(db, householdId, itemId, draft);
  return itemId;
}
```

## テスト戦略

### 自動テスト

- `services/firestore.ts` の `createScheduledItem` のテストを `__tests__/scheduledItemService.test.ts` に追加（mock）
- Rules テストは変更なし（既存の inbox 作成 + inbox→scheduled 更新で網羅されている）
- UI コンポーネントの直接テストは入れない（既存パターン踏襲）

### 手動テスト

1. カレンダーで未来の日付をタップ → 選択
2. 「この日に予定を追加」ボタンが表示される
3. ボタンタップ → 編集画面が日付プリフィル状態で開く
4. タイトル + 担当 + 時刻 + 保存
5. カレンダーに戻る → 当該日に予定カードが表示される
6. 過去日付や今日でも同じフローで動作することを確認

## セキュリティ

- Firestore Rules 変更なし
- 新しい権限は不要（既存の inbox create + scheduled update のみ使用）
- ライブラリ追加なし

## 工数見積

- バックエンド (services + tests): 1 時間
- フロントエンド (3 ファイル更新): 2 時間
- 手動テスト + 微調整: 1 時間

合計: 約 4 時間

## 残課題

- 編集画面で「**新規作成**」と「**既存編集**」の見た目の違い（タイトル / ボタンラベルなど）を検討
- 時刻のデフォルト値（12:00 で良いか / もっと工夫すべきか）
- 「予定」がデフォルトで「タスク」「やること」にも切替可能にする想定

## Ryouさんに確認したいこと

1. UI 配置（A 案：月カレンダーの下にボタン）でよいか？
2. デフォルト時刻 12:00 でよいか？
3. 内部 2-step 実装でよいか（数百ミリ秒のレイテンシ許容）？
