/**
 * Required qualification evidence for every Simplified Analysis tab.
 *
 * Functionality: declares minimum benchmark cases and evidence provenance.
 * Inputs: none.
 * Output: immutable case catalog consumed by runners and registry validation.
 * Fallback: registry validation rejects missing, duplicated, or orphaned cases.
 */

import { EVIDENCE_BASIS, deepFreeze } from './tabBenchmarkContracts.js';

export const TAB_BENCHMARK_CATALOG = deepFreeze([
  {
    tabId: 'home',
    caseId: 'HOME-PCF-VIEWER-001',
    category: 'dataset-import-render-model',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'home',
    caseId: 'HOME-SELECTION-VISIBILITY-001',
    category: 'selection-visibility-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'home',
    caseId: 'HOME-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'pcf',
    caseId: 'PCF-ROUNDTRIP-001',
    category: 'parse-serialize-roundtrip',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'pcf',
    caseId: 'PCF-MALFORMED-001',
    category: 'malformed-input-rejection',
    evidenceBasis: EVIDENCE_BASIS.SIMULATED,
  },
  {
    tabId: 'pcf',
    caseId: 'PCF-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'sketcher',
    caseId: 'SKETCHER-TOPOLOGY-001',
    category: 'topology-drafting-handoff',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'sketcher',
    caseId: 'SKETCHER-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: '3d-analysis',
    caseId: 'GC3D-ANALYTICAL-SUITE-001',
    category: 'guided-cantilever-reference',
    evidenceBasis: EVIDENCE_BASIS.ANALYTICAL,
  },
  {
    tabId: '3d-analysis',
    caseId: 'GC3D-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'simpAnalysis',
    caseId: 'PIPE-SOLVER-ANALYTICAL-SUITE-001',
    category: '2d-3d-piperack-routing',
    evidenceBasis: EVIDENCE_BASIS.ANALYTICAL,
  },
  {
    tabId: 'simpAnalysis',
    caseId: 'PIPE-SOLVER-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'reports',
    caseId: 'REPORT-DETERMINISM-001',
    category: 'deterministic-export-stale-result',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'reports',
    caseId: 'REPORTS-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'benchmarks',
    caseId: 'QA-REGISTRY-RECONCILIATION-001',
    category: 'registry-status-aggregation',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'benchmarks',
    caseId: 'QA-REAL-PROJECT-COMPATIBILITY-001',
    category: 'real-project-schema-compatibility',
    evidenceBasis: EVIDENCE_BASIS.REAL_PROJECT,
  },
  {
    tabId: 'benchmarks',
    caseId: 'QA-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'settings',
    caseId: 'SETTINGS-PROFILE-UNITS-001',
    category: 'profile-validation-unit-conversion',
    evidenceBasis: EVIDENCE_BASIS.ANALYTICAL,
  },
  {
    tabId: 'settings',
    caseId: 'SETTINGS-STALE-PERSISTENCE-001',
    category: 'persistence-staleness-contract',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'settings',
    caseId: 'SETTINGS-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
  {
    tabId: 'diagnostics',
    caseId: 'DEBUG-TRACE-IMMUTABILITY-001',
    category: 'trace-order-non-mutating-inspection',
    evidenceBasis: EVIDENCE_BASIS.SIMULATED,
  },
  {
    tabId: 'diagnostics',
    caseId: 'DEBUG-BROWSER-WORKFLOW-001',
    category: 'browser-workflow',
    evidenceBasis: EVIDENCE_BASIS.REGRESSION,
  },
]);
