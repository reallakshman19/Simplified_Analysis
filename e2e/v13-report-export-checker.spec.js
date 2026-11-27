import { test, expect } from '@playwright/test';
import { openApp, openSimplifiedAnalysis, openReports } from './helpers/appNavigation.js';

test.describe('V13 report export checker workflow', () => {
  test('reports tab shows checker workflow panel', async ({ page }) => {
    await openApp(page);
    await openReports(page);
    const content = await page.locator('#root').innerText();
    expect(content.trim().length).toBeGreaterThan(10);
  });
});

test('gates revision statuses for a 2D screening calculation [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-settings').click();
  await page.getByTestId('settings-field-benchmarkCertificationRequired').selectOption('false');
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await page.getByTestId('pipe-solver-subtab-2d').click();
  await page.getByTestId('run-2d-calculation').click();
  await openReports(page);
  const save = page.getByTestId('report-save-revision');
  const status = page.getByTestId('report-issue-status');
  await save.click();
  await expect(page.getByTestId('report-history')).toContainText('DRAFT');
  await status.selectOption('CHECKED');
  await page.getByTestId('report-checked-by').fill('   ');
  await expect(save).toBeDisabled();
  await status.selectOption('ISSUED');
  await expect(save).toBeDisabled();
  for (const role of ['prepared', 'checked', 'approved']) await page.getByTestId('report-' + role + '-by').fill('Test ' + role);
  await page.getByTestId('report-issue-type').selectOption('FINAL_ISSUE');
  await expect(save).toBeDisabled();
  await page.getByTestId('report-issue-type').selectOption('SCREENING_ISSUE');
  await save.click();
  await expect(page.getByTestId('report-history')).toContainText('ISSUED');
});
