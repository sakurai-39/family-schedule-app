# Plan 3: 認証 + 家族ペアリングフロー

**ステータス:** 未着手  
**前提:** Plan 2 完了（Firestore Rules + service 層動作）  
**ゴール:** ユーザーがアプリを開いてサインイン → 家族を作成 → 家族メンバーを招待・参加できる状態にする

---

## 完了の定義（Definition of Done）

- [ ] Google Sign-In でログインできる（夫・Android想定）
- [ ] Apple Sign-In でログインできる（妻・iOS想定）
- [ ] 初回ログイン時に `users/{uid}` ドキュメントが自動作成される
- [ ] 「家族を作成」ボタンで `households` ドキュメント作成 + 自分を `members` に追加
- [ ] 招待コード（6桁数字）を発行できる（24時間有効）
- [ ] 招待コードを入力したユーザーが家族に参加できる（最大2人まで）
- [ ] サインアウトできる
- [ ] テスト: 認証関連のサービス層関数 + Rules テストの追加

---

## アーキテクチャ概要

```
[App.tsx]
  └─ AuthProvider (context)
       ├─ useAuth() → currentUser, signIn, signOut
       └─ Firebase Auth state を購読

[screens/]
  ├─ LoginScreen.tsx       — 未認証時に表示
  ├─ HouseholdSetupScreen — 認証済 & householdId なし
  ├─ InviteScreen.tsx      — 招待コード発行 / 入力
  └─ MainTabNavigator      — 認証済 & householdId あり（Plan 4 で実装）

[services/]
  ├─ auth.ts               — Firebase Auth ラッパー（このPlanで作成）
  ├─ firestore.ts          — 既存。invite 関連関数を追加
  └─ pairing.ts            — 招待コード生成・検証ロジック（新規）

[hooks/]
  └─ useAuthFlow.ts        — ログイン → users 作成 → households 確認 のオーケストレーション
```

---

## タスク 1: Firebase Auth セットアップ

### 1-1. 依存追加（要相談）

```
expo install @react-native-google-signin/google-signin
expo install expo-apple-authentication
expo install @react-native-firebase/auth  (or firebase/auth web SDK 経由)
```

**重要:** ライブラリ追加前に必ず Ryouさんに用途・脆弱性・ライセンスを提示し承認を得る（CLAUDE.md 第9章）。

### 1-2. `services/auth.ts`

```typescript
// 主要なエクスポート
export async function signInWithGoogle(): Promise<UserCredential>;
export async function signInWithApple(): Promise<UserCredential>;
export async function signOut(): Promise<void>;
export function onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe;
```

### 1-3. 初回ログイン時の `users` ドキュメント作成

ログイン成功時、`users/{uid}` の存在確認 → なければ `createUser()` を呼ぶ。

```typescript
// hooks/useAuthFlow.ts (例)
async function handleSignInSuccess(firebaseUser: FirebaseUser) {
  const existing = await getUser(db, firebaseUser.uid);
  if (!existing) {
    await createUser(db, {
      userId: firebaseUser.uid,
      displayName: '',  // 初回は空。後でユーザーに入力させる
      accountName: firebaseUser.displayName ?? '',
      email: firebaseUser.email ?? '',
    });
  }
}
```

---

## タスク 2: 家族作成フロー

### 2-1. 「家族を作成」ボタン

`HouseholdSetupScreen.tsx`:

1. `displayName`（呼び名・最大6文字）を入力させる
2. `updateUser({ displayName })` で保存
3. `createHousehold(uid)` を呼ぶ → `householdId` 取得
4. `updateUser({ householdId })` で紐付け
5. メイン画面（Plan 4）へ遷移

### 2-2. Firestore Rules 修正（Plan 3 引き継ぎ事項）

memory `project_family_schedule_app.md` の Plan 3 引き継ぎ項目より:

- `users.householdId` の orphan 防止: `removeMember` 時に対象ユーザーの `householdId` を null に更新する
- `addMember` を招待コード経由のみ許可するよう Rules 強化
- `members.size() <= 2` の guard を Rules に追加

これらを `firestore.rules` に追加してテストする。

---

## タスク 3: 招待コードによるペアリング

### 3-1. `services/pairing.ts`（新規）

```typescript
// 招待コード発行（家族作成者が呼ぶ）
export async function generateInviteCode(
  db: Firestore,
  householdId: string
): Promise<string>;
// → 6桁数字を crypto.getRandomValues() で生成
// → households/{id} に { inviteCode, inviteCodeExpiresAt: now+24h } を保存
// → 既存コードがあれば上書き

// 招待コードで参加（招待される側が呼ぶ）
export async function joinHouseholdByCode(
  db: Firestore,
  userId: string,
  code: string
): Promise<string>;  // 成功時に householdId を返す
// → households を inviteCode でクエリ
// → 期限切れなら例外
// → members.size >= 2 なら例外
// → addMember + updateUser({ householdId }) を実行
```

**セキュリティ要件（CLAUDE.md 第0章）:**
- 6桁コードは `crypto.getRandomValues()` で生成（`Math.random()` 禁止）
- 期限切れチェックは Rules でも実施（クライアント単独依存禁止）

### 3-2. UI

`InviteScreen.tsx`:
- 「招待コードを発行する」ボタン → コード表示（コピーボタン付き）
- 「招待コードを入力する」テキストフィールド + 「参加する」ボタン

`Share.share({ message: 'コード: 482917' })` で LINE 等に共有できる。

### 3-3. Dynamic Links（フェーズ2に延期）

BRAINSTORMING_DECISIONS.md の招待リンク機能は MVP では「コード入力のみ」に絞る。Dynamic Links は次フェーズで実装。

---

## タスク 4: テスト

### 4-1. サービス層テスト（`__tests__/auth.test.ts`）

- `generateInviteCode` で 6桁数字が返ること
- `joinHouseholdByCode` が正しいコードで成功すること
- 期限切れコードで失敗すること
- 既に2人いる家族にコードで参加しようとして失敗すること

### 4-2. Rules テスト（`__tests__/firestoreRules.rules.test.ts` に追加）

- `addMember` を招待コードなしで他人がやろうとして失敗
- `members.size() > 2` の状態で書き込もうとして失敗

---

## タスク 5: サインアウト

`AuthProvider` 経由で `signOut()` を呼ぶ → Firebase 状態がリセットされる → `LoginScreen` へ自動遷移。

---

## 工数目安

| タスク | 目安 |
|---|---|
| 1. Auth セットアップ + service/auth.ts | 2〜3時間 |
| 2. 家族作成 + Rules 修正 | 1〜2時間 |
| 3. ペアリング（招待コード） | 2〜3時間 |
| 4. テスト | 1〜2時間 |
| 5. サインアウト | 30分 |

**合計:** 約7〜10時間（1〜2セッション）

---

## 詰まりやすいポイント

- **Apple Sign-In のセットアップ:** Apple Developer 登録なしでも Expo Go では動作するが、本番ビルドでは必要。MVPフェーズ1（Expo Go配布）では問題なし
- **Google Sign-In のクライアントID:** Firebase コンソールで OAuth クライアントを作成し、`app.config.js` の `extra` に入れる
- **テスト:** `@firebase/rules-unit-testing` ではエミュレータの Auth は使えるが、Google/Apple OAuth はモックする必要あり
- **Rules で「招待コード経由のみ」を表現する難しさ:** クライアント側で `addMember` を呼ぶ前にコード照合 → addMember を呼ぶ実装にし、Rules 側では `members.size() <= 2` のサイズ制限のみで担保する案も検討
