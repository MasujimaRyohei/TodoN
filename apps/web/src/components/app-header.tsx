'use client';

import Link from 'next/link';

import { AppLogo } from '@/components/app-logo';
import { primaryNav } from '@/components/nav-items';
import { LogoutButton } from '@/components/logout-button';
import { TeamNavLink } from '@/components/team-nav-link';

type AppHeaderProps = {
  onOpenMobileMenu: () => void;
};

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  return (
    <header className="relative border-b-2 border-todon-border bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AppLogo size="sm" priority />
        </div>

        <nav className="hidden items-center gap-1.5 text-sm sm:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1 rounded-full px-3 py-2 font-bold text-todon-ink-muted transition hover:bg-todon-sky-soft hover:text-todon-ink"
            >
              <span aria-hidden>{item.emoji}</span>
              {item.label}
            </Link>
          ))}
          <TeamNavLink />
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border-2 border-todon-border bg-white px-3 py-2 text-sm font-bold text-todon-ink sm:hidden"
            aria-label="メニューを開く"
            onClick={onOpenMobileMenu}
          >
            ☰
          </button>
          <div className="hidden sm:block">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
