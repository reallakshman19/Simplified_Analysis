/**
 * Project-local Playwright Chromium installer.
 *
 * Functionality: installs the pinned browser build beside the project rather
 * than relying on a user-global cache.
 * Inputs: the Playwright version resolved by this project lockfile.
 * Output: Playwright's project-local `node_modules` browser runtime.
 * Fallback: installation errors are returned as a non-zero exit.
 */

import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cli = `${root}/node_modules/playwright/cli.js`;
const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
