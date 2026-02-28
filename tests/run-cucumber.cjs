// CJS wrapper: loads tsx/cjs hook then runs cucumber
// Note: omit .js extension to avoid tsx CJS resolver doubling it
require('tsx/cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const runModule = require('@cucumber/cucumber/lib/cli/run');
runModule.default();
