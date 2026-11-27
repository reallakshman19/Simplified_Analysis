import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('PCF Stage 2 previews the loaded geometry and Debug downloads its session log', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-pcf').click();
  const stage2 = page.getByRole('button', { name: /Stage 2/ });
  await stage2.click();
  await expect(page.getByText(/Load pipe geometry/)).toBeVisible();
  await page.getByTestId('nav-tab-home').click();
  await page.locator('input[type=file]').setInputFiles('benchmarks/fixtures/pcf/test2.pcf');
  await page.getByRole('button', { name: /Generate 3D/ }).click();
  await page.getByTestId('nav-tab-pcf').click();
  await stage2.click();
  await expect(page.getByText('Target Plane: XY')).toBeVisible();
  await expect(page.getByRole('row').nth(1)).toContainText('[0.00, 50.00]');
  await expect(page.getByRole('row').nth(2)).toContainText('[50.00, 50.00]');
  await page.getByTestId('nav-tab-diagnostics').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Log' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^spl2-log-.*\.md$/);
  expect(readFileSync(await download.path(), 'utf8')).toContain('PCF parsed from text');
});

test('inch PCF route reaches 2D and Reports with normalized dimensions [SIMULATED]', async ({page}) => {
  const errors=[];
  page.on('pageerror', err=>errors.push(err.message));
  await page.goto('/Simplified_Analysis/');
  await page.locator('textarea').first().fill([
    'UNITS-CO-ORDS INCH', 'UNITS-BORE INCH',
    'PIPE','    END-POINT    0 0 0 4','    END-POINT    120 0 0 4','    ITEM-CODE    TEST-A',
    'PIPE','    END-POINT    120 0 0 4','    END-POINT    120 240 0 4','    ITEM-CODE    TEST-B',
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
  await page.getByTestId('imported-2d-confirm-spec').uncheck();
  await expect(page.getByTestId('2d-calculation-results')).toHaveCount(0);
  await expect(page.getByTestId('run-2d-calculation')).toBeDisabled();
  await page.getByTestId('nav-tab-reports').click();
  await expect(page.getByText('STALE — Recalculate before issue.', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('report-preview')).toContainText('2D Simplified Calculation');
  await expect(page.getByTestId('report-preview')).toContainText('GC_ANCHOR_GUIDE_3EI');
  const report = await page.evaluate(() => window.useAppStore.getState().activeReportContext);
  expect(report.input.nodes).toHaveLength(3);
  expect(report.input.segments.map(({ diameter }) => diameter)).toEqual([100, 100]);
  expect(report.result.axes.X.netDiff).toBeCloseTo(10,7);
  expect(report.result.axes.Y.netDiff).toBeCloseTo(20,7);
  expect(errors).toEqual([]);
});

test('a rejected PCF replacement clears the previous Viewer model [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  const text = page.locator('textarea').first();
  const generate = page.getByRole('button', { name: /Generate 3D/i });
  const pipe = 'PIPE\nEND-POINT 0 0 0 100\nEND-POINT 3048 0 0 100';
  await text.fill(pipe);
  await generate.click();
  await expect(page.getByText(/1 components rendered/i)).toBeVisible();
  await text.fill('UNITS-CO-ORDS FT\n' + pipe);
  const dialog = page.waitForEvent('dialog');
  const click = generate.click();
  const warning = await dialog;
  await warning.accept();
  await click;
  expect(warning.message()).toContain('invalid, conflicting, or misplaced UNITS-CO-ORDS');
  await expect(page.getByText(/0 components rendered/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit in 2D Sketcher/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Send to GC 3D/i })).toBeDisabled();
});

test('the GC3D workspace and Reports show the same qualification verdict', async ({ page }) => {
  const pcf = readFileSync('benchmarks/fixtures/pcf/test2.pcf', 'utf8');
  await page.goto('/Simplified_Analysis/');
  await page.locator('textarea').first().fill(pcf);
  await page.getByRole('button', { name: /Generate 3D/i }).click();
  await page.getByRole('button', { name: /Edit in 2D Sketcher/i }).click();
  await page.getByTestId('sketcher-push-to-3d-simplified').click();
  await expect(page.getByTestId('3d-simplified-model-validation-status')).toHaveText('PASSED_WITH_WARNINGS');
  await expect(page.getByTestId('3d-simplified-gc3d-status')).toHaveText('GC3D: NOT_QUALIFIED');
  const workspaceReport = JSON.parse(await page.getByTestId('3d-simplified-report-json').textContent());
  expect(workspaceReport.gc3dStatus).toBe('NOT_QUALIFIED');
  await page.getByTestId('nav-tab-reports').click();
  await expect(page.getByTestId('report-preview')).toContainText('NOT_QUALIFIED');
  const result = await page.evaluate(() => window.useAppStore.getState().activeReportContext.result);
  expect(result.status).toBe(workspaceReport.gc3dStatus);
  expect(result.results.overallResult).toBe(result.status);
});

test('GC3D blocks a nominal-bore-only PCF until actual dimensions are entered [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.locator('input[type=file]').setInputFiles('benchmarks/fixtures/pcf/test1.pcf');
  await page.getByRole('button', { name: /Generate 3D/ }).click();
  await page.getByRole('button', { name: 'Send to GC 3D' }).click();
  const context = () => page.evaluate(() => window.useAppStore.getState().activeReportContext);
  const before = await context();
  expect(before.input.segments[0]).toMatchObject({ dn_mm: 100, od_in: null, wt_in: null });
  expect(before.result.results.legResults).toEqual([]);
  await expect(page.getByRole('alert').filter({ hasText: 'Pipe dimensions are missing' })).toBeVisible();

  const od = page.getByRole('spinbutton', { name: 'Outside Diameter (in)' });
  const wall = page.getByRole('spinbutton', { name: 'Wall Thickness (in)' });
  await page.getByRole('button', { name: /Edit dimensions for/ }).click();
  await od.fill('4.5');
  expect((await context()).result.results.legResults).toEqual([]);
  await wall.fill('0.237');
  const after = await context();
  expect(after.input.model.segments[0].pipe.od_mm).toBeCloseTo(114.3);
  expect(after.input.model.segments[0].pipe.wall_mm).toBeCloseTo(0.237 * 25.4);
  expect(after.input.model.segments[0].provenance.pipeSectionSource).toBe('manual-3d-segment-properties');
  expect(after.result.results.legResults).toHaveLength(1);
  await wall.clear();
  expect((await context()).result.results.legResults).toEqual([]);
});

