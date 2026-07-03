import { AppShell } from '@/components/app-shell';
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
      <AppShell>{children}</AppShell>
    </div>
  );
}
