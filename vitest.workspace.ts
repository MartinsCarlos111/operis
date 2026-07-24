import { defineWorkspace } from 'vitest/config';

/**
 * Two suites, one config each:
 *   - unit:        fast, no I/O, co-located next to source (src/**\/*.test.ts)
 *   - integration: real Postgres via Testcontainers, run serially (test/integration)
 * Run all with `npm test`, or one with `npm run test:unit` / `test:integration`.
 */
export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['test/integration/**/*.test.ts'],
      testTimeout: 120_000,
      hookTimeout: 120_000,
      fileParallelism: false,
    },
  },
]);
