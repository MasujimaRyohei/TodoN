import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="todon-eyebrow">404</p>
      <h1 className="todon-page-title">ページが見つかりません</h1>
      <p className="todon-muted">お探しのページは移動または削除された可能性があります。</p>
      <Link href="/dashboard" className="todon-btn-primary">
        ダッシュボードへ
      </Link>
    </main>
  );
}
