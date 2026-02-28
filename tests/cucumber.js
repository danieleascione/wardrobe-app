/**
 * Cucumber.js configuration for PocketWardrobe acceptance tests.
 *
 * Uses tsx/cjs as a CommonJS require hook so TypeScript step definitions run
 * directly without a build step (compatible with Node 18).
 */
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: [

      'features/mvp/acceptance/steps/support/hooks.ts',
      'features/mvp/acceptance/steps/world.ts',
      'features/mvp/acceptance/steps/**/*.steps.ts',
      'features/mvp/step-definitions/**/*.steps.ts',
    ],
    format: ['progress-bar'],
    formatOptions: { snippetInterface: 'async-await' },
    worldParameters: {},
  },
  smoke: {
    paths: ['features/mvp/acceptance/walking-skeleton.feature'],
    require: [

      'features/mvp/step-definitions/world.ts',
      'features/mvp/step-definitions/hooks.ts',
      'features/mvp/step-definitions/walking-skeleton.steps.ts',
    ],
    tags: '@smoke',
    format: ['progress-bar'],
    formatOptions: { snippetInterface: 'async-await' },
  },
};
