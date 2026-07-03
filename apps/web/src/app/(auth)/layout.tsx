import type { ReactNode } from 'react';

import { AppLogo } from '@/components/app-logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-todon-bg text-todon-ink">
      <div className="todon-blobs" aria-hidden>
        <div className="todon-blob todon-blob-pink" />
        <div className="todon-blob todon-blob-sky" />
        <div className="todon-blob todon-blob-yellow" />
      </div>
      <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-10 text-center">
          <p className="todon-eyebrow">はじめまして</p>
          <div className="mt-3 flex justify-center">
            <AppLogo size="md" linked={false} priority />
          </div>
          <p className="mt-3 text-sm text-todon-ink-muted">生活と仕事の「詰まり」を、やさしくほどく</p>
        </div>
        <div className="todon-card p-8">{children}</div>
      </div>
    </div>
  );
}
