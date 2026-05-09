# 家族スケジュール管理アプリ — AI実装憲法（CLAUDE.md）

このファイルは Codex / Claude Code 等のAI実装担当が当アプリのコードを書く際に**絶対遵守**すべき指示書である。Ryouさん（非エンジニア）はAIが生成したコードを目視で完全レビューできないため、ここに書かれたルールが「人間レビューの代替」として機能する。

**本文書の効力**：本ファイルの指示は、アプリ実装の全フェーズ（環境構築・MVP実装・テスト・リリース・運用）にわたって優先度最上位で適用される。spec文書（`docs/superpowers/specs/2026-04-30-family-schedule-app-design.md`）の内容と矛盾しないこと。矛盾を発見したら実装前に必ず Ryouさんに報告する。

---

## 0. 最優先事項（絶対禁止リスト）

以下のいずれかに該当するコードは**絶対に書かないこと**。違反した場合は実装作業を即座に中断し、Ryouさんに状況を報告する。

1. **機密情報のハードコード禁止**：APIキー・Firebase Service Account JSON・OAuth クライアントシークレット・パスワード・トークン等を、ソースコード（.ts / .tsx / .js / .json）に直接書き込んではならない。すべて環境変数（`app.config.js` の `extra` 経由）から読み込む。
2. **Firebase Admin SDK の禁止**：MVP範囲ではサーバーサイドコード（Cloud Functions）を使わない方針。Firebase Admin SDK の秘密鍵を必要とする処理は**MVPでは実装しない**。必要だと感じた場合は実装前に Ryouさんに相談する。
3. **Firestore 直アクセスの禁止**：コンポーネント（`screens/` `components/`）から `getDoc()` `setDoc()` `updateDoc()` 等を直接呼んではならない。必ず `services/firestore.ts` 経由で呼び出す。
4. **認可チェックのクライアント単独依存禁止**：「if文でログインユーザーをチェックすればOK」は不可。**Firestore Security Rules で必ず同等の制御を実装**し、クライアントは「補助的な早期リターン」として書く。
5. **`Math.random()` の暗号用途使用禁止**：招待コード・トークン・推測されては困る値の生成には `crypto.getRandomValues()` を使う。
6. **`eval()` `new Function(string)` `dangerouslySetInnerHTML` の禁止**：ユーザー入力を実行可能コードとして扱う処理は書かない。
7. **`.env*` ファイルのコミット禁止**：`.gitignore` に必ず登録する。git に含めるのは `.env.example`（実値なし）のみ。

---

## 1. アプリの基本情報

| 項目 | 内容 |
|---|---|
| 目的 | フルタイム共働き夫婦のための予定・タスク・とりあえずメモ共有アプリ |
| 配置 | `20_Projects/family-schedule-app/` |
| 技術スタック | React Native (Expo) + TypeScript + Firebase (Sparkプラン: Auth / Firestore / Dynamic Links) |
| 配布（フェーズ1 MVP） | Expo Go（無料） |
| AI実装担当 | Codex / Claude Code（途中切替可） |
| spec文書 | `docs/superpowers/specs/2026-04-30-family-schedule-app-design.md` |
| 実装計画書 | `docs/superpowers/specs/2026-04-30-family-schedule-app-plan.md`（writing-plansスキルで生成予定） |

---

## 2. 実装着手前の必須プロセス

### 2-1. Plan モードで設計を提示してから実装

新規機能・大きめの変更を行う前に、Claude Code の Plan モードで以下を提示し、Ryouさんが承認してから実装に入る：

1. 実装対象のファイル一覧
2. 主要な関数の入出力
3. **セキュリティ上の懸念点**（必須項目。「特になし」と書くだけでも省略しない）
4. テスト戦略

### 2-2. Zero-Shot Chain-of-Thought の適用

複雑な処理を実装する際は、**いきなりコードを書かず**、ステップごとの思考過程を文章で先に出力する。

例：「とりあえずメモ保存処理を実装する前に、(1) 入力検証 (2) Firestore書き込み権限 (3) `createdBy` の自動設定 (4) `status='inbox'` の強制 のそれぞれをどう実装するかを論理的に説明してから、コードを書く」

### 2-3. 探索 → 計画 → 実装 の分離

