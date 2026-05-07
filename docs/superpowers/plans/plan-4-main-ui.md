# Plan 4: メイン UI（カレンダー画面）詳細計画

Status: Draft / Ryouさん承認待ち

Created: 2026-05-07

---

## 1. 目的

Plan 3 で完了した「Googleログイン + 家族作成 + 招待コード参加」の次として、ログイン後に使うメイン画面を実装する。

現時点では、家族に参加済みのユーザーも `InviteScreen` に着地する。Plan 4 ではこれを `CalendarScreen` に置き換え、夫婦が予定・タスクを一覧できる状態にする。

---

## 2. スコープ

### 実装すること

- 月カレンダー + 選択日の予定リストを表示する。
- `status='scheduled'` の `calendar_items` をリアルタイム購読する。
- `startAt` がある予定、`dueAt` があるタスクを同じ画面で並べる。
- 担当者バッジを表示する。
- 完了チェックボックスで `isCompleted` を切り替える。
- 完了済みタスクは折りたたみ表示にする。
- 期限なしタスク（`dueAt=null`）は「やること」欄に分けて表示する。
- 招待コード画面へ移動できる導線を残す。
- サインアウト導線を残す。

### 実装しないこと

- 予定・タスクの新規作成 UI（Plan 5）
- 予定・タスクの詳細編集 UI（Plan 5）
- 通知（Plan 6）
- iOS development build / Apple Sign-In 実機確認（後続確認タスク）
- 夫婦以外の多人数対応

---

## 3. 画面方針

BRAINSTORMING_DECISIONS.md の決定に従う。

- 画面構成: 月カレンダー + 当日予定リスト
- タブ: 「今日」と「やること」
- 予定/タスクの区別: カード左枠の色で表現
- 担当者の区別: バッジ色で表現
  - 1人目: 緑系
  - 2人目: ピンク系
  - 両方: 紫系
  - どちらか: 黄系
- 担当者表示名: 固定の「夫/妻」ではなく `users.displayName`
- 完了済み: 「完了済み N件」バナーで折りたたみ

---

## 4. 追加ライブラリ方針

ロードマップでは `react-native-calendars` が候補として挙がっている。

ただし Plan 4 の初回実装では、追加ライブラリなしで進める方針を推奨する。

理由:

- MVP のカレンダー要件は、月の日付グリッド + 選択日表示が中心。
- 既存の React Native 標準コンポーネントと Date の純粋関数で実装できる。
- 追加ライブラリを入れると、AGENTS.md 第9章に従った調査・承認・依存管理が必要になる。
- まず小さく動かすことで、後から「週表示」「スワイプ」「高度な装飾」が必要になった時点でライブラリ導入を判断できる。

判断:

- Plan 4 初回PRでは `npm install` しない。
- 実装途中で標準コンポーネントだけでは負担が大きいと分かった場合、作業を止めて `react-native-calendars` の導入可否を Ryouさんに確認する。

---

## 5. 触るファイル一覧

### 新規作成

- `src/screens/CalendarScreen.tsx`
- `src/components/CalendarItemCard.tsx`
- `src/components/AssigneeBadge.tsx`
- `src/hooks/useCalendarItems.ts`
- `src/utils/calendarDisplay.ts`
- `src/__tests__/calendarDisplay.test.ts`
- `src/__tests__/useCalendarItems.test.ts`

### 更新

- `App.tsx`
  - 家族参加済みユーザーの着地点を `InviteScreen` から `CalendarScreen` に変更する。
- `src/services/firestore.ts`
  - `subscribeCalendarItems` を追加する。
- `src/__tests__/firestoreService.rules.test.ts`
  - `subscribeCalendarItems` の Firestore query 生成テストを追加する場合のみ更新する。

### 更新しない予定

- `firestore.rules`
  - Plan 4 は既存データの読み取りと `isCompleted` 更新のみ。
  - 既存 rules と既存 service 関数で足りる想定。
- `.env*`
- `google-services.json`
- EAS / Firebase 設定ファイル

### 実装中に判明した注意点

- 現在の Firestore Rules では `users/{他メンバーuid}` を読めない。
- そのため、Plan 4 初回では自分の担当は `user.displayName`、相手の担当は一旦「相手」と表示する。
- 相手の呼び名を正確に表示するには、後続で「同じ household の member 同士が displayName だけ読める rules 設計」または `households` 側への表示名複製が必要。

---

## 6. 主要関数の入出力

### `subscribeCalendarItems`

場所: `src/services/firestore.ts`

入力:

- `db: Firestore`
- `householdId: string`
- `options?: { status?: ItemStatus }`
- `onItems: (items: CalendarItem[]) => void`
- `onError?: (error: Error) => void`

出力:

- `() => void`
  - Firestore の購読解除関数。

役割:

- `households/{householdId}/calendar_items` を購読する。
- `status='scheduled'` のみ取得する。
- Firestore 直アクセスを画面・hook に漏らさない。

### `useCalendarItems`

場所: `src/hooks/useCalendarItems.ts`

入力:

- `db: Firestore`
- `householdId: string | null`

出力:

- `items: CalendarItem[]`
- `isLoading: boolean`
- `errorMessage: string | null`

役割:

- `subscribeCalendarItems` を React hook として扱う。
- 購読開始・解除・エラー表示文言をまとめる。

### `calendarDisplay` の純粋関数

場所: `src/utils/calendarDisplay.ts`

主な関数:

- `getDisplayDate(item: CalendarItem): Date | null`
  - `startAt` があれば予定日、なければ `dueAt`。
- `sortScheduledItems(items: CalendarItem[]): CalendarItem[]`
  - 予定・タスクを表示日時順に並べる。
