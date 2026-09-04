'use client';

import { useState } from 'react';

import { AppHeader } from '@/components/app-header';
import { AppMobileMenu } from '@/components/app-mobile-menu';
import { AppMobileNav } from '@/components/app-mobile-nav';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AppHeader onOpenMobileMenu={() => setMenuOpen(true)} />
      <main className="relative mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:py-8 sm:pb-8 sm:pl-14">
        {children}
      </main>
      <AppMobileNav onOpenMenu={() => setMenuOpen(true)} />
      <AppMobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
