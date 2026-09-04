# apps/web

TodoN の Web アプリ（Next.js 16 / App Router）。API ルート（`src/app/api/*`）を含むため、
モノレポ唯一のバックエンドでもある。

セットアップ・コマンド・アーキテクチャはリポジトリルートの [README.md](../../README.md) と
[CLAUDE.md](../../CLAUDE.md) を参照。

```bash
pnpm dev:web        # ルートから: 開発サーバー（localhost:3000）
pnpm build:web      # prisma generate && next build
```
