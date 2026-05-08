# Plan 5: とりあえずメモ（Inbox）UI + スケジュール登録 詳細計画

Status: Draft / Ryouさん承認待ち

Created: 2026-05-08

---

## 1. 目的

Plan 4 で表示できるようになったカレンダー画面に対して、実際に予定・タスクを追加できる入力導線を実装する。

Plan 5 の中心は「とりあえずメモを最速で入れる」こと。妻が入力を習慣化できるよう、最初の入力はタイトルだけで完了できるようにする。その後、必要に応じてメモを予定・期限ありタスク・期限なしタスクへ変換する。

画面表示名は **「とりあえずメモ」** とする。コード内部やFirestore上の状態名は、既存設計に合わせて `inbox` を継続する。

---

## 2. スコープ

### 実装すること

- とりあえずメモ画面を追加する。
- `status='inbox'` の `calendar_items` をリアルタイム購読する。
- 新規メモをタイトルだけで追加できるようにする。
- 入力開始から保存までの時間を `inputDurationMs` に記録する。
- 受信箱メモを以下の3種類へ変換できるようにする。
  - 予定: `type='event'`, `startAt` 必須
  - タスク（期限あり）: `type='task'`, `dueAt` 必須
  - やること（期限なし）: `type='task'`, `dueAt=null`
- 予定・タスクの編集画面を追加する。
- 予定・タスクを削除できるようにする。
- カレンダー画面からとりあえずメモ画面へ移動できる導線を追加する。
- カレンダー上の予定・タスクカードをタップして編集画面へ移動できるようにする。

### 実装しないこと

- 通知予約（Plan 6）
- 繰り返し予定
- 買い物リスト
- 画像・添付ファイル
- 位置情報
- iOS / Apple Sign-In 実機確認
- 本格的なデザイン磨き込み

---

## 3. 追加ライブラリ方針

Plan 5 初回PRでは追加ライブラリなしで進める。

理由:

- AGENTS.md 第9章により、ライブラリ追加には事前調査と承認が必要。
- まずは React Native 標準の `TextInput` / `Pressable` / `ScrollView` で機能をつなぐ。
- 日付・時刻入力は、初回は自前の `DateTimeInput` コンポーネントで扱う。
- 実機で「入力しづらい」と分かった時点で、`@react-native-community/datetimepicker` 等の導入を別途検討する。

判断:

- `npm install` はしない。
- Native Date Picker が必要になった場合は、作業を止めてライブラリ調査・承認に戻る。

---

## 4. 画面方針

### カレンダー画面

- 既存の `CalendarScreen` に「受信箱」ボタンを追加する。
- 予定・タスクカードをタップすると編集画面へ移動する。
- 完了チェックは引き続きカレンダー画面上で操作できる。

### とりあえずメモ画面

- 画面上部に最速入力欄を置く。
- 入力欄はタイトルのみ。
- 保存ボタンで `status='inbox'` のメモを作成する。
- 未整理メモ一覧を表示する。
- メモをタップすると編集画面へ移動する。

### 編集画面

- `inbox` メモの場合:
  - 「予定」「タスク」「やること」の種別を選ぶ。
  - 担当者を選ぶ。
  - 日付・時刻が必要な種別では日時を入力する。
  - 保存時に `promoteInboxToScheduled` を呼ぶ。
- `scheduled` 予定/タスクの場合:
  - タイトル、メモ、担当者、日時を編集できる。
  - 保存時に `updateScheduledItem` を呼ぶ。
  - 削除ボタンで `deleteCalendarItem` を呼ぶ。

---

## 5. 触るファイル一覧

### 新規作成

- `src/screens/InboxScreen.tsx`
- `src/screens/CalendarItemEditScreen.tsx`
- `src/components/InboxItem.tsx`
- `src/components/AssigneeSelector.tsx`
- `src/components/DateTimeInput.tsx`
- `src/components/ItemTypeSelector.tsx`
- `src/hooks/useInboxItems.ts`
- `src/utils/scheduleDraft.ts`
- `src/__tests__/scheduleDraft.test.ts`
- `src/__tests__/inboxSubscription.test.ts`
- `src/__tests__/scheduledItemService.test.ts`

### 更新

- `App.tsx`
  - 画面状態を `calendar` / `invite` / `inbox` / `edit` に拡張する。
- `src/screens/CalendarScreen.tsx`
  - とりあえずメモ導線、カードタップ編集導線を追加する。
- `src/components/CalendarItemCard.tsx`
  - チェックボックス以外のカードタップを編集導線にする。
- `src/services/firestore.ts`
  - `subscribeInboxItems` を追加する。
  - `updateScheduledItem` を追加する。
  - `calendarItemFromData` の再利用を続ける。
