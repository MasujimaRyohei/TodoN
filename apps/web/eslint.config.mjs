import next from '@tooling-configs/eslint-config/next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...next,
  {
    ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**', 'scripts/**'],
  },
];
