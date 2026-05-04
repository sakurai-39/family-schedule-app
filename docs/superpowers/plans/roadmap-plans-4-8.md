# Plan 4〜8 ロードマップ（高レベル）

各 Plan の着手時に詳細仕様を別途作成する。ここでは全体像と依存関係のみ。

---

## Plan 4: メイン UI（カレンダー画面）

**前提:** Plan 3 完了（認証 + 家族紐付け）

### スコープ

- カレンダー表示画面（月表示・週表示）
- 予定・タスクの一覧表示（`status='scheduled'` のものを `startAt` / `dueAt` で並べる）
- 担当者バッジ・完了チェックボックス
- 予定タップで詳細画面へ

### 主要ファイル

- `screens/CalendarScreen.tsx`
- `components/CalendarItem.tsx`
- `components/AssigneeBadge.tsx`
- `hooks/useCalendarItems.ts`（リアルタイム購読 `onSnapshot`）

### 推奨ライブラリ

- `react-native-calendars`（日本語対応・カスタマイズ可能）

### 工数目安

10〜15時間（3〜4セッション）

---

## Plan 5: 受信箱（Inbox）UI + スケジュール登録

**前提:** Plan 4 完了

### スコープ

- 受信箱画面（`status='inbox'` のリスト表示）
- 新規メモ追加ボタン（最速入力 = タイトルのみ）
- メモ → 予定/タスクへの変換 UI（`promoteInboxToScheduled`）
- 予定の編集・削除画面

### 主要ファイル

- `screens/InboxScreen.tsx`
- `screens/CalendarItemEditScreen.tsx`
- `components/InboxItem.tsx`
- `components/AssigneeSelector.tsx`
- `components/DateTimePicker.tsx`
- `hooks/useInboxItems.ts`

### UX 重要ポイント

- メモ入力は3秒以内に完了できること（妻の使用習慣化が成功条件 — BRAINSTORMING_DECISIONS.md）
- 入力時間を `inputDurationMs` に記録（既に service 層に対応済）

### 工数目安

10〜15時間（3〜4セッション）

---

## Plan 6: 通知

**前提:** Plan 5 完了

### スコープ

- ローカル通知（Expo Notifications）
- 朝8時のサマリ通知（その日の予定一覧）
- 各予定の1時間前リマインド
- 通知ID管理（`AsyncStorage`）
- 担当者向けの出し分け（`papa` / `mama` / `both` / `whoever`）

### 主要ファイル

- `services/notifications.ts`
- `utils/notificationSchedule.ts`（純粋関数・テスト可能）
- `__tests__/notifications.test.ts`

### 注意点

- CLAUDE.md 第6章を厳守
- 過去日時の通知予約は禁止（予約前にクライアントで弾く）
- 各端末は自分の担当分のみ予約

### 工数目安

5〜8時間（1〜2セッション）

---

## Plan 7: テスト・品質

**前提:** Plan 6 完了（機能実装ほぼ完成）

### スコープ

- CLAUDE.md 第7章の5項目すべてを実装:
  1. 通知スケジュール計算
  2. 認証・ペアリング（Plan 3 で着手済）
  3. メンバー削除時のデータ整合性（Plan 2 で着手済）
  4. やることリストのサマリ通知
  5. とりあえずメモ → 予定/タスク変換
- ESLint / TypeScript エラー残件ゼロ
- CodeQL / Snyk の High/Critical ゼロ
- 手動テストチェックリスト作成

### 工数目安

5〜8時間（1〜2セッション）

---

## Plan 8: リリース準備

**前提:** Plan 7 完了

### スコープ

- 本番 Firebase プロジェクトを別途作成（開発用と分離）
- `firestore.rules` の本番デプロイ
- 予算アラート設定（Firebase コンソール）
- 公開前セキュリティチェックリスト（CLAUDE.md 第11章 + spec 第12-6節）の全消化
- Expo Go 経由で妻に渡せる状態にする

### 工数目安

3〜5時間（1セッション）

---

## 全体スケジュール感

| Plan | 工数 | 想定セッション数 |
|---|---|---|
| Plan 2 M6 | 1h | 0.5 |
| Plan 3 | 7〜10h | 1〜2 |
| Plan 4 | 10〜15h | 3〜4 |
| Plan 5 | 10〜15h | 3〜4 |
| Plan 6 | 5〜8h | 1〜2 |
| Plan 7 | 5〜8h | 1〜2 |
| Plan 8 | 3〜5h | 1 |
| **合計** | **41〜62h** | **11〜16セッション** |

---

## 着手順序の鉄則

- 必ず順番通りに進める（Plan 4 を飛ばして Plan 5 はできない）
- 各 Plan の完了タグ（`plan3-complete`, `plan4-complete` ...）を打って区切る
- Plan 完了ごとにバックアップ zip を `99_Backups/` に保存
- 各 Plan 着手時には改めて詳細仕様を `docs/superpowers/plans/plan-N-xxx.md` として作成する（このロードマップは概要のみ）
