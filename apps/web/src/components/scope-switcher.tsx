'use client';

import type { Team } from '@todon/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  type AppScope,
  persistAppScope,
  readAppScope,
  readScopeFromCookie,
  scopedHomePath,
  scopeFromPathname,
  teamDisplayIcon,
} from '@/lib/scope-preferences';

const TEAM_ICON_PRESETS = ['🚀', '⚡', '🎯', '🌟', '💼', '🎨', '🔥', '🐣', '👋', '🌱'];

export function ScopeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [teamHover, setTeamHover] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scope, setScope] = useState<AppScope>({ mode: 'personal' });

  useEffect(() => {
    const fromPath = scopeFromPathname(pathname);
    const fromCookie = readScopeFromCookie();
    const stored = readAppScope();
    const next = fromPath ?? fromCookie ?? stored ?? { mode: 'personal' };
    setScope(next);
    persistAppScope(next);
  }, [pathname]);

  useEffect(() => {
    void fetch('/api/teams', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Team[]) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]));
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setTeamHover(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setTeamHover(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeTeam =
    scope.mode === 'team' ? teams.find((team) => team.id === scope.teamId) : undefined;

  const triggerLabel =
    scope.mode === 'personal' ? '個' : teamDisplayIcon(activeTeam ?? { name: scope.teamName ?? 'T', icon: scope.teamIcon });

  function selectPersonal() {
    const next: AppScope = { mode: 'personal' };
    persistAppScope(next);
    setScope(next);
    setOpen(false);
    setTeamHover(false);
    router.push(scopedHomePath(pathname));
    router.refresh();
  }

  function selectTeam(team: Team) {
    const next: AppScope = {
      mode: 'team',
      teamId: team.id,
      teamName: team.name,
      teamIcon: team.icon,
    };
    persistAppScope(next);
    setScope(next);
    setOpen(false);
    setTeamHover(false);
    router.push(scopedHomePath(pathname));
    router.refresh();
  }

  return (
    <div ref={rootRef} className="scope-switcher">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={scope.mode === 'personal' ? '個人モード（切り替え）' : `チーム: ${activeTeam?.name ?? 'チーム'}（切り替え）`}
        className="scope-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="scope-switcher-trigger-label">{triggerLabel}</span>
      </button>

      {open ? (
        <div className="scope-switcher-panel" role="menu">
          <button type="button" role="menuitem" className="scope-switcher-item" onClick={selectPersonal}>
            <span className="scope-switcher-item-icon">個</span>
            <span>個人</span>
          </button>

          <div
            className="scope-switcher-team-row"
            onMouseEnter={() => setTeamHover(true)}
            onMouseLeave={() => setTeamHover(false)}
          >
            <button
              type="button"
              role="menuitem"
              className={`scope-switcher-item ${teamHover ? 'scope-switcher-item-active' : ''}`}
              onClick={() => setTeamHover(true)}
            >
              <span className="scope-switcher-item-icon">👥</span>
              <span>チーム</span>
              <span className="scope-switcher-arrow" aria-hidden>
                →
              </span>
            </button>

            {teamHover ? (
              <div className="scope-switcher-team-flyout" role="menu">
                <div className="scope-switcher-team-chips">
                  {teams.length === 0 ? (
                    <p className="scope-switcher-empty">参加中のチームがありません</p>
                  ) : (
                    teams.map((team) => {
                      const icon = teamDisplayIcon(team);
                      const active = scope.mode === 'team' && scope.teamId === team.id;

                      return (
                        <button
                          key={team.id}
                          type="button"
                          role="menuitem"
                          title={team.name}
                          className={`scope-switcher-team-chip ${active ? 'scope-switcher-team-chip-active' : ''}`}
                          onClick={() => selectTeam(team)}
                        >
                          <span className="text-lg leading-none">{icon}</span>
                          <span className="scope-switcher-team-name">{team.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <Link
                  href="/teams"
                  className="scope-switcher-team-list-link"
                  onClick={() => {
                    setOpen(false);
                    setTeamHover(false);
                  }}
                >
                  <span>チーム一覧</span>
                  <span className="scope-switcher-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { TEAM_ICON_PRESETS };
