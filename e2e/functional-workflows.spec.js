import { test, expect } from '@playwright/test';

test('real PCF route reaches 2D calculation and report with original coordinates', async ({page}) => {
  const errors=[];
  page.on('pageerror', err=>errors.push(err.message));
  await page.goto('/Simplified_Analysis/');
  await page.locator('textarea').first().fill([
    'PIPE','    END-POINT    0 0 0 100','    END-POINT    3048 0 0 100','    ITEM-CODE    TEST-A',
    'PIPE','    END-POINT    3048 0 0 100','    END-POINT    3048 6096 0 100','    ITEM-CODE    TEST-B',
  ].join('\n'));
  await page.getByRole('button',{name:/Generate 3D/i}).click();
  await expect(page.getByText(/2 components rendered/i)).toBeVisible();
  await page.getByRole('button',{name:/Edit in 2D Sketcher/i}).click();
  await page.getByTitle('Send Sketcher graph to Simplified 2D').click();
  await expect(page.getByTestId('imported-2d-model')).toContainText('3 nodes · 2 segments');
  const a=page.getByTestId('imported-2d-anchor-1');
  const b=page.getByTestId('imported-2d-anchor-2');
  await a.selectOption({index:1}); await b.selectOption({index:2});
  await page.getByTestId('imported-2d-confirm-spec').check();
  await page.getByTestId('run-2d-calculation').click();
  await expect(page.getByTestId('2d-calculation-results')).toBeVisible();
  await page.getByTestId('nav-tab-reports').click();
  await expect(page.getByTestId('report-preview')).toContainText('2D Simplified Calculation');
  await expect(page.getByTestId('report-preview')).toContainText('GC_ANCHOR_GUIDE_3EI');
  const report = await page.evaluate(() => window.useAppStore.getState().activeReportContext);
  expect(report.input.nodes).toHaveLength(3);
  expect(report.result.axes.X.netDiff).toBeCloseTo(10,7);
  expect(report.result.axes.Y.netDiff).toBeCloseTo(20,7);
  expect(errors).toEqual([]);
});

test('Pipe Rack benchmark opens correct workspace and executes the fixture', async ({page}) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-benchmarks').click();
  await page.getByTestId('load-benchmark-PR-LOOP-001').click();
  await expect(page.getByTestId('tab-panel-simpAnalysis')).toBeVisible();
  await expect(page.getByTestId('live-benchmark-fixture')).toContainText('PR-LOOP-001');
  await expect(page.getByTestId('live-benchmark-verdict')).toContainText('PASSED');
  await expect(page.getByTestId('live-benchmark-fixture')).toContainText('L10');
  await page.getByRole('button',{name:'View fixture report in Reports'}).click();
  await expect(page.getByTestId('report-preview')).toContainText('Benchmark fixture');
});
