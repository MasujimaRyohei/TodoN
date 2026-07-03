'use client';

import { useRouter } from 'next/navigation';

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`todon-btn-ghost text-xs ${className ?? ''}`.trim()}
      onClick={() => void onLogout()}
    >
      ログアウト
    </button>
  );
}