test('the rack designer applies the persisted project spacing margin [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-settings').click();
  await page.getByTestId('settings-field-rackSpacingMargin').fill('125');
  await page.reload();
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await page.getByTestId('pipe-solver-subtab-piperack').click();
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByRole('button', { name: /Design Pipe Rack Section/i }).click();
  await expect(page.getByRole('spinbutton', { name: 'Base Gap (mm)' })).toHaveValue('125');
  await expect(page.getByText(/StdGap\(150\)/)).toBeVisible();
});

test('manual U-loop centers its width inside the anchor span', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await page.getByTestId('pipe-solver-subtab-2d').click();
  await page.locator('select').filter({ has: page.getByRole('option', { name: 'U-Loop' }) }).selectOption('U-Loop');
  const run = page.getByTestId('run-2d-calculation');
  await run.click();
  await expect(page.getByTestId('2d-calculation-results')).toBeVisible();
  const report = await page.evaluate(() => window.useAppStore.getState().activeReportContext);
  expect(report.input.nodes.map(({ x }) => x)).toEqual([0, 45, 45, 55, 55, 100]);
  expect(report.result.axes.X.netDiff).toBe(100);
  await page.getByText('Loop Width (W):', { exact: true }).locator('..').locator('input').fill('100');
  await run.click();
  await expect(page.getByRole('alert')).toHaveText('Loop width must be smaller than the anchor distance.');
  await expect(page.getByTestId('2d-calculation-results')).toHaveCount(0);
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

test('editable Pipe Rack blocks invalid spacing and recovers after correction [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await page.getByTestId('pipe-solver-subtab-piperack').click();
  const spacing = page.getByText(/^Spacing Step \(/).locator('..').locator('input');
  const run = page.getByRole('button', { name: /Run Loop Nesting/i });
  await spacing.fill('-2.5');
  await run.click();
  await expect(page.getByTestId('pipe-rack-result-status')).toHaveText('NOT_QUALIFIED');
  await expect(page.getByRole('alert')).toContainText('Spacing step must be finite and greater than zero.');
  await expect(page.getByRole('columnheader', { name: /Loop Width/i })).toHaveCount(0);
  await page.getByTestId('nav-tab-reports').click();
  const report = await page.evaluate(() => window.useAppStore.getState().activeReportContext.result);
  expect(report.status).toBe('NOT_QUALIFIED');
  expect(report.lines).toEqual([]);
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await spacing.fill('2.5');
  await run.click();
  await expect(page.getByRole('columnheader', { name: /Loop Width/i })).toBeVisible();
});

test('Extended 3D publishes a failed flange screening when nozzle loads are absent [SIMULATED]', async ({ page }) => {
  await page.goto('/Simplified_Analysis/');
  await page.getByTestId('nav-tab-simpAnalysis').click();
  await page.getByText('3D Solver', { exact: true }).click();
  await page.getByRole('button', { name: /Load Golden Master Mock/i }).click();
  const calculate = page.getByRole('button', { name: /Run Calculation/i });
  await expect(calculate).toBeEnabled();
  await page.getByText(/^Design Prs \(/).locator('..').locator('input').fill('100000');
  await calculate.click();
  await expect(page.getByTestId('extended-result-status')).toHaveText('[FAILED]');
  await page.getByTestId('nav-tab-reports').click();
  const result = await page.evaluate(() => window.useAppStore.getState().activeReportContext.result);
  expect(result.status).toBe('FAILED');
  expect(result.flange.status).toBe('FAIL');
  expect(result.mist.status).toBe('NOT_QUALIFIED');
});
