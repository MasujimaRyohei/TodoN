'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ScopeSwitcherPanel } from '@/components/scope-switcher-panel';
import { persistAppScope, scopeFromPathname, teamDisplayIcon } from '@/lib/scope-preferences';
import { useAppScope } from '@/lib/use-app-scope';

export function ScopeSwitcher() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const scope = useAppScope(pathname);
  const [open, setOpen] = useState(false);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);
  const [activeTeamIcon, setActiveTeamIcon] = useState<string | null>(null);

  useEffect(() => {
    const fromPath = scopeFromPathname(pathname);
    if (fromPath) {
      persistAppScope(fromPath);
    }
  }, [pathname]);

  useEffect(() => {
    void (async () => {
      if (scope.mode !== 'team' || !scope.teamId) {
        setActiveTeamName(null);
        setActiveTeamIcon(null);
        return;
      }

      try {
        const res = await fetch('/api/teams', { credentials: 'include' });
        const teams: Array<{ id: string; name: string; icon?: string | null }> = res.ok
          ? await res.json()
          : [];
        const team = teams.find((item) => item.id === scope.teamId);
        setActiveTeamName(team?.name ?? scope.teamName ?? 'T');
        setActiveTeamIcon(team?.icon ?? scope.teamIcon ?? null);
      } catch {
        setActiveTeamName(scope.teamName ?? 'T');
        setActiveTeamIcon(scope.teamIcon ?? null);
      }
    })();
  }, [scope]);

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
