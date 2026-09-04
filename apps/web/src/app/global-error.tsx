'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff8f0',
          color: '#3f2f2a',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>問題が発生しました</h1>
        <p style={{ color: '#78716c' }}>
          予期しないエラーが発生しました。時間をおいて再度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 'none',
            borderRadius: 10,
            background: '#f97316',
            color: '#fff',
            fontWeight: 700,
            padding: '12px 20px',
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
