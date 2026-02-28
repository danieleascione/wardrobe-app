/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-external-in-domain',
      comment: 'packages/domain must not import any external library (AWS SDK, Supabase, Axios, or any framework)',
      severity: 'error',
      from: {
        path: '^packages/domain/src',
      },
      to: {
        pathNot: [
          '^packages/domain/src',
          '^node_modules/(typescript|vitest|@vitest)',
        ],
        path: '^node_modules',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'packages/domain/tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
