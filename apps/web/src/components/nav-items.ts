export type NavItem = {
  href: string;
  label: string;
  emoji: string;
};

export const primaryNav: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', emoji: '🏠' },
  { href: '/tasks', label: 'タスク', emoji: '✏️' },
  { href: '/calendar', label: 'カレンダー', emoji: '📅' },
  { href: '/projects', label: 'プロジェクト', emoji: '📁' },
  { href: '/habits', label: '習慣', emoji: '🌱' },
  { href: '/settings', label: '設定', emoji: '⚙️' },
];

export const secondaryNav: NavItem[] = [
  { href: '/reviews', label: '週次振り返り', emoji: '📊' },
  { href: '/templates', label: 'テンプレート', emoji: '📋' },
  { href: '/gantt', label: 'ガント', emoji: '📈' },
  { href: '/archive', label: 'アーカイブ', emoji: '🗂️' },
];

export const mobileBottomNav: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', emoji: '🏠' },
  { href: '/tasks', label: 'タスク', emoji: '✏️' },
  { href: '/calendar', label: 'カレンダー', emoji: '📅' },
];

export function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