- **探索**：既存のコード（`services/` `hooks/` 等）を読んで、流用可能な処理・既存パターンを把握する
- **計画**：上記の Plan モード提示
- **実装**：承認後にコード生成

実装中に「探索が不十分」と気づいたら、コードを書き続けず、立ち止まって既存コードを読み直す。

---

## 3. ファイル配置と命名のルール

`docs/superpowers/specs/2026-04-30-family-schedule-app-design.md` 第10章「ディレクトリ構造」に従う。違反例：

- ❌ コンポーネントから `getDoc()` を直接呼ぶ → ✅ `services/firestore.ts` に関数を追加して呼ぶ
- ❌ マジックナンバー `21` `7` `24` をコード内に直書き → ✅ `constants/notifications.ts` で定数化して `import`
- ❌ 画面ごとに型定義を重複 → ✅ `types/CalendarItem.ts` 等で一元管理して `import`
- ❌ `screens/CalendarScreen.tsx` 内で大きなロジック関数を定義 → ✅ `hooks/useCalendarItems.ts` 等にカスタムフックとして切り出す

---

## 4. データ操作のルール（Firebase / Firestore）

### 4-1. すべての Firestore 操作は `services/firestore.ts` 経由

- 読み取り：`getDoc` `getDocs` `onSnapshot` 等
- 書き込み：`setDoc` `updateDoc` `addDoc` 等
- 削除：`deleteDoc`

これらをコンポーネントから直接 import せず、必ずサービス関数（例：`getCalendarItems(householdId)` `createInboxItem(text, createdBy)` `promoteInboxToScheduled(itemId, type, dueAt, assignee)`）として実装する。

### 4-2. データ書き込み時の必須チェック

すべての書き込み処理で以下を確認する：

1. **認証されているか**：`auth.currentUser` が存在する。なければエラー
2. **書き込み対象が自家族のデータか**：書き込み対象の `householdId` が `auth.currentUser.householdId` と一致する。なければエラー
3. **入力サニタイズ**：文字列フィールド（`title` `memo` `displayName` 等）の長さ制限・特殊文字エスケープ
4. **`createdBy` `createdAt` `updatedAt` の自動付与**：呼び出し側に値を要求せず、サービス内部で `auth.currentUser.uid` `serverTimestamp()` を設定

### 4-3. Firestore Security Rules の必須要件

- 第4-4節のルールが`firestore.rules` に記述され、`firebase deploy --only firestore:rules` で適用されていること
- 新コレクションの追加時は、デフォルト拒否（`allow read, write: if false;`）から始め、必要な権限だけを open する
- `@firebase/rules-unit-testing` で**未認証拒否テスト・他家族データ拒否テスト**を必ず書く

### 4-3a. `firestore.rules` 変更時の必須デプロイフロー

`firestore.rules` に変更を含む PR は、以下のすべてを満たして初めて「完了」と扱う：

1. PR が main に merge された
2. **merge 後すぐ**に `firebase deploy --only firestore:rules` を実行し、出力に `Deploy complete!` を確認した
3. Firebase Console（`https://console.firebase.google.com/project/family-schedule-app-b768e/firestore/databases/-default-/rules`）で本番のルールが merge 後のローカル `firestore.rules` と一致していることを目視確認した（行数 + 新規関数名の grep）
4. 当日の `90_Project_Logs/yyyy-mm-dd_log.md` に「本番 Rules デプロイ完了 yyyy-mm-dd hh:mm」を記録した
5. `plan-N-complete` タグ作成・バックアップ zip 作成 などの完了処理は **本番デプロイ完了の後** に行う

**禁止**：

- PR merge 完了をもって rules 変更も完了したと扱うこと
- 「動作確認は実機で済んでいるからデプロイは後回し」と判断すること（本番ルールと開発ルールが乖離した状態は MVP でも許容しない）

**根拠**：

- 2026-05-08 に Plan 5（PR #24）でこの手順が省略され、本番ルールが Plan 3 版（77行）のまま、ローカルが Plan 5 強化版（227行）に乖離した状態を 1 日後の Plan 8 セキュリティチェックで発見した。
- 本ルールは再発防止策として 2026-05-09 に追加した。

**deploy 漏れの検出方法**：

- Firebase Console で `firestore.rules` の行数を見て、ローカル `wc -l firestore.rules` と一致するか
- 新規追加した関数名（例: `isValidInputDuration`）が Firebase Console のルールエディタで Ctrl+F 検索でヒットするか

