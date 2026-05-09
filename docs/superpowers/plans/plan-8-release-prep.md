# Plan 8: リリース準備（Ryouさん単独自己検証フェーズ着手まで）

Created: 2026-05-09
Strategy: C 案 = iOS 配布は後回し・Ryouさん単独で先行 1〜2 週間自己検証 → その間に Apple Developer 取得判断 → 後続 Plan 9 で iOS / 妻配布。

## Goal

Plan 1〜7 + Plan 5 followup で実装した MVP を「Ryouさん単独で日常的に使える品質」まで磨き上げ、自己検証フェーズに入る。Day 0 妻配布のための iOS 対応・操作説明資料は Plan 9 に分離する。

## Out of Scope（Plan 9 以降）

- iOS / Apple Sign-In 実機検証（Apple Developer ($99/年) 取得後）
- 奥さん配布（iOS development build または妻側 Android 端末準備が必要）
- Day 0 操作説明資料の本格作成
- 4 週間 KPI 検証の正式キックオフ
- 本番 Firebase プロジェクト分離（MVP では同一プロジェクトを継続使用）
- 予算アラート（Spark プラン + 課金アカウント未登録 = 物理的に課金不可能のため不要・既決定）
- アプリアイコン・スプラッシュ画面の差し替え（自己検証フェーズ後に Plan 8.5 or Plan 9 で実施）
- UX 細部の磨き込み（余白 / 色 / 文言 / 既読状態 / タップ領域など）→ 自己検証で発見した内容を `ux-polish` ラベルで GitHub Issues に蓄積し、Plan 8.5 or Plan 9 で集中処理

## Pre-existing implementation note

**M1（KPI 計測ロジック）は Plan 5 で Codex により実装済みのため確認のみ:**

- `InboxScreen.tsx` 31-43, 54: 最初の非空文字入力で `startedAtMs = Date.now()`、保存時に `inputDurationMs = Date.now() - startedAtMs` を `createInboxItem` に渡す。
- `services/firestore.ts` 289-316: `createInboxItem` は draft.inputDurationMs を Firestore に永続化。
- `firestore.rules` 125-129 / 190-194: `inputDurationMs` の format 検証 + 作成後の不変性をサーバ側で enforce。
- 集計はアプリ内 KPI 画面を作らず、Firebase Console + 手動 / 簡易 Python スクリプトで読み出す方針（Ryouさん 2026-05-09 合意・B 案）。

## Scope (Milestones)

### M1: KPI 計測ロジック動作検証

実装は完了しているため、実データで動くことを確認する + 集計手順書を作る。

タスク:

1. Android development build で「とりあえずメモ」を 3 件追加。
2. Firebase Console > Firestore > `households/{id}/calendar_items` で `inputDurationMs` が数値で入っていることを確認。
3. 集計手順書（"いつ・どこをどう開いて・何の数字を読むか"）を `docs/superpowers/plans/plan-8-kpi-collection.md` に追加（Firebase Console 手動操作ベース）。

NOTE: 自動集計スクリプトは、自己検証フェーズで手動運用が辛いと感じたタイミングで Plan 8.5 / Plan 9 で追加する（YAGNI 回避のため Plan 8 では作らない）。

### M2: 公開前セキュリティチェックリストの全消化

spec 第 12-6 節「公開前セキュリティチェックリスト」を 1 項目ずつ消化し、`docs/superpowers/plans/plan-8-security-checklist.md` に結果を記録する。

ターゲット:

1. ハードコード機密情報チェック: `service_role` / `secret` / `api_key` / `password` を全ソースで grep し、ヒットゼロを確認。
2. `.gitignore` の `.env*` 登録確認（既に登録済みのはずだが念押し）。
3. Firestore Security Rules 本番反映確認: `firebase deploy --only firestore:rules --dry-run` または Firebase Console で本番 rules が想定どおりであることを確認。
4. `npm audit --audit-level=high --omit=dev` exit 0 を確認。
5. CodeQL 最新スキャン結果の High/Critical ゼロを確認。
6. Snyk 最新スキャン結果の High/Critical ゼロを確認。
7. Dependabot pending PR を確認し、安全に merge 可能なものは PR 作成 → CI 緑で順次 merge。Major version up は単独 PR で個別判断。
8. `console.log` のリリースビルド残留チェック（`grep -rn "console.log" src` でレビュー）。
9. ユーザー向けエラー文言が Firebase 内部メッセージを直接出していないか主要エラー経路を再確認（既に Plan 3〜6 で対応済のはずだが）。

### M3: 自己検証期間の準備

タスク:

1. 既存の `docs/superpowers/plans/plan-7-manual-test-checklist.md` を再利用し、自己検証フェーズの開始前に通しで実機チェック。
2. 自己検証中に発見した項目を記録するため、GitHub Issues にラベルを作成:
   - `bug-critical`: 即修正対象（保存失敗・クラッシュ・データ消失など）
   - `ux-polish`: UX 磨き込み（余白・色・文言・タップ領域・既読表示など）→ Plan 8.5 / Plan 9 で集中処理
   - `feature-request`: 追加機能要望 → 後続 Plan で個別判断
