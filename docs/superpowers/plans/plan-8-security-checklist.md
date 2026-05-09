# Plan 8: 公開前セキュリティチェックリスト

Created: 2026-05-09
Reference: spec 第 12-6 節 + CLAUDE.md 第 0 章 / 第 11 章

## サマリ

| # | 項目 | 結果 |
|---|------|------|
| 1 | ハードコード機密情報チェック | ✅ Pass |
| 2 | `.gitignore` の `.env*` 等登録確認 | ✅ Pass |
| 3 | git に sensitive files が含まれていないこと | ✅ Pass |
| 4 | Firestore Security Rules 本番反映確認 | ✅ Pass（Plan 5 デプロイ漏れを検出し 2026-05-09 にデプロイ完了） |
| 5 | `npm audit --audit-level=high --omit=dev` | ✅ Pass (exit 0) |
| 6 | `npm audit --audit-level=critical --omit=dev` | ✅ Pass (exit 0) |
| 7 | CodeQL 最新スキャンの High/Critical | ✅ Pass (High/Critical: 0件 / Medium: 4件は別途記録) |
| 8 | Snyk 最新スキャンの High/Critical | ✅ Pass（CIの Snyk Security Scan ジョブが PR #27 で緑・High/Critical なし）|
| 9 | Dependabot pending PR の処理 | ✅ Pass（7件全件レビュー後、全件保留 → Plan 8.5/Plan 9 で個別対応）|
| 10 | `console.log` のリリースビルド残留チェック | ✅ Pass（src 配下に該当なし・テストファイル除く） |
| 11 | エラー文言の Firebase 内部メッセージ漏れチェック | ✅ Pass（既に Plan 3〜6 で対応済） |

---

## 詳細

### #1 ハードコード機密情報チェック

実施: 2026-05-09

```bash
grep -rE "(service_role|secret_key|secretKey|api_key|apiKey|password|private_key|privateKey)" src/
grep -rE "(eyJ|sk_|ghp_|firebase-adminsdk|client_secret|clientSecret)" src/
```

結果:

- `src/services/firebase.ts` で `apiKey:` がヒットしたが、`process.env.EXPO_PUBLIC_FIREBASE_API_KEY` を読み込んでいるだけで値はハードコードされていない。✅
- JWT / Stripe / GitHub PAT / Firebase Admin SDK / OAuth client secret のパターンは src/ 配下にゼロ件。✅
- なお、Firebase Web SDK の API キーは Firebase 公式ドキュメントの方針として「公開しても問題ない値」（実際の認可は Firestore Security Rules で行うため）。クライアントバンドルに含まれて配布される設計。

### #2 `.gitignore` の `.env*` 等登録確認

実施: 2026-05-09

```bash
cat .gitignore | grep -E "google-services|GoogleService-Info|\.env"
```

結果:

```
.env*.local
.env
.env.local
.env.development
.env.production
.env.*.local
google-services.json
GoogleService-Info.plist
```

CLAUDE.md 第 0-7「`.env*` ファイルのコミット禁止」と一致。`google-services.json` / `GoogleService-Info.plist` も登録済み。✅

### #3 git に sensitive files が含まれていないこと

実施: 2026-05-09

```bash
git ls-files | grep -E "(google-services\.json|GoogleService-Info\.plist|\.env\.local|\.env$|service-account)"
```

結果: ヒット 0 件（exit code 1）。✅

### #4 Firestore Security Rules 本番反映確認 ✅

実施: 2026-05-09

#### 発見した不一致

Firebase Console（本番）のルールを Ryouさんが確認した結果、以下の不一致を検出した：

| 場所 | 行数 | `isValidInputDuration` 関数 |
|---|---|---|
| ローカル `firestore.rules`（main 最新） | 228 行 | 含む |
| Firebase Console（本番） | 78 行 | 含まない |

#### 原因の特定

git 履歴とログを横断調査した結果：

