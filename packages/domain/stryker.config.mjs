export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: [
    'src/use-cases/**/*.ts',
    'src/entities/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
  coverageAnalysis: 'off',
  reporters: ['clear-text', 'html', 'json'],
  htmlReporter: { fileName: '../../docs/feature/pocketwardrobe-mvp/mutation/index.html' },
  jsonReporter: { fileName: '../../docs/feature/pocketwardrobe-mvp/mutation/mutation-report.json' },
  thresholds: { high: 80, low: 60, break: 60 },
  timeoutMS: 30000,
  concurrency: 2,
};
