/**
 * Build gate for Simplified Analysis navigation and qualification coverage.
 *
 * Functionality: reconciles the product tab source, rendered panels, benchmark
 * catalog, and generated suite.
 * Inputs: source registries plus deterministic JSON report.
 * Output: success message or actionable errors with non-zero exit.
 * Fallback: any mismatch fails closed before Vite builds.
 */

import fs from 'node:fs';
import path from 'node:path';
import { uiTabs, SIMPLIFIED_TAB_IDS } from '../src/config/uiTabs.js';
import { TAB_BENCHMARK_CATALOG } from '../src/benchmarking/tabBenchmarkCatalog.js';
import { createTabBenchmarkSuite } from '../src/benchmarking/tabBenchmarkContracts.js';

const ROOT = process.cwd();
const EXPECTED_TAB_IDS = Object.freeze([
  'home',
  'pcf',
  'sketcher',
  '3d-analysis',
  'simpAnalysis',
  'reports',
  'benchmarks',
  'settings',
  'diagnostics',
]);
const errors = [];

compareOrdered('Authoritative navigation', SIMPLIFIED_TAB_IDS, EXPECTED_TAB_IDS);
compareOrdered('uiTabs metadata', uiTabs.map((tab) => tab.id), EXPECTED_TAB_IDS);
ensureUnique('navigation tab IDs', SIMPLIFIED_TAB_IDS);
ensureUnique('benchmark case IDs', TAB_BENCHMARK_CATALOG.map((item) => item.caseId));

const catalogTabIds = [...new Set(TAB_BENCHMARK_CATALOG.map((item) => item.tabId))];
compareSet('Benchmark catalog tabs', catalogTabIds, EXPECTED_TAB_IDS);
EXPECTED_TAB_IDS.forEach((tabId) => {
  if (!TAB_BENCHMARK_CATALOG.some((item) => item.tabId === tabId)) {
    errors.push(`Tab "${tabId}" has no required benchmark evidence.`);
  }
});

const appSource = read('src/App.jsx');
const renderedTabIds = [...appSource.matchAll(/^\s*(?:'([^']+)'|([A-Za-z][\w-]*)):\s*</gm)]
  .map((match) => match[1] || match[2]);
compareOrdered('App rendered panels', renderedTabIds, EXPECTED_TAB_IDS);

const topNavSource = read('src/components/TopNav.jsx');
if (!topNavSource.includes('uiTabs.map(')) errors.push('TopNav must render the authoritative uiTabs registry.');
for (const forbidden of ['CalculationWorkspaceTab', 'WorkspaceHandoffBridge', "id: 'workspace'", "id: 'load-calc'"]) {
  if (appSource.includes(forbidden) || topNavSource.includes(forbidden)) {
    errors.push(`Removed Advanced-only product token remains mounted: ${forbidden}`);
  }
}

const moduleRegistrySource = read('src/config/moduleRegistry.js');
if (moduleRegistrySource.includes("id: 'calculation-workspace'")) {
  errors.push('Calculation Workspace remains registered in the Simplified module registry.');
}

let suite;
try {
  suite = createTabBenchmarkSuite(JSON.parse(read('reports/tab-benchmark-results.json')));
} catch (error) {
  errors.push(`Generated benchmark suite is invalid: ${error instanceof Error ? error.message : String(error)}`);
}

if (suite) {
  compareOrdered('Suite navigation snapshot', suite.navigationTabIds, EXPECTED_TAB_IDS);
  compareOrdered('Suite tab summaries', suite.tabs.map((tab) => tab.tabId), EXPECTED_TAB_IDS);
  compareOrdered(
    'Suite case results',
    suite.results.map((result) => result.caseId),
    TAB_BENCHMARK_CATALOG.map((item) => item.caseId),
  );
}

if (errors.length > 0) {
  console.error('Tab benchmark registry validation failed:');
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log('Tab benchmark registry validation passed: exactly nine rendered and qualified Simplified tabs.');

function compareOrdered(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${label} mismatch. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

function compareSet(label, actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    errors.push(`${label} mismatch. Expected ${JSON.stringify(expectedSorted)}, received ${JSON.stringify(actualSorted)}.`);
  }
}

function ensureUnique(label, values) {
  if (new Set(values).size !== values.length) errors.push(`${label} contain duplicates.`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}
