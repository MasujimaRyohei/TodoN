'use client';

import { useEffect } from 'react';

import { persistAppScope } from '@/lib/scope-preferences';

type Props = {
  invalidated: boolean;
};

export function ScopeInvalidationSync({ invalidated }: Props) {
  useEffect(() => {
    if (invalidated) {
      persistAppScope({ mode: 'personal' });
    }
  }, [invalidated]);

  return null;
}
