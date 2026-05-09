# Plan 8.5 / Design Refresh: 家族向け温かみ重視のビジュアル

Created: 2026-05-10 (Ryouさん自己検証フィードバック由来)
Reference: ミヤマグラフィックス （Ryouさん共有スクショ）
Status: 計画案（Ryouさんレビュー待ち）

## 背景

自己検証中に Ryouさんから:

> 全体的な見た目が最初に計画していたデザインとは程遠く感じます。家族向けのアプリなのであまり今のデザインは見た目的にターゲットに刺さらないと思います。

Ryouさんが理想としてシェアした参考デザインは「ミヤマグラフィックス」のブランドガイド。家族向けに温かみ・親しみ・柔らかさを感じる雰囲気。

## 参考デザインから抽出した要素

### カラーパレット

| 役割 | HEX | 名前 |
|---|---|---|
| メイン文字色 | #111111 | ほぼ黒 |
| 背景色 | #F7F3EF | ベージュ / アイボリー |
| 主要 CTA / アクセント | #FFE59A | 優しい黄色 |
| 補助カラー (情報) | #A9D3FF | 水色 |
| 補助カラー (注意) | #FFB5C1 | ピンク |
| 補助カラー (成功) | #B7E1D1 | ミント |

### タイポグラフィ

- **Noto Sans JP Rounded** （丸みのある日本語ゴシック）
- ウェイト: Bold (見出し) / Medium (サブ見出し) / Regular (本文)

### 形状・シルエット

- 大きな角丸 (border-radius: 16-24px)
- ふんわりしたカード（subtle shadow / 薄い境界線）
- ボタンは 半円形（pill shape）
- アクセント矢印アイコン → が CTA 内に配置されている

### ムード

- 友好的・温かい・くつろげる
- 機能優先より感情に訴える
- 子どもがいる家庭でも違和感がない（kawaii 寄り）

## 現状とのギャップ

| 観点 | 現状 | 変更後 |
|---|---|---|
| 主要色 | 緑 #205f4b（フォレスト系） | 黄色 #FFE59A（アクセント）+ 黒文字 |
| 背景 | #f7f7f2 ベージュ ✅ | 維持 (近い) |
| ボタン形状 | 角丸 8px | 角丸 24px or pill |
| カード | 白 + 薄い境界線 | 白 + 大きい角丸 + ソフトシャドウ |
| フォント | システム標準ゴシック | Noto Sans JP Rounded |
| アイコン | テキストのみ | 一部アイコン追加（FAB の +、↗ など） |
| 担当者バッジ | 緑 / 紫 / 黄 | パステル4色（緑/ピンク/水色/黄色） |

## 実装範囲

### Phase A: テーマ基盤の整備

新ファイル `src/theme/colors.ts`:

```typescript
export const colors = {
  text: '#111111',
  textMuted: '#68706b',
  background: '#F7F3EF',
  card: '#FFFFFF',
  border: '#E8E2D8',
  accent: '#FFE59A',          // メイン CTA
  accentDark: '#E8C770',       // ホバー / 押下時
  info: '#A9D3FF',
  warning: '#FFB5C1',
  success: '#B7E1D1',
  error: '#D67070',
  // 担当者バッジ用（4 色循環）
  assigneeColors: ['#B7E1D1', '#FFB5C1', '#A9D3FF', '#FFE59A'],
} as const;
```

新ファイル `src/theme/spacing.ts`:

```typescript
export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
} as const;
```

### Phase B: フォント追加

ライブラリ追加:

- `@expo-google-fonts/noto-sans-jp` または `expo-font` で Noto Sans JP Rounded 読み込み
- `expo-splash-screen` でスプラッシュ中にフォント読み込み

CLAUDE.md 第 9 章プロセスを通す。

### Phase C: コンポーネント刷新

優先順位順:

1. **ボタン共通コンポーネント** `src/components/Button.tsx` を新設
   - primary (黄色背景 + 黒文字 + 矢印 ↗)
   - secondary (白背景 + 黒枠)
   - text (リンク風)
2. **カード共通コンポーネント** `src/components/Card.tsx`
   - 白背景 + 大きい角丸 + ソフトシャドウ
3. **AssigneeBadge.tsx**: 4 色循環パステル
4. **CalendarItemCard.tsx**: 角丸 + シャドウ
5. **CalendarScreen.tsx**: ボタン色変更（緑 → 黄色）
6. **InboxScreen.tsx**: 同上
7. **CalendarItemEditScreen.tsx**: 同上
8. **LoginScreen.tsx**: 同上
9. **HouseholdSetupScreen.tsx**: 同上
10. **InviteScreen.tsx**: 同上

### Phase D: ファイン調整

- 月カレンダーの「選択日」ハイライトを緑 → 黄色アクセントに
- 「やることリストが N 件」バナーをミント色に
- エラーメッセージをピンク系に

## アプリアイコン・スプラッシュ画面

参考デザインのキャラクター（黒い目玉のみのブロブ）はミヤマグラフィックス独自のものなので使えない。代替案:

- A: AI 画像生成（GPT-Image / DALL·E）で家族向けカレンダーアイコンを作る
- B: フリー素材から家族・カレンダーモチーフを選ぶ
- C: 自分で描く（妻にお願いする手もあり）

このフェーズはアイコン素材決めから始まるため、別 PR / 別日に切り出すのが現実的。

## テスト戦略

- スナップショットテストは入れない（既存パターン踏襲）
- 既存のすべての自動テストが pass し続けることを確認
- 手動テストで全画面の見た目を確認

## セキュリティ

- カラー定数追加・コンポーネント変更のみで Firestore Rules 変更なし
- フォント追加のみライブラリ追加（CLAUDE.md 第 9 章プロセス通す）

## 工数見積

- Phase A (テーマ基盤): 1 時間
- Phase B (フォント追加): 1-2 時間（ライブラリ調査含む）
- Phase C (コンポーネント刷新 10 ファイル): 4-6 時間
- Phase D (ファイン調整): 1-2 時間
- アプリアイコン・スプラッシュ: 別途 2-4 時間

**合計**: 約 10-15 時間（2-3 セッションに分けるのが現実的）

## 段階的リリース戦略

一気に全部変えると差分が大きすぎてレビュー困難。以下の小 PR に分ける:

1. **PR a**: theme/ 追加 + Button.tsx 共通化 + 1-2 画面で適用
2. **PR b**: Card.tsx 共通化 + 残り画面に適用
3. **PR c**: 担当者バッジ 4 色化
4. **PR d**: フォント追加
5. **PR e**: アプリアイコン・スプラッシュ

## Ryouさんに確認したいこと

1. カラーパレット（#FFE59A 黄色をメイン CTA、#A9D3FF/#FFB5C1/#B7E1D1 を補助）でよいか？
2. フォントは Noto Sans JP Rounded で確定でよいか（読み込み時間が増える可能性あり）？
3. アイコン作成は AI 生成 / フリー素材 / 妻に依頼 のどれで進めるか？
4. 段階的リリースの分割案（5 PRに分ける）でよいか？それとも一気がよいか？
