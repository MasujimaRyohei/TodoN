const TERMS_URL = 'https://www.begrad.jp/apps/todon/terms';
const PRIVACY_URL = 'https://www.begrad.jp/apps/todon/privacy';

export function AppFooter() {
  return (
    <footer className="relative mt-auto hidden border-t-2 border-todon-border bg-white/70 px-4 py-4 text-center text-xs text-todon-ink-muted backdrop-blur-sm sm:block">
      <p>
        © 2026 Begrad ・{' '}
        <a href={TERMS_URL} target="_blank" rel="noreferrer" className="todon-link">
          利用規約
        </a>{' '}
        ・{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="todon-link">
          プライバシーポリシー
        </a>
      </p>
    </footer>
  );
}
