import Link from 'next/link';

import { LogoutButton } from '@/components/logout-button';
import { TeamNavLink } from '@/components/team-nav-link';

const nav = [
  { href: '/dashboard', label: 'ホーム', emoji: '🏠' },
  { href: '/tasks', label: 'タスク', emoji: '✏️' },
  { href: '/calendar', label: 'カレンダー', emoji: '📅' },
  { href: '/projects', label: 'プロジェクト', emoji: '📁' },
  { href: '/habits', label: '習慣', emoji: '🌱' },
  { href: '/settings', label: '設定', emoji: '⚙️' },
] as const;

export function AppHeader() {
  return (
    <header className="relative border-b-2 border-todon-border bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full bg-todon-primary-soft px-3 py-1.5 text-lg font-extrabold text-todon-primary transition hover:bg-todon-yellow-soft"
          >
            <span aria-hidden>🐣</span>
            TodoN
          </Link>
          <span className="hidden text-xs font-bold text-todon-ink-muted sm:inline">トドン</span>
        </div>
        <nav className="hidden items-center gap-1.5 text-sm sm:flex">
          {nav.map((item) => (
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
        <LogoutButton />
      </div>
    </header>
  );
}