3. 自己検証期間（推奨: 1〜2 週間）終了の判断基準を `docs/superpowers/plans/plan-8-self-validation.md` に定義。
   - クリティカルバグ ゼロ
   - とりあえずメモ → 整理の動線が日常的に使える感触
   - 通知が想定どおり鳴る
   - 蓄積した `ux-polish` Issue の件数を見て Plan 8.5 を挟むか Plan 9 内で吸収するか判断
   - Apple Developer 取得を進めるかの判断

### M4: 完了処理

1. `npm test` / `npm run typecheck` / `npm run lint` / `npm run test:rules` / `npm audit --audit-level=high --omit=dev` 全 pass を確認。
2. PR 作成 → CI 緑 → squash merge → branch delete。
3. ローカル `main` を fast-forward。
4. `plan8-complete` タグを作成・push。
5. `git archive` でバックアップ zip を `99_Backups/{date}_family-schedule-app_plan8-complete.zip` に作成。
6. メモリ・MEMORY.md を更新。

## Files

新規追加:

- `docs/superpowers/plans/plan-8-release-prep.md`（本ファイル）
- `docs/superpowers/plans/plan-8-kpi-collection.md`（KPI 集計手順書 / M1）
- `docs/superpowers/plans/plan-8-security-checklist.md`（セキュリティ消化記録 / M2）
- `docs/superpowers/plans/plan-8-self-validation.md`（自己検証期間定義 / M3）

修正:

- なし（自己検証フェーズで GitHub Issues に蓄積した修正項目は Plan 8.5 / Plan 9 で対応）

NO MODIFY（変更しない）:

- `firestore.rules`
- `src/services/firestore.ts`
- `src/screens/InboxScreen.tsx`
- `app.config.js`
- 既存テストファイル

## Security Notes

- 既存の Firestore Security Rules は変更しない。
- 新規ライブラリの追加は M3 でアイコン生成 AI を CLI で叩く場合のみ。CLAUDE.md 第 9 章プロセスを通す。
- KPI 集計スクリプトが Firebase Admin SDK を使う場合は CLAUDE.md 第 0-2「Firebase Admin SDK の禁止」と衝突するため、Admin SDK は使わず Firebase Console の手動エクスポートか Firebase Web SDK の認証済み読み取りで対応する。

## Test Strategy

- M1 / M2 はコード変更を伴わない検証中心のため新規自動テストは追加しない。
- M3 の自己検証は手動チェックリストのみ。

## Commands

PR 前の最終確認:

```powershell
npm test -- --runInBand
npm run typecheck
npm run lint
npm run test:rules
npm audit --audit-level=high --omit=dev
```

期待値:

- Unit tests: 122 tests pass（Plan 5 followup 後の状態と同じ）
- TypeScript: 0 errors
- ESLint: 0 errors / 29 既存 warnings（`firestoreService.rules.test.ts` の `no-explicit-any`）
- Rules tests: 43/43 pass
- npm audit at high level: exit 0

## Risk and Mitigation

- **Dependabot PR の major version 衝突**: Expo / React Native の major up は単独 PR で個別検証。 Plan 8 の他タスクと混ぜない。
- **CodeQL / Snyk の High/Critical 検出**: 出た場合は Plan 8 を一旦止めて該当依存を上げるか除外する。Plan 8 完了時点で High/Critical ゼロが必須条件。

## Manual Verification

M1 完了時に Android development build で：

1. 「とりあえずメモ」を 3 件追加 → Firebase Console で `inputDurationMs` 確認。
2. 既存機能（カレンダー / 編集 / 削除 / 通知）が引き続き動くことを `plan-7-manual-test-checklist.md` で確認。

## Workflow

1. Plan 8 着手の Ryouさん承認を得る。
2. ブランチ作成（推奨: `feat/plan8-release-prep`）。
3. M1 → M2 → M3 → M4 の順で進める。
4. 各 milestone の最後に Ryouさんへ動作確認・チェック結果の確認を依頼。
5. 全 milestone 完了後に PR 作成・CI 確認・merge・タグ・バックアップ。

## Estimate

- M1: 1〜2 時間（既存実装の確認 + 集計スクリプト + 手順書）
- M2: 1〜2 時間（チェック項目の機械的な消化 + Dependabot PR 7 件処理）
- M3: 30 分（既存ドキュメント再利用）
- M4: 30 分

合計: 3〜5 時間

## Next Plan (Plan 8.5 / Plan 9 候補)

- 自己検証で蓄積した `ux-polish` ラベル Issues の集中処理（件数次第で Plan 8.5 を挟む）
- iOS / Apple Sign-In 実機検証（Apple Developer 取得後）
- 妻配布の方法決定（iOS development build / Android 端末用意 / Web 版）
- アプリアイコン・スプラッシュの差し替え
- Day 0 操作説明資料の本格作成
- 4 週間 KPI 検証フェーズの正式キックオフ