- `getItemsForDate(items: CalendarItem[], date: Date): CalendarItem[]`
  - 選択日に該当する予定・タスクだけ返す。
- `getUndatedTasks(items: CalendarItem[]): CalendarItem[]`
  - `type='task'` かつ `dueAt=null` のものを返す。
- `splitCompletedItems(items: CalendarItem[]): { open: CalendarItem[]; completed: CalendarItem[] }`
  - 未完了と完了済みに分ける。
- `buildMonthGrid(date: Date): CalendarDay[]`
  - 月カレンダーに表示する日付グリッドを返す。

### `CalendarScreen`

場所: `src/screens/CalendarScreen.tsx`

入力:

- `db: Firestore`
- `user: User`
- `onSignOut: () => Promise<void> | void`
- `onOpenInvite: () => void`

出力:

- React Native 画面。

役割:

- ログイン後のホーム画面。
- 今日/やることタブ、月カレンダー、選択日のリスト、サインアウト/招待導線を表示する。

---

## 7. セキュリティ懸念

### Firestore 直アクセス

懸念:

- 画面から `onSnapshot` や `updateDoc` を直接呼ぶと AGENTS.md 違反になる。

対策:

- Firestore 操作は `src/services/firestore.ts` に閉じ込める。
- `CalendarScreen` と `useCalendarItems` は service 関数だけを使う。

### 他家族データの読み取り

懸念:

- `householdId` を誤って別家族のものにすると、他家族データ取得を試みる可能性がある。

対策:

- `CalendarScreen` には `user.householdId` だけを渡す。
- Firestore Security Rules で membership 判定済み。
- UI 側では `householdId` がない場合は読み取りしない。

### 完了チェック更新

懸念:

- `isCompleted` 更新は書き込みなので、誤った itemId / householdId への更新に注意が必要。

対策:

- 既存の `updateCalendarItem(db, householdId, itemId, { isCompleted })` を使う。
- `householdId` は `user.householdId` からのみ取得。
- Firestore Security Rules 側の membership 制御に依存する。

### 個人情報表示

懸念:

- メールアドレスや Google アカウント名をメイン画面に表示しすぎない。

対策:

- 担当者表示は `displayName` のみ。
- エラー文言に Firebase の内部エラーやメールアドレスを出さない。

### 秘密情報

懸念:

- Plan 4 では秘密ファイルを触る必要がない。

対策:

- `.env*`、`google-services.json`、OAuth クライアントシークレットは変更・コミットしない。

---

## 8. テスト戦略

### TDD Red → Green

Plan 4 は以下の順に Red → Green で進める。

1. `calendarDisplay` の純粋関数テストを書く。
2. `calendarDisplay` を実装して通す。
3. `subscribeCalendarItems` / `useCalendarItems` のテストを書く。
4. service / hook を実装して通す。
5. `CalendarScreen` とコンポーネントを接続する。

### 自動テスト

- `npm test -- --runInBand`
  - 通常 Jest テスト。
- `npm run typecheck`
  - TypeScript 型チェック。
- `npm run lint`
  - ESLint。既存の `firestoreService.rules.test.ts` の `any` warning は既知。
- `npm run test:rules`
  - Firestore Rules + Service Tests。
  - Plan 4 で rules を変更しない場合も、既存ルールが壊れていない確認として実行する。

### 手動テスト

Android development build で以下を確認する。

1. ログイン済みユーザーが `CalendarScreen` に着地する。
2. 招待画面へ移動できる。
3. サインアウトできる。
4. 予定が0件のとき、空状態が自然に表示される。
5. Firestore に `scheduled` item を入れた場合、画面に反映される。
6. 完了チェックを押すと Firestore の `isCompleted` が更新される。
7. 2人目アカウントでも同じ household の予定が見える。

---

## 9. 実装ステップ

### M1: 表示ロジックの純粋関数

目的:

- 予定/タスク/期限なしタスク/完了済みの分類を UI から切り離す。

コミット例:

- `feat(calendar): add calendar display helpers (TDD)`

### M2: Firestore リアルタイム購読

目的:

- `calendar_items` を service 経由で購読する。

コミット例:

- `feat(calendar): subscribe to scheduled items (TDD)`

### M3: カレンダー画面の基本表示

目的:

- 月カレンダー、今日タブ、やることタブ、空状態を表示する。

コミット例:

- `feat(calendar): add main calendar screen`

### M4: 担当者バッジ・カード・完了チェック

目的:

- 予定/タスクのカード表示、担当者表示、完了切り替えを入れる。

コミット例:

- `feat(calendar): add item cards and completion toggle`

### M5: App ルーティング切り替え

目的:

- 家族参加済みユーザーの着地点を `InviteScreen` から `CalendarScreen` に変える。
- 招待画面への導線を残す。

コミット例:

- `feat(calendar): route household users to calendar`

### M6: 検証・PR・タグ・バックアップ

目的:

- CI と Android development build で確認し、Plan 4 を完了する。

完了作業:

- PR 作成・CI 緑確認・merge
- `plan4-complete` タグ作成・push
- `99_Backups/2026-05-xx_family-schedule-app_plan4-complete.zip` 作成

---

## 10. 承認確認

この計画で実装に入る前に、Ryouさんに以下を確認する。

1. Plan 4 初回は追加ライブラリなしで進めてよいか。
2. メイン画面は「月カレンダー + 今日/やることタブ」でよいか。
3. Plan 4 では新規作成・編集画面を作らず、表示と完了チェックまでに絞ってよいか。

承認後、`codex/plan4-main-ui` ブランチを作成して M1 から TDD で着手する。