### 4-4. とりあえずメモ機能の特殊ルール

- `status='inbox'` 状態のドキュメントは `type=null`、`assignee=null`、`dueAt=null` を許容する
- `status='inbox'→'scheduled'` への書き換え時に、`type` `assignee` および種別固有の必須フィールドが揃っていることを**サーバー側（Security Rules）で検証**する
- `createdBy` は最初に書き込んだユーザーの値を保持し、整理時に他メンバーが操作しても上書きしない

---

## 5. 入力検証とサニタイズ

### 5-1. ユーザー入力フィールドの上限

| フィールド | 最大長 | 備考 |
|---|---|---|
| `users.displayName`（呼び名） | 6文字（半角・全角問わず） | プレースホルダー「例：ゆうた、みき、パパ」 |
| `calendar_items.title`（メモ本文・予定タイトル） | 200文字 | 1行〜数行のメモ・タイトルを想定 |
| `calendar_items.memo`（任意メモ） | 1000文字 | 詳細なメモ用 |
| 招待コード入力 | 6文字（数字のみ） | 6桁固定 |

### 5-2. サニタイズの方針

- HTMLタグ：保存時に文字列としてそのまま保存（React Native はデフォルトで XSS 耐性あり）。ただし `dangerouslySetInnerHTML` 相当の処理は使わない
- 改行：保存可能。表示時に正しく改行表示する
- 絵文字：許可
- 制御文字（U+0000〜U+001F の一部）：保存前に除去
- Firestore のフィールド名に使えない文字（`.` `$` `#` `[` `]` `/`）：これらをフィールド**値**として保存することは可能（Firestore 側でサポート）

### 5-3. バリデーションエラーのUX

- バリデーション失敗時はユーザーに具体的な理由を表示（「6文字以内で入力してください」等）
- Firebase 内部のエラーメッセージ（`PERMISSION_DENIED` 等）はユーザーに直接表示せず、人間向けの文言に置き換える

---

## 6. 通知の実装方針

### 6-1. ローカル通知（Expo Notifications）の必須ルール

- 通知 ID は端末ローカルストレージで管理（`AsyncStorage`）
- `calendar_items` の編集／削除時は、対応するローカル通知を必ず取消・再予約する
- 通知時刻の計算は `utils/dateUtils.ts` の純粋関数として実装し、テスト可能にする

### 6-2. 過去日時の通知予約禁止

- `dueAt` `startAt` が現在時刻より過去の場合、通知予約をスキップする（OS側でエラーとなる前にクライアントで弾く）

### 6-3. 担当者向けの出し分け

- 各端末は **自分の担当分のみ** ローカル通知を予約する
- `assignee` が `'both'` `'whoever'` のときは全端末で予約

---

## 7. テストの実装方針

spec 第9章「テスト戦略」に従い、以下5項目の自動テストを実装する：

1. 通知スケジュール計算（`__tests__/notifications.test.ts`）
2. 認証・ペアリング（`__tests__/auth.test.ts`）
3. メンバー削除時のデータ整合性（`__tests__/memberDeletion.test.ts`）
4. やることリストのサマリ通知（`__tests__/todoSummary.test.ts`）
5. とりあえずメモ → 予定/タスク変換（`__tests__/inboxConversion.test.ts`）

### 7-1. テストの基本ルール

- Jest を使用
- Firestore 操作のテストは `@firebase/rules-unit-testing` でエミュレータベース
- E2E テストは書かない（手動テストチェックリストで代替）
- `services/` 配下の関数を直接テストする（コンポーネントテストは最小限）

### 7-2. セキュリティテスト

`firestore.rules` の動作確認テストを `__tests__/firestoreRules.test.ts` に書く（spec 第12-4-1節参照）：

- 未認証ユーザーが `households` `users` `calendar_items` のいずれにもアクセスできない
- `userId='A'` のユーザーが `userId='B'` のドキュメントを読み書きできない
- 自家族外の `calendar_items` を読み書きできない

---

## 8. CI/CD（GitHub Actions）の必須ジョブ

リポジトリ作成と同時に以下の GitHub Actions を有効化する：

