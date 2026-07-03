'use client';

import type { Team } from '@todon/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  type AppScope,
  persistAppScope,
  readAppScope,
  readScopeFromCookie,
  scopedHomePath,
  scopeFromPathname,
  teamDisplayIcon,
} from '@/lib/scope-preferences';

type ScopeSwitcherPanelProps = {
  onNavigate?: () => void;
  layout?: 'flyout' | 'stacked';
};

export function ScopeSwitcherPanel({ onNavigate, layout = 'flyout' }: ScopeSwitcherPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [teamOpen, setTeamOpen] = useState(false);
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

  const activeTeam =
    scope.mode === 'team' ? teams.find((team) => team.id === scope.teamId) : undefined;

  function finishNavigation() {
    onNavigate?.();
    setTeamOpen(false);
  }

  function selectPersonal() {
    const next: AppScope = { mode: 'personal' };
    persistAppScope(next);
    setScope(next);
    finishNavigation();
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
    finishNavigation();
    router.push(scopedHomePath(pathname));
    router.refresh();
  }

  const stacked = layout === 'stacked';

  return (
    <div className={stacked ? 'space-y-2' : 'scope-switcher-panel'} role="menu">
      <button
        type="button"
        role="menuitem"
        className={`scope-switcher-item ${scope.mode === 'personal' ? 'scope-switcher-item-active' : ''}`}
        onClick={selectPersonal}
      >
        <span className="scope-switcher-item-icon">個</span>
        <span>個人</span>
      </button>

      <div className={stacked ? 'space-y-2' : 'scope-switcher-team-row'}>
        <button
          type="button"
          role="menuitem"
          className={`scope-switcher-item ${teamOpen || scope.mode === 'team' ? 'scope-switcher-item-active' : ''}`}
          onClick={() => setTeamOpen((value) => !value)}
        >
          <span className="scope-switcher-item-icon">👥</span>
          <span>チーム</span>
          {scope.mode === 'team' && activeTeam ? (
            <span className="scope-switcher-active-team">{activeTeam.name}</span>
          ) : null}
          <span className="scope-switcher-arrow" aria-hidden>
            {teamOpen ? '↓' : '→'}
          </span>
        </button>

        {teamOpen ? (
          <div className={stacked ? 'scope-switcher-team-stacked' : 'scope-switcher-team-flyout'} role="menu">
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
              onClick={() => finishNavigation()}
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
  );
}
