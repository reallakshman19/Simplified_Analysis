/**
 * Project-local Playwright test launcher.
 *
 * Functionality: runs browser checks against the pinned local Chromium build.
 * Inputs: optional Playwright CLI arguments forwarded from npm.
 * Output: Playwright test results and artifacts.
 * Fallback: missing browsers or test failures return a non-zero exit.
 */

import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cli = `${root}/node_modules/playwright/cli.js`;
const result = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
