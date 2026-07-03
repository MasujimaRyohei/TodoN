import { AppHeader } from '@/components/app-header';
import { ScopeInvalidationSync } from '@/components/scope-invalidation-sync';
import { ScopeSwitcher } from '@/components/scope-switcher';
import { getCurrentUserId } from '@/lib/auth/session';
import { getValidatedServerAppScope } from '@/lib/scope-server';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  const { scopeInvalidated } = userId
    ? await getValidatedServerAppScope(userId)
    : { scopeInvalidated: false };

  return (
    <div className="relative min-h-full overflow-hidden bg-todon-bg text-todon-ink">
      <ScopeInvalidationSync invalidated={scopeInvalidated} />
      <div className="todon-blobs" aria-hidden>
        <div className="todon-blob todon-blob-pink" />
        <div className="todon-blob todon-blob-sky" />
        <div className="todon-blob todon-blob-yellow" />
      </div>
      <ScopeSwitcher />
      <AppHeader />
      <main className="relative mx-auto w-full max-w-5xl px-4 py-8 pl-12 sm:pl-14">{children}</main>
    </div>
  );
}