- `src/utils/validation.ts`
  - 日付・時刻入力用の軽い検証を追加する可能性あり。
- `src/__tests__/firestoreRules.rules.test.ts`
  - calendar_items の create/update/delete ルールを追加・強化する場合に更新する。
- `src/__tests__/firestoreService.rules.test.ts`
  - service 層の新関数テストを追加する。
- `firestore.rules`
  - Plan 5 の書き込み仕様に合わせて calendar_items の検証を強化する。

### 更新しない予定

- `.env*`
- `google-services.json`
- EAS 設定
- Firebase Auth / Google Sign-In 設定

---

## 6. 主要関数の入出力

### `subscribeInboxItems`

場所: `src/services/firestore.ts`

入力:

- `db: Firestore`
- `householdId: string`
- `onItems: (items: CalendarItem[]) => void`
- `onError?: (error: Error) => void`

出力:

- `() => void`
  - Firestore 購読解除関数。

役割:

- `households/{householdId}/calendar_items` のうち `status='inbox'` のものだけを購読する。
- 画面/hookから Firestore を直接触らないようにする。

### `useInboxItems`

場所: `src/hooks/useInboxItems.ts`

入力:

- `db: Firestore`
- `householdId: string | null`

出力:

- `items: CalendarItem[]`
- `isLoading: boolean`
- `errorMessage: string | null`

役割:

- とりあえずメモ一覧のリアルタイム購読を React hook として扱う。

### `createInboxItem`

既存: `src/services/firestore.ts`

入力:

- `db: Firestore`
- `householdId: string`
- `draft: { title: string; createdBy: string; inputDurationMs: number | null }`

出力:

- `Promise<string>`
  - 作成された itemId。

Plan 5での使い方:

- `InboxScreen` の最速入力から呼ぶ。
- `inputDurationMs` は入力欄を開いた時刻から保存時刻までで計算する。

### `promoteInboxToScheduled`

既存: `src/services/firestore.ts`

入力:

- `db: Firestore`
- `householdId: string`
- `itemId: string`
- `draft: ScheduledItemDraft`

出力:

- `Promise<void>`

Plan 5での使い方:

- `CalendarItemEditScreen` で `inbox` メモを予定/タスク/やることへ変換する。

### `updateScheduledItem`

新規: `src/services/firestore.ts`

入力:

- `db: Firestore`
- `householdId: string`
- `itemId: string`
- `draft: ScheduledItemDraft`

出力:

- `Promise<void>`

役割:

- 既に `status='scheduled'` の予定/タスクを編集する。
- `status` は `scheduled` のまま維持する。
- `createdBy` / `createdAt` / `inputDurationMs` は変更しない。

### `buildScheduledItemDraft`

新規: `src/utils/scheduleDraft.ts`

入力:

- 画面フォームの状態
  - 種別
  - タイトル
  - メモ
  - 担当者
  - 日付
  - 時刻

出力:

- `{ ok: true; draft: ScheduledItemDraft }`
- `{ ok: false; reason: string }`

役割:

- UIから service に渡す前に、予定/タスク/やることの必須項目を整える。
- テストしやすい純粋関数にする。

---

## 7. Security Rules 方針

Plan 5 では `firestore.rules` の calendar_items 部分を強化する。

理由:

- AGENTS.md 第4-4章では、`status='inbox' → 'scheduled'` の変換時に必須フィールドが揃っていることを Security Rules でも検証する必要がある。
- 現在の rules は household member であれば `calendar_items` に広く `read, write` できる。
- Plan 5 で実際の予定登録UIを公開する前に、rules 側も仕様に寄せる。

想定ルール:

- 未認証ユーザーは不可。
- household member のみ read/list 可。
- create は inbox 形式のみ許可。
  - `status == 'inbox'`
  - `type == null`
  - `title` は文字列かつ 1〜200文字
  - `assignee == null`
  - `startAt == null`
  - `dueAt == null`
  - `memo` は文字列かつ 1000文字以内
  - `isCompleted == false`
  - `createdBy == request.auth.uid`
- inbox → scheduled の update は、予定/タスクの必須フィールドが揃う場合のみ許可。
- scheduled の編集は、許可されたフィールドだけ更新可。
- `createdBy` / `createdAt` / `inputDurationMs` は更新で変更不可。
- delete は household member のみ許可。

注意:

- Firestore Rules の timestamp / serverTimestamp の扱いはテストで確認する。
- Rules変更は CI と `npm run test:rules` で必ず検証する。

---

## 8. セキュリティ懸念

### Firestore 直アクセス

懸念:

- 画面から `addDoc` / `updateDoc` / `deleteDoc` / `onSnapshot` を直接呼ぶと AGENTS.md 違反。

対策:

- すべて `services/firestore.ts` 経由にする。

