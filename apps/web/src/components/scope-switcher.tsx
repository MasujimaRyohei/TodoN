'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ScopeSwitcherPanel } from '@/components/scope-switcher-panel';
import {
  type AppScope,
  persistAppScope,
  readAppScope,
  readScopeFromCookie,
  scopeFromPathname,
  teamDisplayIcon,
} from '@/lib/scope-preferences';

export function ScopeSwitcher() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<AppScope>({ mode: 'personal' });
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);
  const [activeTeamIcon, setActiveTeamIcon] = useState<string | null>(null);

  useEffect(() => {
    const fromPath = scopeFromPathname(pathname);
    const fromCookie = readScopeFromCookie();
    const stored = readAppScope();
    const next = fromPath ?? fromCookie ?? stored ?? { mode: 'personal' };
    setScope(next);
    persistAppScope(next);
  }, [pathname]);

  useEffect(() => {
    if (scope.mode !== 'team' || !scope.teamId) {
      setActiveTeamName(null);
      setActiveTeamIcon(null);
      return;
    }

    void fetch('/api/teams', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((teams: Array<{ id: string; name: string; icon?: string | null }>) => {
        const team = teams.find((item) => item.id === scope.teamId);
        setActiveTeamName(team?.name ?? scope.teamName ?? 'T');
        setActiveTeamIcon(team?.icon ?? scope.teamIcon ?? null);
      })
      .catch(() => {
        setActiveTeamName(scope.teamName ?? 'T');
        setActiveTeamIcon(scope.teamIcon ?? null);
      });
  }, [pathname, scope]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const triggerLabel =
    scope.mode === 'personal'
      ? '個'
      : teamDisplayIcon({ name: activeTeamName ?? 'T', icon: activeTeamIcon });

  return (
    <div ref={rootRef} className="scope-switcher hidden sm:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          scope.mode === 'personal'
            ? '個人モード（切り替え）'
            : `チーム: ${activeTeamName ?? 'チーム'}（切り替え）`
        }
        className="scope-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="scope-switcher-trigger-label">{triggerLabel}</span>
      </button>

      {open ? <ScopeSwitcherPanel onNavigate={() => setOpen(false)} /> : null}
    </div>
  );
}