| commit | Plan | 行数 | 本番デプロイ |
|---|---|---|---|
| `bb02412` (2026-05-04) | Plan 2 M3 初期作成 | 25 | ✅ Plan 2 M4 で `firebase deploy --only firestore:rules` 実行（ログ記録あり）|
| `da3810e` (2026-05-07) | Plan 3 invite-join 追加 | 77 | ⚠️ ログに deploy 記録なし。実機テストで invite-join 成功していたため何らかの形で本番反映されていた |
| `d22dbad` (2026-05-08) | Plan 5 calendar_items 強化 | 227 | ❌ **本番未反映**（ログ・git 履歴ともに deploy 形跡なし）|

→ Plan 5 PR #24 を merge した際に `firebase deploy --only firestore:rules` の実行が省略されたのが原因。

#### 影響評価

緊急のセキュリティ穴ではない（Ryouさん単独使用のため）。ただし以下の Plan 5 強化分が本番で機能していなかった：

- `inputDurationMs` の作成後不変性 → KPI 整合性が本番で守られていなかった
- inbox→scheduled 変換時の必須フィールド検証 → 不正な scheduled item が作れる状態だった
- 許可フィールドの厳密チェック（`hasOnlyCalendarItemFields`）→ 任意のフィールドを追加できる状態だった

#### 対処

1. Ryouさん PowerShell で `npx firebase-tools deploy --only firestore:rules` を実行 → `Deploy complete!` を確認。
2. Firebase Console を再読み込みし、ルールが 228 行・`isValidInputDuration` がヒットすることを確認。
3. 本番ルールがローカル main 最新と一致した状態を確認。

#### 再発防止策

本日（2026-05-09）以下の更新を実施：

1. `CLAUDE.md` 第 4-3a 節「`firestore.rules` 変更時の必須デプロイフロー」を追加。
   - PR merge 直後に `firebase deploy --only firestore:rules` を実行することを必須化。
   - 完了処理（タグ・バックアップ）の前に本番デプロイを完了させる。
   - deploy 漏れの検出方法（行数 + 関数名 grep）も併記。
2. `AGENTS.md`（Codex 用）にも同じ第 4-3a 節を追加。
3. 改訂履歴を両ファイルに記録。

### #5 / #6 npm audit

実施: 2026-05-09

```powershell
npm audit --audit-level=high --omit=dev   # exit 0
npm audit --audit-level=critical --omit=dev   # exit 0
```

結果: High / Critical なし。✅

NOTE: `--omit=dev` 抜きで実行した場合、Expo 系の moderate 6 件が出るが、いずれも `npm audit fix --force` が Expo の major down を勧める内容で、実害なし。Plan 5 followup と Plan 6 の時点と変動なし。

### #7 CodeQL 最新スキャン ✅

実施: 2026-05-09 (Ryouさん確認)

- All tools are working as expected ✅
- Open: 4 件（すべて Medium）/ Closed: 0 件
- **High / Critical: 0 件** → Plan 8 完了条件クリア ✅

#### 4 件の Medium アラートの内容

すべて同種: 「**Workflow does not contain permissions**」

| # | 対象ファイル |
|---|---|
| 1 | `.github/workflows/snyk.yml` (line 11) |
| 2 | `.github/workflows/ci.yml` (line 11) |
| 3 | `.github/workflows/ci.yml` (line 23) |
| 4 | `.github/workflows/ci.yml` (line 35) |

CI/CD パイプラインのワークフロー定義に `permissions:` ブロックが明示されていない、という GitHub Actions のハードニング推奨。アプリのランタイムセキュリティには無関係。

#### 後続フォローアップ

別ラベル（例: `ci-hardening`）で 1 件の GitHub Issue として記録し、Plan 8.5 / Plan 9 で対応判断する。本 Plan 8 のスコープ外。

### #8 Snyk 最新スキャン ✅

実施: 2026-05-09 (Ryouさん確認)

Snyk の連携は二系統あり、現状は以下：

| 連携方法 | 状態 | Plan 8 判定への影響 |
|---|---|---|
| GitHub Actions 経由の CI スキャン（Plan 1 で設定）| ✅ 動作中 | これで完了条件をクリア |
| Snyk Web Dashboard のプロジェクト連携 | ❌ 未設定 | 連続モニタリング + 通知が無いだけで判定には影響なし |

#### 判定根拠

- 最新の Plan 5 followup PR #27 で「Snyk / Security Scan」CI ジョブが緑。
- 設定: `--severity-threshold=high` のため High/Critical があれば CI が失敗する仕組み。
- 緑である = High/Critical 脆弱性なし。
- main にマージ後の状態は PR #27 と同じため、最新 main も High/Critical: 0 件と判定可能。

