/**
 * Deterministic Simplified Analysis per-tab qualification runner.
 *
 * Functionality: evaluates every registered evidence case, derives tab status,
 * and writes JSON/Markdown reports without timestamps.
 * Inputs: authoritative tab/catalog contracts, existing engineering benchmark
 * results, checked-in fixtures, and pure application modules.
 * Outputs: `tab-benchmark-suite/v1` evidence reports.
 * Fallback: a missing dependency or failed check produces FAILED evidence and
 * a non-zero process exit; it never promotes an incomplete tab to Qualified.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parsePcfWithDiagnostics } from '../src/pcf/pcfParser.js';
import { serializePcf } from '../src/pcf/pcfSerializer.js';
import { pcfToCanonicalGeometry } from '../src/core/geometry/adapters/pcfToCanonicalGeometry.js';
import { convertUnit } from '../src/core/units/unitContract.js';
import { DEFAULT_ENGINEERING_SETTINGS } from '../src/data/engineeringDefaults/defaults.js';
import { snapshotSessionLog } from '../src/utils/logger.js';
import { SIMPLIFIED_APP_ID, SIMPLIFIED_TAB_IDS } from '../src/config/uiTabs.js';
import { TAB_BENCHMARK_CATALOG } from '../src/benchmarking/tabBenchmarkCatalog.js';
import {
  BENCHMARK_RESULT_STATUS,
  TAB_BENCHMARK_RESULT_SCHEMA,
  TAB_BENCHMARK_SUITE_SCHEMA,
  TAB_QUALIFICATION_STATUS,
  createTabBenchmarkResult,
  createTabBenchmarkSuite,
  semanticHash,
  stableStringify,
} from '../src/benchmarking/tabBenchmarkContracts.js';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports');
const ENGINEERING_REPORT = readJson('reports/benchmark-results.json');

const evaluators = Object.freeze({
  'HOME-PCF-VIEWER-001': evaluateHomeViewer,
  'HOME-SELECTION-VISIBILITY-001': evaluateHomeInteraction,
  'HOME-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'PCF-ROUNDTRIP-001': evaluatePcfRoundTrip,
  'PCF-MALFORMED-001': evaluateMalformedPcf,
  'PCF-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'SKETCHER-TOPOLOGY-001': evaluateSketcher,
  'SKETCHER-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'GC3D-ANALYTICAL-SUITE-001': evaluateGc3d,
  'GC3D-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'PIPE-SOLVER-ANALYTICAL-SUITE-001': evaluatePipeSolver,
  'PIPE-SOLVER-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'REPORT-DETERMINISM-001': evaluateReports,
  'REPORTS-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'SETTINGS-PROFILE-UNITS-001': evaluateSettingsUnits,
  'SETTINGS-STALE-PERSISTENCE-001': evaluateSettingsState,
  'SETTINGS-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'DEBUG-TRACE-IMMUTABILITY-001': evaluateDebugTrace,
  'DEBUG-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
  'QA-REAL-PROJECT-COMPATIBILITY-001': evaluateRealProjectCompatibility,
  'QA-BROWSER-WORKFLOW-001': evaluateBrowserWorkflow,
});

let browserWorkflowRun = null;
const nonQaCatalog = TAB_BENCHMARK_CATALOG.filter((item) => item.caseId !== 'QA-REGISTRY-RECONCILIATION-001');
const results = nonQaCatalog.map((item) => runCatalogCase(item));
results.push(runQaRegistryCase(
  TAB_BENCHMARK_CATALOG.find((item) => item.caseId === 'QA-REGISTRY-RECONCILIATION-001'),
  results,
));

const orderedResults = TAB_BENCHMARK_CATALOG.map((catalogItem) => (
  results.find((result) => result.caseId === catalogItem.caseId)
));
const tabSummaries = SIMPLIFIED_TAB_IDS.map((tabId) => summarizeTab(tabId, orderedResults));
const summary = {
  totalTabs: tabSummaries.length,
  qualified: tabSummaries.filter((tab) => tab.status === TAB_QUALIFICATION_STATUS.QUALIFIED).length,
  failed: tabSummaries.filter((tab) => tab.status === TAB_QUALIFICATION_STATUS.FAILED).length,
  notRun: tabSummaries.filter((tab) => tab.status === TAB_QUALIFICATION_STATUS.NOT_RUN).length,
  totalCases: orderedResults.length,
  passedCases: orderedResults.filter((result) => result.status === BENCHMARK_RESULT_STATUS.PASSED).length,
  failedCases: orderedResults.filter((result) => result.status === BENCHMARK_RESULT_STATUS.FAILED).length,
  notRunCases: orderedResults.filter((result) => result.status === BENCHMARK_RESULT_STATUS.NOT_RUN).length,
};
const suiteBody = {
  schema: TAB_BENCHMARK_SUITE_SCHEMA,
  appId: SIMPLIFIED_APP_ID,
  navigationTabIds: [...SIMPLIFIED_TAB_IDS],
  tabs: tabSummaries,
  results: orderedResults,
  summary,
};
const suite = createTabBenchmarkSuite({ ...suiteBody, semanticHash: semanticHash(suiteBody) });

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'tab-benchmark-results.json'), `${JSON.stringify(suite, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(REPORT_DIR, 'tab-benchmark-summary.md'), renderMarkdown(suite), 'utf8');

console.log(`Tab qualification: ${summary.qualified}/${summary.totalTabs} Qualified; ${summary.passedCases}/${summary.totalCases} cases passed.`);
tabSummaries.forEach((tab) => console.log(` - ${tab.tabId}: ${tab.status}`));
if (summary.failed > 0 || summary.notRun > 0) process.exit(1);

function runCatalogCase(catalogItem) {
  const evaluator = evaluators[catalogItem.caseId];
  if (typeof evaluator !== 'function') {
    return buildResult(catalogItem, {}, {}, {}, BENCHMARK_RESULT_STATUS.NOT_RUN, ['No evaluator registered.'], null);
  }
  try {
    const evidence = evaluator(catalogItem);
    const passed = evidenceMatches(evidence.expected, evidence.actual, evidence.numericTolerances);
    return buildResult(
      catalogItem,
      evidence.input,
      evidence.expected,
      evidence.actual,
      passed ? BENCHMARK_RESULT_STATUS.PASSED : BENCHMARK_RESULT_STATUS.FAILED,
      passed ? [] : ['Actual evidence does not match independent expected evidence.'],
      evidence.numericTolerances,
    );
  } catch (error) {
    return buildResult(catalogItem, {}, {}, {}, BENCHMARK_RESULT_STATUS.FAILED, [errorMessage(error)], null);
  }
}

function runQaRegistryCase(catalogItem, completedResults) {
  const catalogTabs = [...new Set(TAB_BENCHMARK_CATALOG.map((item) => item.tabId))];
  const upstreamFailures = completedResults.filter((result) => (
    result.tabId !== 'benchmarks' && result.status !== BENCHMARK_RESULT_STATUS.PASSED
  )).length;
  const actual = {
    navigationMatchesCatalog: stableStringify([...SIMPLIFIED_TAB_IDS].sort()) === stableStringify(catalogTabs.sort()),
    orphanCaseCount: TAB_BENCHMARK_CATALOG.filter((item) => !SIMPLIFIED_TAB_IDS.includes(item.tabId)).length,
    missingTabCount: SIMPLIFIED_TAB_IDS.filter((tabId) => !catalogTabs.includes(tabId)).length,
    upstreamTabFailures: upstreamFailures,
  };
  const expected = { navigationMatchesCatalog: true, orphanCaseCount: 0, missingTabCount: 0, upstreamTabFailures: 0 };
  const status = stableStringify(actual) === stableStringify(expected)
    ? BENCHMARK_RESULT_STATUS.PASSED
    : BENCHMARK_RESULT_STATUS.FAILED;
  return buildResult(
    catalogItem,
    { navigationTabIds: [...SIMPLIFIED_TAB_IDS], catalogCaseIds: TAB_BENCHMARK_CATALOG.map((item) => item.caseId) },
    expected,
    actual,
    status,
    status === BENCHMARK_RESULT_STATUS.PASSED ? [] : ['Navigation, catalog, or upstream status reconciliation failed.'],
    null,
  );
}

function buildResult(catalogItem, input, expected, actual, status, diagnostics, numericTolerances) {
  return createTabBenchmarkResult({
    schema: TAB_BENCHMARK_RESULT_SCHEMA,
    appId: SIMPLIFIED_APP_ID,
    tabId: catalogItem.tabId,
    caseId: catalogItem.caseId,
    category: catalogItem.category,
    evidenceBasis: catalogItem.evidenceBasis,
    inputSemanticHash: semanticHash(input),
    expectedEvidence: expected,
    actualEvidence: actual,
    numericTolerances,
    status,
    diagnostics,
  });
}

function evaluateHomeViewer() {
  const fixture = readText('benchmarks/fixtures/pcf/test2.pcf');
  const parsed = parsePcfWithDiagnostics(fixture);
  const geometry = pcfToCanonicalGeometry(parsed.components, { source: 'test2.pcf', unit: 'mm' });
  const coordinates = geometry.nodes.flatMap((node) => [node.x, node.y, node.z]);
  return evidence(
    { fixture: 'benchmarks/fixtures/pcf/test2.pcf' },
    { componentCount: 1, nodeCount: 3, segmentCount: 2, bounds: [0, 50], finiteCoordinateCount: 9 },
    {
      componentCount: parsed.components.length,
      nodeCount: geometry.nodes.length,
      segmentCount: geometry.segments.length,
      bounds: [Math.min(...coordinates), Math.max(...coordinates)],
      finiteCoordinateCount: coordinates.filter(Number.isFinite).length,
    },
    null,
  );
}

function evaluateHomeInteraction() {
  const source = readText('src/components/Viewer3DTab.jsx');
  return evidence(
    { source: 'src/components/Viewer3DTab.jsx' },
    { rendersComponents: true, updatesSelection: true, supportsSectionBounds: true, forwardsSelectionToSketcher: true },
    {
      rendersComponents: source.includes('viewerRef.current.render(components)'),
      updatesSelection: source.includes('viewerRef.current.updateSelection(selectedIds)'),
      supportsSectionBounds: source.includes('setClippingBounds('),
      forwardsSelectionToSketcher: source.includes('getSelectedCanonicalGeometry()'),
    },
    null,
  );
}

function evaluateBrowserWorkflow(catalogItem) {
  if (!browserWorkflowRun) {
    browserWorkflowRun = runPlaywrightQualification();
  }
  return evidence(
    {
      script: browserWorkflowRun.script,
      tabId: catalogItem.tabId,
      testFileSemanticHash: semanticHash(readText('e2e/simplified-nine-tab-qualification.spec.js')),
    },
    { exitCode: 0, tabCovered: true },
    {
      exitCode: browserWorkflowRun.exitCode,
      tabCovered: SIMPLIFIED_TAB_IDS.includes(catalogItem.tabId),
    },
    null,
  );
}

function evaluatePcfRoundTrip() {
  const sourceText = readText('benchmarks/fixtures/pcf/test1.pcf');
  const initial = parsePcfWithDiagnostics(sourceText);
  const exported = serializePcf(initial.components);
  const imported = parsePcfWithDiagnostics(exported);
  const geometryComponents = imported.components.filter((component) => component.type !== 'MESSAGE-SQUARE');
  return evidence(
    { fixture: 'benchmarks/fixtures/pcf/test1.pcf' },
    { geometryComponentCount: 1, type: 'PIPE', itemCodePreserved: true, endpointsPreserved: true, annotationCount: 1 },
    {
      geometryComponentCount: geometryComponents.length,
      type: geometryComponents[0]?.type,
      itemCodePreserved: geometryComponents[0]?.attributes?.['ITEM-CODE'] === 'TEST-PIPE',
      endpointsPreserved: stableStringify(geometryComponents[0]?.points) === stableStringify(initial.components[0]?.points),
      annotationCount: imported.components.filter((component) => component.type === 'MESSAGE-SQUARE').length,
    },
    null,
  );
}

function evaluateMalformedPcf() {
  const parsed = parsePcfWithDiagnostics('PIPE\n    END-POINT broken coordinate payload');
  return evidence(
    { inputClass: '[SIMULATED] malformed PCF coordinate' },
    { componentCount: 1, componentsWithoutGeometry: 1, invalidCoordinateDiagnostic: true },
    {
      componentCount: parsed.components.length,
      componentsWithoutGeometry: parsed.summary.componentsWithoutGeometry,
      invalidCoordinateDiagnostic: parsed.diagnostics.some((item) => item.code === 'PCF_COORD_INVALID_NUMBER'),
    },
    null,
  );
}

function evaluateSketcher() {
  const checks = [
    runNodeScript('scripts/u4-sketcher-topology-behavior-test.mjs'),
    runNodeScript('scripts/v11-sketcher-drafting-commands-behavior-test.mjs'),
    runNodeScript('scripts/v15-pcfx-roundtrip-behavior-test.mjs'),
    runNodeScript('scripts/v18a-viewer-to-sketcher-adapter-behavior-test.mjs'),
  ];
  return evidence(
    { checks: checks.map((check) => check.script) },
    { checkCount: 4, passedChecks: 4, failedChecks: 0 },
    {
      checkCount: checks.length,
      passedChecks: checks.filter((check) => check.exitCode === 0).length,
      failedChecks: checks.filter((check) => check.exitCode !== 0).length,
    },
    null,
  );
}

function evaluateGc3d() {
  return engineeringAggregate(['3d-guided-cantilever'], 6);
}

function evaluatePipeSolver() {
  return engineeringAggregate(['2d-math', 'calc-extended', 'engineering-data', 'piperack-expansion-loop'], 22);
}

function evaluateReports() {
  const aggregate = engineeringAggregate(['reporting'], 7);
  const behavior = runNodeScript('scripts/u6-active-reporting-behavior-test.mjs');
  return evidence(
    { ...aggregate.input, behaviorScript: behavior.script },
    { engineeringCases: 7, engineeringPassed: 7, behaviorExitCode: 0 },
    { engineeringCases: aggregate.actual.total, engineeringPassed: aggregate.actual.passed, behaviorExitCode: behavior.exitCode },
    null,
  );
}

function evaluateSettingsUnits() {
  const forceN = convertUnit({ value: 1000, fromUnit: 'lbf', toUnit: 'N', quantity: 'force', includeTrace: false });
  const stressMpa = convertUnit({ value: 100, fromUnit: 'psi', toUnit: 'MPa', quantity: 'stress', includeTrace: false });
  const requiredKeys = ['projectUnitSystem', 'defaultLengthUnit', 'defaultForceUnit', 'defaultStressUnit', 'benchmarkCertificationRequired'];
  return evidence(
    { force: '1000 lbf', stress: '100 psi', profile: 'DEFAULT_ENGINEERING_SETTINGS' },
    { requiredProfileFields: 5, forceN: 4448.2216152605, stressMpa: 0.6894757293168 },
    {
      requiredProfileFields: requiredKeys.filter((key) => Object.hasOwn(DEFAULT_ENGINEERING_SETTINGS, key)).length,
      forceN,
      stressMpa,
    },
    { absolute: 1e-12 },
  );
}

function evaluateSettingsState() {
  const storeSource = readText('src/store/appStore.js');
  const settingsSource = readText('src/settings/SettingsTab.jsx');
  return evidence(
    { sources: ['src/store/appStore.js', 'src/settings/SettingsTab.jsx'] },
    { editsMarkStale: true, settingsOnlyPersistence: true, staleBannerVisible: true },
    {
      editsMarkStale: storeSource.includes('resultsStale: true'),
      settingsOnlyPersistence: storeSource.includes('partialize: (state) => ({ engineeringDefaults: state.engineeringDefaults })'),
      staleBannerVisible: settingsSource.includes('settings-results-stale-banner'),
    },
    null,
  );
}

function evaluateDebugTrace() {
  const sample = [{ id: 'first', level: 'info' }, { id: 'second', level: 'warn' }];
  const before = stableStringify(sample);
  const snapshot = snapshotSessionLog(sample);
  const storeSource = readText('src/store/appStore.js');
  return evidence(
    { inputClass: '[SIMULATED] two-entry diagnostic trace' },
    { newestFirst: ['second', 'first'], inputUnchanged: true, snapshotFrozen: true, stage1Registered: true, stage2Registered: true },
    {
      newestFirst: snapshot.map((entry) => entry.id),
      inputUnchanged: before === stableStringify(sample),
      snapshotFrozen: Object.isFrozen(snapshot) && snapshot.every(Object.isFrozen),
      stage1Registered: storeSource.includes('stage1: []'),
      stage2Registered: storeSource.includes('stage2: []'),
    },
    null,
  );
}

function evaluateRealProjectCompatibility() {
  const dataset = readJson('benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json');
  const compatibleSchemas = ['pcf-text', 'pcfx-roundtrip-adapter-v1', 'canonical-geometry-v1'];
  return evidence(
    { fixture: 'benchmarks/ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json', schema: dataset.schema },
    { schema: 'inputxml-managed-stage/v1', compatibleWithSimplifiedImport: false, transformed: false },
    {
      schema: dataset.schema,
      compatibleWithSimplifiedImport: compatibleSchemas.includes(dataset.schema),
      transformed: false,
    },
    null,
  );
}

function engineeringAggregate(modules, expectedCount) {
  const cases = ENGINEERING_REPORT.caseResults.filter((item) => modules.includes(item.module));
  return evidence(
    { engineeringReport: 'reports/benchmark-results.json', modules },
    { total: expectedCount, passed: expectedCount, failed: 0 },
    {
      total: cases.length,
      passed: cases.filter((item) => item.status === 'PASSED').length,
      failed: cases.filter((item) => item.status !== 'PASSED').length,
    },
    null,
  );
}

function summarizeTab(tabId, suiteResults) {
  const catalogCases = TAB_BENCHMARK_CATALOG.filter((item) => item.tabId === tabId);
  const caseResults = suiteResults.filter((item) => item.tabId === tabId);
  let status = TAB_QUALIFICATION_STATUS.NOT_RUN;
  if (caseResults.some((item) => item.status === BENCHMARK_RESULT_STATUS.FAILED)) status = TAB_QUALIFICATION_STATUS.FAILED;
  else if (caseResults.length === catalogCases.length && caseResults.every((item) => item.status === BENCHMARK_RESULT_STATUS.PASSED)) {
    status = TAB_QUALIFICATION_STATUS.QUALIFIED;
  }
  return {
    tabId,
    status,
    caseIds: catalogCases.map((item) => item.caseId),
    passedCases: caseResults.filter((item) => item.status === BENCHMARK_RESULT_STATUS.PASSED).length,
    failedCases: caseResults.filter((item) => item.status === BENCHMARK_RESULT_STATUS.FAILED).length,
    notRunCases: caseResults.filter((item) => item.status === BENCHMARK_RESULT_STATUS.NOT_RUN).length,
  };
}

function evidence(input, expected, actual, numericTolerances) {
  return { input, expected, actual, numericTolerances };
}

function runNodeScript(script) {
  const run = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8' });
  return { script, exitCode: run.status ?? 1 };
}

function runPlaywrightQualification() {
  const script = 'scripts/run-playwright.mjs';
  const run = spawnSync(process.execPath, [
    script,
    'e2e/simplified-nine-tab-qualification.spec.js',
    '--project=chromium',
    '--reporter=line',
    '--workers=1',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
  });
  return { script, exitCode: run.status ?? 1 };
}

function evidenceMatches(expected, actual, numericTolerances) {
  if (typeof expected === 'number' && typeof actual === 'number') {
    const absolute = numericTolerances?.absolute ?? 0;
    const relative = numericTolerances?.relative ?? 0;
    const allowed = Math.max(absolute, relative * Math.max(Math.abs(expected), Math.abs(actual)));
    return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= allowed;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
    return expected.every((value, index) => evidenceMatches(value, actual[index], numericTolerances));
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    return stableStringify(expectedKeys) === stableStringify(actualKeys)
      && expectedKeys.every((key) => evidenceMatches(expected[key], actual[key], numericTolerances));
  }
  return Object.is(expected, actual);
}

function renderMarkdown(suiteValue) {
  let markdown = '# Simplified Analysis Tab Qualification\n\n';
  markdown += `Semantic hash: \`${suiteValue.semanticHash}\`\n\n`;
  markdown += '| Tab | Status | Passed | Failed | Not Run |\n| --- | --- | ---: | ---: | ---: |\n';
  suiteValue.tabs.forEach((tab) => {
    markdown += `| ${tab.tabId} | **${tab.status}** | ${tab.passedCases} | ${tab.failedCases} | ${tab.notRunCases} |\n`;
  });
  markdown += '\n| Case | Tab | Basis | Status | Input hash |\n| --- | --- | --- | --- | --- |\n';
  suiteValue.results.forEach((result) => {
    markdown += `| ${result.caseId} | ${result.tabId} | ${result.evidenceBasis} | **${result.status}** | \`${result.inputSemanticHash}\` |\n`;
  });
  return markdown;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
