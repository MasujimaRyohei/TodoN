import next from '@tooling-configs/eslint-config/next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...next,
  {
    ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**'],
  },
  {
    // Operational one-off scripts: keep linting, but console output is the point.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
];
