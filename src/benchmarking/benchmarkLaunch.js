import { isSimplifiedTabId } from '../config/uiTabs.js';

// Only send transferable inputs to a calculation workspace. A formula-only
// fixture remains in QA and runs against the actual solver export there.
export function benchmarkLaunchPlan(item) {
  if (item?.module === '2d-math') return { loadTargetTab: 'simpAnalysis', loadTargetSubTab: '2d', launchMode: '2d' };
  if (item?.module === 'piperack-expansion-loop' && Array.isArray(item.benchmarkInput?.input?.lines)) {
    return { loadTargetTab: 'simpAnalysis', loadTargetSubTab: 'piperack', launchMode: 'rack' };
  }
  return { loadTargetTab: 'benchmarks', loadTargetSubTab: null, launchMode: 'fixture' };
}

export function buildBenchmarkLoadState(mock) {
  if (!mock?.id || !mock.benchmarkInput) throw new Error('Invalid benchmark fixture.');
  const plan = benchmarkLaunchPlan(mock);
  if (!isSimplifiedTabId(plan.loadTargetTab)) throw new Error('Invalid benchmark target.');
  return {
    currentBenchmarkMock: { ...mock, ...plan, isBenchmarkMock: true },
    activeTab: plan.loadTargetTab,
    analysisPayload: mock.benchmarkInput,
    resultsStale: true,
  };
}
