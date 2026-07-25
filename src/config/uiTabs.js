/**
 * Authoritative Simplified Analysis product navigation.
 *
 * Functionality: defines the exact public tab order consumed by navigation,
 * rendering, benchmark qualification, and static reconciliation.
 * Inputs: none.
 * Output: deeply immutable tab metadata.
 * Fallback: unknown tab identifiers resolve to the Home/Viewer tab.
 */

export const SIMPLIFIED_APP_ID = 'simplified-analysis';
export const DEFAULT_TAB_ID = 'home';

export const uiTabs = Object.freeze([
  Object.freeze({ id: 'home', label: 'Home/Viewer', title: 'PCF intake and 3D viewer', iconId: 'home' }),
  Object.freeze({ id: 'pcf', label: 'PCF', title: 'PCF data and import diagnostics', iconId: 'table' }),
  Object.freeze({ id: 'sketcher', label: 'Sketcher', title: 'Geometry and topology editor', iconId: 'pen-tool' }),
  Object.freeze({ id: '3d-analysis', label: '3D Calc', title: '3D guided-cantilever calculation', iconId: 'layers' }),
  Object.freeze({ id: 'simpAnalysis', label: 'Pipe Solver', title: '2D, 3D, and pipe-rack screening', iconId: 'activity' }),
  Object.freeze({ id: 'reports', label: 'Reports', title: 'Calculation reports and issue workflow', iconId: 'file-text' }),
  Object.freeze({ id: 'benchmarks', label: 'QA', title: 'Benchmarks / Validation', iconId: 'check-square' }),
  Object.freeze({ id: 'settings', label: 'Settings', title: 'Engineering settings and defaults', iconId: 'settings' }),
  Object.freeze({ id: 'diagnostics', label: 'Debug', title: 'Processing diagnostics and session trace', iconId: 'wrench' }),
]);

export const SIMPLIFIED_TAB_IDS = Object.freeze(uiTabs.map((tab) => tab.id));

/**
 * Checks whether a value is a registered Simplified Analysis tab identifier.
 *
 * @param {unknown} tabId Candidate tab identifier.
 * @returns {boolean} True only for one of the nine public tabs.
 */
export function isSimplifiedTabId(tabId) {
  return typeof tabId === 'string' && SIMPLIFIED_TAB_IDS.includes(tabId);
}

/**
 * Resolves an arbitrary value to a safe public tab identifier.
 *
 * @param {unknown} tabId Candidate tab identifier.
 * @returns {string} Registered tab identifier, otherwise Home/Viewer.
 */
export function resolveSimplifiedTabId(tabId) {
  return isSimplifiedTabId(tabId) ? tabId : DEFAULT_TAB_ID;
}