| ジョブ | 内容 | 失敗時の挙動 |
|---|---|---|
| lint | ESLint + TypeScript の型チェック | エラーで PR ブロック |
| test | Jest（5項目の自動テスト + Firestoreルールテスト） | 失敗で PR ブロック |
| codeql | GitHub Advanced Security の SAST 解析 | High/Critical で PR ブロック |
| snyk | Snyk による SAST + SCA（依存ライブラリ脆弱性） | High/Critical で PR ブロック |

main ブランチには「ブランチ保護ルール」で上記のすべてのジョブ成功を必須とする。

### 8-1. Ryouさんに GitHub 操作を依頼するときのテンプレート

Codex / Claude Code が GitHub 操作を Ryouさんに依頼するときは、毎回「URL」と「どこに何を貼るか」を明示する。以下のテンプレートを使う。

#### PR 作成時

1. 以下のリンクを開いてください:
   `https://github.com/sakurai-39/family-schedule-app/compare/main...{ブランチ名}?quick_pull=1`
2. ページ上部の「Title」欄に以下を貼り付け:
   `{PRタイトル}`
3. その下の「Leave a comment」欄（PR本文）に以下を貼り付け:
   `{PR本文・日本語}`
4. ページ右下の緑色の「Create pull request」ボタンを押す

#### マージ時

1. 以下の PR ページを開いてください:
   `https://github.com/sakurai-39/family-schedule-app/pull/{PR番号}`
2. ページ下部までスクロール
3. 「Squash and merge」ボタン横の▽をクリックして「Squash and merge」を選択（既に選択済みなら不要）
4. 緑色の「Squash and merge」ボタンを押す
5. 確認ダイアログで「Confirm squash and merge」を押す

#### CI 結果確認時

1. 以下を開いてください:
   `https://github.com/sakurai-39/family-schedule-app/actions`
2. 一番上に表示される実行（最新）の状態を確認:
   - 黄色い丸: 実行中
   - 緑のチェック: 成功
   - 赤のバツ: 失敗
3. 失敗時は実行をクリックしてログを開き、エラー部分をコピーして Codex / Claude Code に送ってください

#### ブランチ削除時

PR がマージされた後、ブランチ削除ボタンが表示される。

1. PR ページ下部の「Delete branch」ボタンを押す

---

## 9. ライブラリ追加時のルール

`npm install` を実行する前に必ず以下を Ryouさんに提示する：

1. ライブラリ名・バージョン
2. 追加する目的（既存コードで代替できないか検討した結果）
3. 直近の更新日・週次ダウンロード数
4. 既知の脆弱性（npm audit / Snyk Advisor で確認）
5. ライセンス

承認後にインストールする。

---

## 10. ログとエラーハンドリング

### 10-1. `console.log` の禁止事項

- 本番ビルドに `console.log` を残さない（リリース前に全削除 or デバッグツールで自動除去）
- ユーザーのメールアドレス・トークン・APIキー・個人情報を `console.log` で出力しない

### 10-2. エラーの扱い

- すべての非同期処理（Promise）は `try/catch` で囲む
- エラー発生時は人間向けのメッセージを画面に表示（Firebase の生エラーは出さない）
- 致命的なエラー（認証失敗・Firestore Permission Denied 等）はログイン画面・エラー画面へ誘導

---

## 11. リリース前の必須確認

第12-6節「公開前セキュリティチェックリスト」をすべて完了してからリリースする。特に：

- ハードコード禁止チェック（grep `service_role` `secret` 等）
- `.gitignore` の `.env*` 登録確認
- Firestore Security Rules の本番反映確認
- 予算アラート設定（Firebase コンソール）
- Snyk / CodeQL の High/Critical 残件ゼロ

---

## 12. このCLAUDE.mdが更新されたとき

本ファイルの内容を変更する際は、変更理由を末尾の「改訂履歴」に追記し、Ryouさんが認識してから実装に取り組むこと。

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-05-01 | 初版作成。spec文書（全12章）に対応するAI実装憲法を記述 |
| 2026-05-05 | Ryouさんへ GitHub 操作を依頼する際のテンプレート（PR作成・マージ・CI確認・ブランチ削除）を追加 |
| 2026-05-09 | 第4-3a節「`firestore.rules` 変更時の必須デプロイフロー」を追加（Plan 5 で deploy 漏れが発生し、Plan 8 セキュリティチェックで検出した事例の再発防止） |
