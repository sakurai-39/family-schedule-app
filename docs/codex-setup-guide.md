# Codex デスクトップ版 セットアップガイド

family-schedule-app の開発を Claude Code から Codex に引き継ぐための設定手順。

**目的:** Claude Code と同等の権限・環境で Codex が作業できるようにする。

---

## 1. 現在の Claude Code 環境（参考）

引き継ぎ時にこの状態を再現することを目指す。

| 項目 | 値 |
|---|---|
| Node.js | v24.14.1 |
| npm | 11.11.0 |
| Java JDK | 21.0.10 LTS（Firestore Emulator に必須） |
| Firebase CLI | 15.16.0 |
| OS | Windows 11 |
| Shell | PowerShell（Bash も併用可） |
| Git user.name | Sakurai |
| Git user.email | sakurai@example.com |
| 作業ディレクトリ | `C:\Users\ryoum\claude_workspace\first-github-project\20_Projects\family-schedule-app` |
| 書き込み権限 | 上記配下 + ログ・計画書フォルダ |
| ネットワーク | 有効（npm install, firebase deploy, git push が必要） |

---

## 2. Codex デスクトップ版 GUI 設定

### 2-1. 承認ポリシー

**設定値: `Never`**

意味: Codex がコマンド実行・ファイル書き込みを行うとき、毎回ユーザーに確認しない。

理由:
- 引き継ぎ後の長時間作業を想定するため、都度確認は非効率
- サンドボックス（後述）で書き込み範囲が物理的に制限されるので、Never でも事故は起きにくい

### 2-2. サンドボックス

**設定値: `Workspace write`**

意味:
- **読み込み**: ファイルシステム全体を読める（参考資料の参照に必要）
- **書き込み**: 設定で許可したディレクトリ配下のみ書ける

理由:
- 全許可（`Danger full access`）はリスクが大きい
- 読み込み専用（`Read only`）だとファイル編集・コミットができない
- Workspace write がちょうどいい中間

### 2-3. ワークスペースルート

Codex を起動するときの「プロジェクトルート」として以下を指定:

```
C:\Users\ryoum\claude_workspace\first-github-project\20_Projects\family-schedule-app
```

ここを基準にサンドボックスが効くため、原則ここの中だけが編集対象。

---

## 3. config.toml カスタム設定

### 3-1. 場所

```
C:\Users\ryoum\.codex\config.toml
```

なければ手動で作成。

### 3-2. 推奨内容

```toml
# ===== モデル設定 =====
model = "gpt-5-codex"
model_reasoning_effort = "high"

# ===== 承認・サンドボックス =====
# GUI で設定済みなら省略可。明示しておくと安心
approval_policy = "never"
sandbox_mode = "workspace-write"

# ===== Workspace write のときだけ効く設定 =====
[sandbox_workspace_write]
# 書き込みを許可する追加ディレクトリ
# ワークスペースルート（family-schedule-app）は自動で書ける
writable_roots = [
  "C:/Users/ryoum/claude_workspace/first-github-project/90_Project_Logs",
  "C:/Users/ryoum/claude_workspace/first-github-project/10_Planning",
]

# ネットワーク有効化（firebase deploy, npm install, git push に必須）
network_access = true

# ===== シェル =====
# Windows なら PowerShell を優先
# ※ Codex のバージョンによってはこのキーがない場合あり
[shell_environment_policy]
inherit = "all"
```

### 3-3. 各項目の意味と Claude Code との対応

| キー | 値 | Claude Code での対応 |
|---|---|---|
| `model` | gpt-5-codex | Claude は `claude-opus-4-7` を使用 |
| `approval_policy = "never"` | 自動承認 | Claude の `bypassPermissions` 相当 |
| `sandbox_mode = "workspace-write"` | 限定書き込み | Claude も同等の制限あり |
| `writable_roots` | 追加書き込み許可 | Claude は親フォルダもアクセス可 |
| `network_access = true` | ネット有効 | Claude もデフォルト有効 |

---

## 4. プロジェクト固有の前提条件

Codex がこのリポジトリで作業を始める前に、以下が揃っていることを確認。

### 4-1. リポジトリの状態

```powershell
cd C:\Users\ryoum\claude_workspace\first-github-project\20_Projects\family-schedule-app
git status         # クリーンであること
git log --oneline -5
git remote -v      # origin が GitHub になっていること
```

### 4-2. 依存関係のインストール

```powershell
npm install
```

`node_modules/` が既にある場合でも、Codex 環境で再インストール推奨（OS差異対策）。

### 4-3. Firebase CLI 認証

```powershell
firebase login
firebase projects:list   # family-schedule-app-xxx が見えること
```

未認証だと `firebase deploy` ができない。

### 4-4. テスト実行確認

```powershell
# Firestore Emulator を起動してから
npm run test:rules
```

期待結果: 30 tests pass（13 Rules + 17 Service）

ポート 8080 が他プロセスに使われている場合:

```powershell
netstat -ano | Select-String ":8080"
taskkill /PID <PID> /F
```

---

## 5. AGENTS.md（Codex のルールブック）

Codex は `AGENTS.md` というファイル名でプロジェクトルールを読み込む（Claude Code の `CLAUDE.md` 相当）。

ワークスペースルートの `CLAUDE.md` 内容を `AGENTS.md` としてもコピーする。  
※ 引き継ぎ作業の中で別途用意する。

---

## 6. Claude Code との役割分担（ハイブリッド運用）

| タイミング | 担当 | 作業 |
|---|---|---|
| 〜2026-05-09 | Codex | M6 → Plan 3 実装継続 |
| 2026-05-09 以降 | Claude Code | Codex 実装のレビュー・リファクタ・次 Plan 着手 |
| 以降随時 | 両方 | 制限状況に応じて使い分け |

ファイルは1つのリポジトリで管理されるため、どちらが書いても次のセッションで引き継げる。

---

## 7. トラブルシュート

| 症状 | 対処 |
|---|---|
| `firestore-rules-tests` が落ちる | エミュレータ未起動。`firebase emulators:start --only firestore` を別ターミナルで起動 |
| 8080 ポート占有 | 上記 4-4 の taskkill 手順 |
| `firebase deploy` で permission denied | `firebase login --reauth` |
| Codex がファイル書き込み拒否 | `writable_roots` の path を見直す。Windows パスは `/` 区切り推奨 |
| `npm test` が遅い | jest-expo preset が React Native のため。`test:rules` は Node env なので速い |

---

## 8. 引き継ぎ完了チェックリスト

- [ ] Codex デスクトップ起動 → ワークスペース選択
- [ ] 承認ポリシー = Never
- [ ] サンドボックス = Workspace write
- [ ] config.toml 設置（任意だが推奨）
- [ ] `git pull origin main` で最新取得
- [ ] `npm install` 実行
- [ ] `npm run test:rules` で 30 tests 通過
- [ ] `AGENTS.md` がリポジトリ内にあることを確認
- [ ] 引き継ぎプロンプト（別途作成）を Codex に貼り付け
