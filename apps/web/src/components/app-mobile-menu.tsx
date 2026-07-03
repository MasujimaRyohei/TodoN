'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { isNavActive, primaryNav, secondaryNav } from '@/components/nav-items';
import { ScopeSwitcherPanel } from '@/components/scope-switcher-panel';
import { LogoutButton } from '@/components/logout-button';
import { TeamNavLink } from '@/components/team-nav-link';

type AppMobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function AppMobileMenu({ open, onClose }: AppMobileMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] sm:hidden" role="dialog" aria-modal="true" aria-label="メニュー">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
        aria-label="メニューを閉じる"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 top-12 flex max-h-[calc(100dvh-3rem)] flex-col rounded-t-[1.5rem] border-t-2 border-todon-border bg-white shadow-[0_-12px_40px_-12px_rgba(63,47,42,0.25)]">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <p className="text-sm font-extrabold text-todon-ink">メニュー</p>
          <button type="button" className="todon-btn-ghost px-3 py-1.5 text-xs" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <section className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-todon-ink-muted">表示モード</p>
            <ScopeSwitcherPanel layout="stacked" onNavigate={onClose} />
          </section>

          <section className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-todon-ink-muted">メイン</p>
            <nav className="grid gap-1">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    isNavActive(pathname, item.href)
                      ? 'bg-todon-primary-soft text-todon-primary'
                      : 'text-todon-ink hover:bg-stone-50'
                  }`}
                >
                  <span aria-hidden>{item.emoji}</span>
                  {item.label}
                </Link>
              ))}
              <TeamNavLink
                mobile
                onNavigate={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  pathname.startsWith('/teams') ? 'bg-todon-primary-soft text-todon-primary' : 'text-todon-ink hover:bg-stone-50'
                }`}
              />
            </nav>
          </section>

          <section className="mb-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-todon-ink-muted">その他</p>
            <nav className="grid gap-1">
              {secondaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    isNavActive(pathname, item.href)
                      ? 'bg-todon-primary-soft text-todon-primary'
                      : 'text-todon-ink hover:bg-stone-50'
                  }`}
                >
                  <span aria-hidden>{item.emoji}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>

          <div className="border-t border-stone-100 pt-4">
            <LogoutButton className="w-full justify-center" />
          </div>
        </div>
      </div>
    </div>
  );
}
