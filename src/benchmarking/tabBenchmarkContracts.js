/**
 * Immutable tab-qualification contracts.
 *
 * Functionality: validates and freezes benchmark case results and suites.
 * Inputs: plain JSON-compatible result or suite records.
 * Outputs: immutable `tab-benchmark-result/v1` and
 * `tab-benchmark-suite/v1` values.
 * Fallback: invalid contracts raise explicit TypeError exceptions.
 */

export const TAB_BENCHMARK_RESULT_SCHEMA = 'tab-benchmark-result/v1';
export const TAB_BENCHMARK_SUITE_SCHEMA = 'tab-benchmark-suite/v1';

export const EVIDENCE_BASIS = Object.freeze({
  REAL_PROJECT: 'REAL_PROJECT',
  ANALYTICAL: 'ANALYTICAL',
  REGRESSION: 'REGRESSION',
  SIMULATED: '[SIMULATED]',
});

export const BENCHMARK_RESULT_STATUS = Object.freeze({
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  NOT_RUN: 'NOT_RUN',
});

export const TAB_QUALIFICATION_STATUS = Object.freeze({
  QUALIFIED: 'QUALIFIED',
  FAILED: 'FAILED',
  NOT_RUN: 'NOT_RUN',
});

/**
 * Recursively freezes an object or array without mutating primitive values.
 *
 * @template T
 * @param {T} value JSON-compatible value.
 * @returns {Readonly<T>} Frozen value.
 */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates a stable JSON representation with recursively sorted object keys.
 *
 * @param {unknown} value JSON-compatible value.
 * @returns {string} Deterministic JSON text.
 */
export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

/**
 * Generates a deterministic FNV-1a semantic hash.
 *
 * @param {unknown} value JSON-compatible value.
 * @returns {string} Prefixed hexadecimal semantic hash.
 */
export function semanticHash(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Validates and freezes one tab benchmark result.
 *
 * @param {Record<string, unknown>} result Candidate result.
 * @returns {Readonly<Record<string, unknown>>} Frozen validated result.
 */
export function createTabBenchmarkResult(result) {
  requireRecord(result, 'Tab benchmark result');
  requireExact(result.schema, TAB_BENCHMARK_RESULT_SCHEMA, 'result.schema');
  requireString(result.appId, 'result.appId');
  requireString(result.tabId, 'result.tabId');
  requireString(result.caseId, 'result.caseId');
  requireString(result.category, 'result.category');
  requireAllowed(result.evidenceBasis, Object.values(EVIDENCE_BASIS), 'result.evidenceBasis');
  requireString(result.inputSemanticHash, 'result.inputSemanticHash');
  requireRecord(result.expectedEvidence, 'result.expectedEvidence');
  requireRecord(result.actualEvidence, 'result.actualEvidence');
  if (result.numericTolerances !== null) {
    requireRecord(result.numericTolerances, 'result.numericTolerances');
  }
  requireAllowed(result.status, Object.values(BENCHMARK_RESULT_STATUS), 'result.status');
  if (!Array.isArray(result.diagnostics)) {
    throw new TypeError('result.diagnostics must be an array.');
  }
  return deepFreeze(structuredClone(result));
}

/**
 * Validates and freezes a complete tab benchmark suite.
 *
 * @param {Record<string, unknown>} suite Candidate suite.
 * @returns {Readonly<Record<string, unknown>>} Frozen validated suite.
 */
export function createTabBenchmarkSuite(suite) {
  requireRecord(suite, 'Tab benchmark suite');
  requireExact(suite.schema, TAB_BENCHMARK_SUITE_SCHEMA, 'suite.schema');
  requireString(suite.appId, 'suite.appId');
  if (!Array.isArray(suite.navigationTabIds) || !Array.isArray(suite.tabs) || !Array.isArray(suite.results)) {
    throw new TypeError('suite navigationTabIds, tabs, and results must be arrays.');
  }
  suite.results.forEach((result) => createTabBenchmarkResult(result));
  suite.tabs.forEach((tab) => {
    requireRecord(tab, 'suite tab summary');
    requireString(tab.tabId, 'suite tabSummary.tabId');
    requireAllowed(tab.status, Object.values(TAB_QUALIFICATION_STATUS), 'suite tabSummary.status');
  });
  requireRecord(suite.summary, 'suite.summary');
  requireString(suite.semanticHash, 'suite.semanticHash');
  return deepFreeze(structuredClone(suite));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map((item) => sortValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((sorted, key) => {
    sorted[key] = sortValue(value[key]);
    return sorted;
  }, {});
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function requireExact(actual, expected, label) {
  if (actual !== expected) {
    throw new TypeError(`${label} must be "${expected}", received "${String(actual)}".`);
  }
}

function requireAllowed(actual, allowed, label) {
  if (!allowed.includes(actual)) {
    throw new TypeError(`${label} has unsupported value "${String(actual)}".`);
  }
}
