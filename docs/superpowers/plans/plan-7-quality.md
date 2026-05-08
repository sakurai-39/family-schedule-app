# Plan 7: テスト・品質

Created: 2026-05-08

## Goal

MVP の主要機能について、AGENTS.md 第7章にある自動テスト項目と手動確認項目を整理し、Plan 8 のリリース準備に進める品質状態にする。

## Scope

- AGENTS.md 第7章の5項目に対応するテストファイルを揃える。
- `npm test` / `npm run test:rules` / `npm run typecheck` / `npm run lint` を通す。
- High / Critical の依存関係脆弱性がないことを確認する。
- 手動テストチェックリストを作成する。

## Test Coverage Mapping

| AGENTS.md item                   | Test file                                                                                                                    | Status  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------- |
| 通知スケジュール計算             | `src/__tests__/notifications.test.ts`                                                                                        | Covered |
| 認証・ペアリング                 | `src/__tests__/auth.test.ts`, `src/__tests__/pairing.test.ts`, `src/__tests__/useAuthFlow.test.ts`                           | Covered |
| メンバー削除時のデータ整合性     | `src/__tests__/memberDeletion.test.ts`, `src/__tests__/firestoreService.rules.test.ts`                                       | Covered |
| やることリストのサマリ通知       | `src/__tests__/todoSummary.test.ts`, `src/__tests__/notifications.test.ts`                                                   | Covered |
| とりあえずメモ → 予定/タスク変換 | `src/__tests__/inboxConversion.test.ts`, `src/__tests__/scheduleDraft.test.ts`, `src/__tests__/scheduledItemService.test.ts` | Covered |

## Files

- `docs/superpowers/plans/plan-7-quality.md`
- `docs/superpowers/plans/plan-7-manual-test-checklist.md`
- `src/__tests__/memberDeletion.test.ts`
- `src/__tests__/todoSummary.test.ts`
- `src/__tests__/inboxConversion.test.ts`

## Security Notes

- No Firestore Security Rules change is planned.
- No new Firebase access pattern is added.
- No API keys, OAuth secrets, service account JSON, `.env*`, or `google-services.json` are modified.
- Tests verify that member removal does not mutate existing calendar item `assignee` / `createdBy` tags.
- Tests verify that invalid inbox conversion input is rejected before a Firestore write.

## Commands

Run before PR:

```powershell
npm test -- --runInBand
npm run typecheck
npm run lint
npm run test:rules
npm audit --audit-level=high --omit=dev
```

Expected:

- Unit tests pass.
- Rules tests pass.
- TypeScript has no errors.
- ESLint has no errors. Existing `firestoreService.rules.test.ts` warning-only output may remain.
- `npm audit --audit-level=high --omit=dev` exits successfully with no High/Critical findings.

## Manual Verification

Use `docs/superpowers/plans/plan-7-manual-test-checklist.md`.

Plan 7 does not add user-facing features. The manual checklist is a release-readiness smoke test for the features completed in Plans 3-6.
