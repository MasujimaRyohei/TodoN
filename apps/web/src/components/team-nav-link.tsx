'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  readAppScope,
  readScopeFromCookie,
  scopeFromPathname,
  teamNavHref,
  type AppScope,
} from '@/lib/scope-preferences';

function resolveScope(pathname: string): AppScope {
  return (
    scopeFromPathname(pathname) ?? readScopeFromCookie() ?? readAppScope() ?? { mode: 'personal' }
  );
}

type TeamNavLinkProps = {
  mobile?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function TeamNavLink({ mobile = false, onNavigate, className }: TeamNavLinkProps) {
  const pathname = usePathname();
  const [href, setHref] = useState<'/teams' | `/teams/${string}`>(() =>
    teamNavHref(resolveScope(pathname)),
  );

  useEffect(() => {
    function sync() {
      setHref(teamNavHref(resolveScope(pathname)));
    }

    sync();
    window.addEventListener('todon:scope-change', sync);
    return () => window.removeEventListener('todon:scope-change', sync);
  }, [pathname]);

  const defaultClassName = mobile
    ? className
    : 'flex items-center gap-1 rounded-full px-3 py-2 font-bold text-todon-ink-muted transition hover:bg-todon-sky-soft hover:text-todon-ink';

  return (
    <Link href={href} className={defaultClassName} onClick={onNavigate}>
      <span aria-hidden>👋</span>
      チーム
    </Link>
  );
}
