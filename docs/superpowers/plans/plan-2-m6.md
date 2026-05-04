# Plan 2 - M6: CI ワークフロー追加 + 完了タグ + バックアップ

**ステータス:** 未着手  
**前提:** Plan 2 M1〜M5 完了済（PR #11, #13, #14 マージ済）  
**ゴール:** Plan 2 を完全クローズし、リポジトリに「ここまで動作保証された状態」のスナップショットを残す

---

## 完了の定義（Definition of Done）

- [ ] GitHub Actions で `npm run test:rules` が PR ごとに自動実行される
- [ ] CI バッジが README に貼られる（任意）
- [ ] `plan2-complete` というアノテーションタグが main の最新コミットに打たれている
- [ ] バックアップ zip が `99_Backups/` に作成されている

---

## タスク 1: Firestore Rules テストの CI ワークフロー追加

### 作成ファイル

`.github/workflows/rules-test.yml`

### 仕様

```yaml
name: Firestore Rules & Service Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  rules-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 20_Projects/family-schedule-app/package-lock.json

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Install dependencies
        working-directory: 20_Projects/family-schedule-app
        run: npm ci

      - name: Run rules + service tests
        working-directory: 20_Projects/family-schedule-app
        run: |
          firebase emulators:exec --only firestore --project demo-test \
            "npm run test:rules"
```

### ポイント

- `firebase emulators:exec` を使うとエミュレータの起動・終了が自動化される（手動 `start` & `taskkill` 不要）
- `working-directory` をアプリのサブディレクトリに固定（モノレポ構造のため）
- Java 21 必須（Firebase エミュレータ要件）
- `--project demo-test` はテストコード内の `projectId` と整合させる

### 既存ファイル変更

`package.json` の `scripts` に以下があることを確認。なければ追加:

```json
{
  "scripts": {
    "test:rules": "jest --config jest.rules.config.js"
  }
}
```

### テスト

- ローカル: `npm run test:rules` が 30 件 pass
- PR を出して GitHub Actions のジョブが緑になるか確認

---

## タスク 2: README に CI バッジ追加（任意）

`20_Projects/family-schedule-app/README.md`（なければ作成）の冒頭に:

```markdown
[![Firestore Rules & Service Tests](https://github.com/sakurai-39/family-schedule-app/actions/workflows/rules-test.yml/badge.svg)](https://github.com/sakurai-39/family-schedule-app/actions/workflows/rules-test.yml)
```

---

## タスク 3: plan2-complete タグを打つ

CI が緑になったあと、main 最新に対して:

```powershell
git checkout main
git pull origin main
git tag -a plan2-complete -m "Plan 2 complete: data model + Firestore Rules + service layer (M1-M6)"
git push origin plan2-complete
```

タグメッセージには M1〜M6 の概要を1行ずつ含めると後で参照しやすい。

---

## タスク 4: バックアップ zip 作成

ワークスペース外のフォルダに、Plan 2 完了時点のスナップショットを保存。

### 出力先

```
C:\Users\ryoum\claude_workspace\first-github-project\99_Backups\
  └── 2026-05-XX_family-schedule-app_plan2-complete.zip
```

### 作成方法

PowerShell で:

```powershell
$date = Get-Date -Format "yyyy-MM-dd"
$src = "C:\Users\ryoum\claude_workspace\first-github-project\20_Projects\family-schedule-app"
$dst = "C:\Users\ryoum\claude_workspace\first-github-project\99_Backups\${date}_family-schedule-app_plan2-complete.zip"

# node_modules を除外して圧縮
Compress-Archive -Path "$src\*" -DestinationPath $dst -Force
# ※ node_modules を含めたくない場合は別途除外処理が必要
```

### node_modules 除外版（推奨）

```powershell
$tempDir = "C:\Temp\fsa_backup"
New-Item -ItemType Directory -Path $tempDir -Force
robocopy $src $tempDir /E /XD node_modules .git /NFL /NDL /NJH /NJS
Compress-Archive -Path "$tempDir\*" -DestinationPath $dst -Force
Remove-Item $tempDir -Recurse -Force
```

---

## 工数目安

| タスク | 目安 |
|---|---|
| 1. CI ワークフロー追加 | 30〜60分（CI 緑になるまでのデバッグ込み） |
| 2. README バッジ | 5分 |
| 3. タグ付与 | 5分 |
| 4. バックアップ | 10分 |

**合計:** 1時間程度

---

## 注意点

- CI ジョブが初回失敗しても焦らない。`actions/checkout` のサブパス指定や Firebase CLI のバージョン差で詰まることが多い
- ローカルで `npm run test:rules` が確実に通る状態にしてから CI を回す
- main へのマージ前に PR で CI が緑になったことを確認
