# Plan 5 Follow-ups

Created: 2026-05-08

## Date / Time Picker UX

Android development build で Plan 5 の実機確認後、Ryouさんから以下の要望あり。

- 「予定」または「期限あり」で保存するとき、日付・時刻を手入力ではなく、タップしてすぐ設定できる仕様にしたい。

## Recommendation

Plan 5 の初回 PR では、現在の手入力 `DateTimeInput` のまま完了する。

理由:

- PR は CI 緑、Android 実機確認も完了している。
- ここでネイティブ date/time picker を入れるとスコープが広がる。
- `@react-native-community/datetimepicker` などを追加する場合は、AGENTS.md 第9章に従ってライブラリ調査・承認・導入・再 EAS build が必要。
- 現在の手入力でも機能は成立しているため、UX改善として別PR化するのが安全。

## Candidate Task

Plan 5 follow-up または Plan 6 着手前の小PRとして、`DateTimeInput` をタップ式 picker に差し替える。

実装前に確認すること:

- 候補ライブラリ名・バージョン
- 目的
- 直近の更新日・週次ダウンロード数
- 既知の脆弱性
- ライセンス
- Android development build の再作成が必要か
