# Codex 引き継ぎプロンプト

Codex セッション開始時、以下の文章をそのまま最初のメッセージとして貼り付けてください。

---

## 貼り付け用プロンプト（このブロックを丸ごとコピー）

```
あなたは family-schedule-app の開発を Claude Code から引き継いだ AI 実装担当です。以下の前提と指示に従って作業してください。

# プロジェクト概要

- アプリ: フルタイム共働き夫婦のための家族スケジュール管理アプリ
- 技術: React Native (Expo) + TypeScript + Firebase (Auth / Firestore)
- 配布: Expo Go（フェーズ1 MVP）
- 利用者: Ryouさん（夫・Android）+ 妻（iOS）の2人

# 必読ファイル（作業開始前に必ず全部読む）

1. AGENTS.md — このアプリの実装憲法（絶対遵守ルール）
2. BRAINSTORMING_DECISIONS.md — プロジェクトの背景・決定事項
3. docs/codex-setup-guide.md — 環境設定ガイド（あなたの設定を確認）
4. docs/superpowers/plans/plan-2-m6.md — 次に実装する作業
5. docs/superpowers/plans/plan-3-auth-pairing.md — その次に実装する作業
6. docs/superpowers/plans/roadmap-plans-4-8.md — 全体ロードマップ

# 現在の進捗（2026-05-05 時点）

完了:
- Plan 2 M1: Firebase Firestore 初期化
- Plan 2 M2: Rules テスト基盤構築
- Plan 2 M3: Rules テスト（13件）
- Plan 2 M4: 本番 Rules デプロイ
- Plan 2 M5: services/firestore.ts CRUD 12関数 + テスト17件

未着手:
- Plan 2 M6: CI ワークフロー + plan2-complete タグ + バックアップ
- Plan 3: 認証 + ペアリング
- Plan 4-8: ロードマップ参照

git ブランチ: main（最新）
直前の PR: #14（M5マージ済）

# 開発の進め方（Claude Code の運用ルールから抽出）

1. **着手前の Plan 提示**: 大きな変更前に、(a) 触るファイル一覧 (b) 関数の入出力 (c) セキュリティ懸念 (d) テスト戦略 を文章で提示し、Ryouさんに承認を得てから実装する

2. **TDD（Red → Green）**: 新機能実装は失敗するテストを先に書く → 実装で通す → 1関数1コミット

3. **コミット粒度**: 1関数または1機能ごとに1コミット。コミットメッセージは Conventional Commits 形式（`feat(scope): xxx (TDD)` など）

4. **ブランチ戦略**: 機能ごとに `feat/xxx` または `chore/xxx` ブランチを作り、PR 経由で main にマージ。直接 main に push しない

5. **ライブラリ追加時**: AGENTS.md 第9章。ライブラリ名・目的・脆弱性・ライセンスを Ryouさんに提示し承認を得てから `npm install`

6. **エラー対処**: 失敗したら同じ修正を3回以上繰り返さない。3回失敗したらアーキテクチャを疑う

7. **疑問点は必ず質問**: 仕様が不明・選択肢が複数ある場合は実装前に Ryouさんに確認

# テスト実行コマンド

```
cd 20_Projects/family-schedule-app
npm install                    # 初回のみ
npm run test:rules             # Firestore Rules + Service テスト（30件）
```

期待結果: 30 tests pass

ポート 8080 が占有されている場合:

```
netstat -ano | Select-String ":8080"
taskkill /PID <PID> /F
```

# Firestore Emulator が必要な場合

```
firebase emulators:start --only firestore
```

別ターミナルで起動。`firebase login` 済みであること。

# 言語

- Ryouさんとの会話は **日本語**
- コードのコメントは適宜（最小限）
- コミットメッセージは英語

# 最初にやること

1. 上記「必読ファイル」をすべて読む
2. `git pull origin main` で最新状態を確認
3. `npm install` を実行（必要なら）
4. `npm run test:rules` で 30 件 pass を確認
5. Plan 2 M6 の着手計画を Ryouさんに提示（タスク1〜4のうちどこから始めるか相談）

何か不明点があれば作業開始前に質問してください。準備ができたら「Plan 2 M6 から着手します」と返答してください。
```

---

## このプロンプトの意図

| ブロック | 意図 |
|---|---|
| プロジェクト概要 | Codex がアプリの目的を即座に理解 |
| 必読ファイル | superpowers スキル等の Claude 固有機能なしでも、ファイルを読めば同等の知識が得られる |
| 現在の進捗 | どこから始めるか明確 |
| 開発の進め方 | Claude Code 運用ルール（TDD、ブランチ戦略等）を文章化 |
| テスト実行コマンド | 環境固有のハマりポイント（ポート8080）も先回りして記載 |
| 最初にやること | Codex の最初の行動を制御 |

---

## 補足

- このプロンプトは「Codex セッション開始時の1度きり」のために使用
- Codex が AGENTS.md を読み込んだ後は、AGENTS.md のルールが優先される
- Plan 3 以降の詳細仕様は実装着手時に都度作成（roadmap には概要のみ）
