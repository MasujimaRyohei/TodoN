export const HIDE_EMPTY_SECTIONS_KEY = 'todon:dashboard-hide-empty-sections';

const HIDE_EMPTY_SECTIONS_EVENT = 'todon:dashboard-hide-empty-sections-change';

export function readHideEmptySections(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const stored = window.localStorage.getItem(HIDE_EMPTY_SECTIONS_KEY);
  if (stored === null) {
    return true;
  }

  return stored === 'true';
}

export function writeHideEmptySections(value: boolean) {
  window.localStorage.setItem(HIDE_EMPTY_SECTIONS_KEY, String(value));
  window.dispatchEvent(new Event(HIDE_EMPTY_SECTIONS_EVENT));
}

export function subscribeHideEmptySections(onChange: () => void) {
  window.addEventListener(HIDE_EMPTY_SECTIONS_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(HIDE_EMPTY_SECTIONS_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
