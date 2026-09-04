'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="todon-eyebrow">エラー</p>
      <h1 className="todon-page-title">問題が発生しました</h1>
      <p className="todon-muted">
        しばらくしてからもう一度お試しください。続く場合は時間をおいてアクセスしてください。
      </p>
      <button type="button" onClick={reset} className="todon-btn-primary">
        再読み込み
      </button>
    </main>
  );
}