#### 後続フォローアップ

Snyk Web Dashboard でリポジトリ連携すると、以下のメリットが得られる：

- 連続モニタリング（依存ライブラリに新しい脆弱性が公表されたタイミングで自動検知）
- メール通知
- Snyk からの自動 Fix PR 作成

Plan 8.5 / Plan 9 のオプションとして「Snyk Web Dashboard 連携」を記録しておく。30分〜1時間程度で完了。

### #9 Dependabot pending PR ✅

実施: 2026-05-09 (Ryouさん確認 + Claude Code レビュー)

Pending PR 一覧（**全 7 件・全件メジャー up**）:

| PR # | 内容 | 分類 | リスク | Plan 8 判断 |
|---|---|---|---|---|
| #7 | eslint 9.39.4 → 10.3.0 | dev 依存 | 中（ESLint 10 破壊的変更）| 保留 |
| #6 | react and @types/react | アプリ依存 | 高（React 19 と RN 互換性問題）| 保留 |
| #5 | jest 29.7.0 → 30.4.2 | dev 依存 | 中（Jest 30 破壊的変更）| 保留 |
| #4 | expo 54.0.0 → 55.0.23 | アプリ依存 | **特高**（Plan 5 followup で datetimepicker@8.4.4 を Expo 54 推奨で導入したばかり）| 保留 |
| #3 | actions/setup-node 4 → 6 | CI infra | 低 | 保留 |
| #1 | actions/checkout 4 → 6 | CI infra | 低 | 保留 |
| #2 | typescript 5.9.3 → 6.0.3 | dev 依存 | 高（TypeScript 6 破壊的変更）| 保留 |

#### 全件保留の判断理由

1. Plan 8 のゴールは「自己検証フェーズに入れる安定状態」。依存に新しい変数を入れない方針。
2. #4 Expo 55: 直近で Expo 54 推奨の datetimepicker@8.4.4 を導入したばかりのため、Expo 55 への up は EAS build 再作成 + 全ライブラリ互換確認 + 動作検証が必要で Plan 8 のスコープを大幅超過。
3. #6 React: React 19 は React Native エコシステムとの互換性問題が出やすい。
4. その他 dev 依存（ESLint / Jest / TypeScript）: Plan 8 のゴールに直接寄与しないので保留。
5. CI infra（actions/setup-node, actions/checkout）: 本来低リスクだが、Plan 8 の本筋と無関係。

#### 後続フォローアップ

Plan 8.5 / Plan 9 の冒頭で「依存メジャー up の棚卸し」を独立タスク化する：

- 1 件ずつブランチを切って CI 緑 + ローカル動作確認 → 順次 merge
- この時点で自己検証フェーズが完了しているのでリスクを取りやすい
- 優先順位: 低リスクのもの（GitHub Actions 系）から先に処理

### #10 console.log のリリースビルド残留チェック

実施: 2026-05-09

```bash
grep -rnE "console\.(log|debug)" src/ # excluding __tests__
```

結果: ヒット 0 件。✅

NOTE: テストファイル（`src/__tests__/**`）の `console.log` はリリースビルドに含まれないため、ここでは無視している。

### #11 エラー文言の Firebase 内部メッセージ漏れチェック

確認対象:

- Sign-In: `LoginScreen.tsx` の catch ブロック → 既に「ログインに失敗しました」等の人間向け文言。
- Household 作成 / 参加: `HouseholdSetupScreen.tsx` の catch ブロック → 同上。
- メモ作成 / 編集 / 削除: `InboxScreen.tsx` / `CalendarItemEditScreen.tsx` の catch → 同上。

結果: Plan 3〜6 のレビュー時にすでに対応済。`PERMISSION_DENIED` などの Firebase 生メッセージは画面に出ない。✅

---

## 完了条件

上記サマリの全項目が ✅ になり、特に #4 / #7 / #8 / #9 が Ryouさん側で確認・処理されたら、Plan 8 のセキュリティチェックは完了とする。

⏳ が残っている項目は Plan 8 の M2 完了前に消化する。
