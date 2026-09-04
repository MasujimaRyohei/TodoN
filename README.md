# TodoN（トドン）

個人とチームの両方に対応したタスク管理アプリ。「今日やること」に焦点を当てたダッシュボード、
柔軟なリピートタスク、キャパシティ（気分・余力）に応じた表示調整、チームのタスクポイント配分などを備える。

## 構成（pnpm モノレポ）

| パッケージ                           | 内容                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| `apps/web`                           | Next.js 16（App Router）。メインアプリ兼 API サーバー |
| `apps/mobile`                        | Expo 54 / React Native。`apps/web` の `/api/*` を利用 |
| `packages/shared`（`@todon/shared`） | 型・`TodoNApiClient`・フレームワーク非依存のロジック  |

- DB: PostgreSQL（Supabase）+ Prisma
- 認証: Supabase Auth（Web はセッション Cookie、Mobile はアクセストークン）
- デプロイ: Vercel（Web）

詳細は [ROADMAP.md](ROADMAP.md)、開発上の注意は [CLAUDE.md](CLAUDE.md) を参照。

## セットアップ

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # 値を埋める
pnpm db:generate
pnpm db:migrate:deploy                    # 本番/共有 DB へマイグレーション適用
```

必要な環境変数（`apps/web/.env`）:

| 変数                                   | 用途                                             |
| -------------------------------------- | ------------------------------------------------ |
| `SUPABASE_DATABASE_URL`                | Prisma 接続（Transaction pooler / 6543）         |
| `SUPABASE_DIRECT_URL`                  | Prisma マイグレーション（Session pooler / 5432） |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase クライアント                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公開キー                                |

Mobile は `EXPO_PUBLIC_API_URL`（または `app.json` の `expo.extra.apiUrl`）に Web の URL を設定する。

## 開発

```bash
pnpm dev:web        # Next.js 開発サーバー（localhost:3000）
pnpm dev:mobile     # expo start
```

## チェック

```bash
pnpm check          # prettier --check + eslint（全ワークスペース）
pnpm build:web      # prisma generate && next build
```

型チェックは `pnpm --filter web exec tsc --noEmit`（`mobile` / `@todon/shared` も同様）。
