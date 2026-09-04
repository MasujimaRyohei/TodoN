'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isNavActive, mobileBottomNav } from '@/components/nav-items';
import {
  readAppScope,
  readScopeFromCookie,
  scopeFromPathname,
  teamNavHref,
  type AppScope,
} from '@/lib/scope-preferences';

type AppMobileNavProps = {
  onOpenMenu: () => void;
};

function resolveScope(pathname: string): AppScope {
  return (
    scopeFromPathname(pathname) ?? readScopeFromCookie() ?? readAppScope() ?? { mode: 'personal' }
  );
}

export function AppMobileNav({ onOpenMenu }: AppMobileNavProps) {
  const pathname = usePathname();
  const [teamHref, setTeamHref] = useState<'/teams' | `/teams/${string}`>(() =>
    teamNavHref(resolveScope(pathname)),
  );

  useEffect(() => {
    function sync() {
      setTeamHref(teamNavHref(resolveScope(pathname)));
    }

    sync();
    window.addEventListener('todon:scope-change', sync);
    return () => window.removeEventListener('todon:scope-change', sync);
  }, [pathname]);

  const teamActive = pathname.startsWith('/teams');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-todon-border bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:hidden"
      aria-label="モバイルナビゲーション"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {mobileBottomNav.map((item) => {
          const active = isNavActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
                  active ? 'bg-todon-primary-soft text-todon-primary' : 'text-todon-ink-muted'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.emoji}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}

        <li>
          <Link
            href={teamHref}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
              teamActive ? 'bg-todon-primary-soft text-todon-primary' : 'text-todon-ink-muted'
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              👋
            </span>
            チーム
          </Link>
        </li>

        <li>
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold text-todon-ink-muted transition hover:bg-stone-50"
            aria-label="メニューを開く"
          >
            <span className="text-lg leading-none" aria-hidden>
              ☰
            </span>
            メニュー
          </button>
        </li>
      </ul>
    </nav>
  );
}