### 不正な予定データ

懸念:

- クライアントだけで検証すると、改変されたアプリから不正なデータを書ける。

対策:

- `buildScheduledItemDraft` でクライアント検証。
- `firestore.rules` でも inbox / scheduled の形を検証。

### `createdBy` の改ざん

懸念:

- 他人が作ったように見せるデータを書けると、履歴や担当表示が崩れる。

対策:

- create時は `createdBy == request.auth.uid` を rules で要求。
- update時は `createdBy` を変更不可にする。

### 相手の displayName 表示

懸念:

- Plan 4時点では他メンバーの `users/{uid}` を読めないため、相手の名前は正確に出せない。

対策:

- Plan 5では、必要なら「同じ household のメンバーが `displayName` だけ読める rules」を別タスクとして検討する。
- ただし Plan 5 の最優先は入力導線なので、相手名表示は引き続き「相手」フォールバックでも進行可能。

### 日付入力ミス

懸念:

- 手入力の日付が不正だと、予定が意図しない日時に登録される。

対策:

- `DateTimeInput` と `scheduleDraft` で入力チェックする。
- 不正な日付は保存ボタンを押しても保存しない。

### 秘密情報

懸念:

- Plan 5では秘密ファイルを触る必要がない。

対策:

- `.env*` / `google-services.json` / OAuth関連ファイルは変更・コミットしない。

---

## 9. テスト戦略

### TDD Red → Green

Plan 5 は以下の順で進める。

1. `scheduleDraft` の純粋関数テストを書く。
2. `scheduleDraft` を実装する。
3. `subscribeInboxItems` / `useInboxItems` のテストを書く。
4. service / hook を実装する。
5. `updateScheduledItem` の service テストを書く。
6. `updateScheduledItem` を実装する。
7. Firestore Rules の calendar_items 検証テストを書く。
8. `firestore.rules` を強化して通す。
9. UIを接続する。

### 自動テスト

- `npm test -- --runInBand`
- `npm run typecheck`
- `npm run lint`
- `npm run test:rules`

### 手動テスト

Android development build で以下を確認する。

1. カレンダー画面からとりあえずメモ画面へ移動できる。
2. タイトルだけでメモを追加できる。
3. 追加したメモが受信箱に表示される。
4. メモを「予定」に変換できる。
5. メモを「タスク（期限あり）」に変換できる。
6. メモを「やること（期限なし）」に変換できる。
7. 変換後、カレンダー画面 / やることタブに表示される。
8. 予定・タスクを編集できる。
9. 予定・タスクを削除できる。
10. 2人目アカウントでも同じ household のデータが見える。

---

## 10. 実装ステップ

### M1: scheduleDraft 純粋関数

目的:

- UIフォームから `ScheduledItemDraft` を安全に作る。

コミット例:

- `feat(inbox): add schedule draft builder (TDD)`

### M2: Inbox購読

目的:

- `status='inbox'` のメモをリアルタイム表示できるようにする。

コミット例:

- `feat(inbox): subscribe to inbox items (TDD)`

### M3: Firestore Rules 強化

目的:

- inbox作成 / scheduled変換 / scheduled編集を rules 側でも検証する。

コミット例:

- `test(rules): cover calendar item validation`
- `feat(rules): validate calendar item writes`

### M4: InboxScreen

目的:

- 最速メモ入力ととりあえずメモ一覧を実装する。

コミット例:

- `feat(inbox): add quick memo input`

### M5: CalendarItemEditScreen

目的:

- inbox → scheduled 変換、scheduled 編集、削除を実装する。

コミット例:

- `feat(inbox): add schedule conversion screen`

### M6: Appルーティング / Calendar連携

目的:

- カレンダー、受信箱、編集画面をつなぐ。

コミット例:

- `feat(inbox): connect inbox and edit flows`

### M7: 検証・PR・タグ・バックアップ

目的:

- CI / Android実機で確認し、Plan 5を完了する。

完了作業:

- PR 作成・CI緑確認・merge
- `plan5-complete` タグ作成・push
- `99_Backups/2026-05-xx_family-schedule-app_plan5-complete.zip` 作成

---

## 11. 承認確認

実装前に Ryouさんへ確認すること:

1. Plan 5 初回は追加ライブラリなしで進めてよいか。
2. 日付・時刻入力はまず自前の簡易入力で進め、使いづらければ後でDate Pickerライブラリを検討する方針でよいか。
3. Plan 5で `firestore.rules` を変更し、calendar_items の書き込み検証を強化してよいか。
4. 相手の呼び名表示は、Plan 5では引き続き「相手」表示でもよいか。

承認後、`feat/plan5-inbox-scheduling` ブランチを作成して M1 から TDD で着手する。
