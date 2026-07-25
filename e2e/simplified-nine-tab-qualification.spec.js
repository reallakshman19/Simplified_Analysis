import { test, expect } from '@playwright/test';

const EXPECTED_TABS = [
  ['home', 'Home/Viewer'],
  ['pcf', 'PCF'],
  ['sketcher', 'Sketcher'],
  ['3d-analysis', '3D Calc'],
  ['simpAnalysis', 'Pipe Solver'],
  ['reports', 'Reports'],
  ['benchmarks', 'QA'],
  ['settings', 'Settings'],
  ['diagnostics', 'Debug'],
];

test.describe('Simplified Analysis qualified product surface', () => {
  test('renders exactly nine ordered tabs with visible qualification', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navTabs = page.locator('[data-testid^="nav-tab-"]');
    await expect(navTabs).toHaveCount(EXPECTED_TABS.length);
    await expect(navTabs).toHaveText(EXPECTED_TABS.map((item) => new RegExp(item[1], 'i')));

    const ids = await navTabs.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute('data-testid')?.replace('nav-tab-', ''))
    ));
    expect(ids).toEqual(EXPECTED_TABS.map((item) => item[0]));
    await expect(page.getByTestId('nav-tab-workspace')).toHaveCount(0);
    await expect(page.getByTestId('nav-tab-load-calc')).toHaveCount(0);

    for (const [tabId] of EXPECTED_TABS) {
      await page.getByTestId(`nav-tab-${tabId}`).click();
      await expect(page.getByTestId(`tab-panel-${tabId}`)).toBeVisible();
      await expect(page.getByTestId('tab-qualification-banner')).toContainText('Qualified');
    }

    await page.getByTestId('nav-tab-benchmarks').click();
    await expect(page.locator('[data-testid^="qa-tab-status-"]')).toHaveCount(EXPECTED_TABS.length);
  });

  test('carries PCF through Sketcher and 3D Calc into Reports', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('textarea').first().fill([
      'PIPE',
      '    END-POINT    0 0 0 100',
      '    END-POINT    1000 0 0 100',
      '    ITEM-CODE    TEST-PIPE',
    ].join('\n'));
    await page.getByRole('button', { name: /Generate 3D/i }).click();
    await expect(page.getByText(/1 components rendered/i)).toBeVisible();

    await page.getByTestId('nav-tab-pcf').click();
    await expect(page.locator('input[value="TEST-PIPE"]')).toBeVisible();

    await page.getByTestId('nav-tab-home').click();
    await page.getByRole('button', { name: /Edit in 2D Sketcher/i }).click();
    await expect(page.getByTestId('tab-panel-sketcher')).toBeVisible();
    await page.getByTestId('sketcher-push-to-3d-simplified').click();
    await expect(page.getByTestId('3d-simplified-analysis-tab')).toBeVisible();

    await page.getByTestId('nav-tab-reports').click();
    await expect(page.getByTestId('reports-tab')).toBeVisible();
    await expect(page.getByTestId('no-active-report')).toHaveCount(0);
    await expect(page.getByTestId('report-preview')).toContainText('3D Simplified Calculation');
  });
});
