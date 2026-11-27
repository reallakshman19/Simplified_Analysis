import React, { useEffect, useState } from 'react';
import { executeBenchmarkFixture } from './executeBenchmarkFixture.js';
import { useAppStore } from '../store/appStore';
import { publishActiveReportContext } from '../reporting/publishActiveReportContext.js';

const files = import.meta.glob('../../benchmarks/fixtures/**/*.json', { eager: true, import: 'default' });

function ValueRows({ value, prefix = '' }) {
  if (value == null || typeof value !== 'object') return <tr><td>{prefix}</td><td>{String(value ?? '—')}</td></tr>;
  return Object.entries(value).map(([key, item]) => <ValueRows key={key} value={item} prefix={prefix ? prefix + '.' + key : key} />);
}

export function BenchmarkFixturePanel({ mock }) {
  const [execution, setExecution] = useState(null);
  const [error, setError] = useState('');
  const [sequence, setSequence] = useState(0);
  const clear = useAppStore(state => state.clearBenchmarkMock);
  useEffect(() => {
    let active = true;
    setExecution(null);
    setError('');
    const fixture = files['../../' + mock.benchmarkFixture];
    if (!fixture) { setError('The registered benchmark fixture was not found.'); return; }
    executeBenchmarkFixture(fixture).then(outcome => {
      if (active) setExecution(outcome);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [mock, sequence]);
  const publish = () => {
    if (!execution) return;
    publishActiveReportContext({ moduleId: mock.module, title: 'Benchmark fixture — ' + mock.title, input: mock.benchmarkInput.input, result: execution.result, benchmarkStatus: 'MOCK_LOADED' });
    useAppStore.getState().setActiveTab('reports');
  };
  return (
    <section data-testid="live-benchmark-fixture" style={{ padding: 20, overflow: 'auto', color: '#e2e8f0', background: '#111827' }}>
      <h3>{mock.id}: {mock.title}</h3>
      <p>Executed fixture, separate from the editable project. This is not project qualification.</p>
      <button onClick={() => setSequence(n => n + 1)}>Re-run fixture</button>{' '}
      <button onClick={clear}>Return to project</button>
      {error && <p role="alert">{error}</p>}
      {!execution && !error && <p>Evaluating…</p>}
      {execution && <>
        <p data-testid="live-benchmark-verdict" style={{ color: execution.passed ? '#4ade80' : '#f87171' }}>
          {execution.passed ? 'PASSED' : 'FAILED'} — current fixture comparison; rounded error {execution.maxError}
        </p>
        <p>Method: {execution.result.methodId} · Solver status: {execution.result.status}</p>
        <button onClick={publish}>View fixture report in Reports</button>
        <details open><summary>Actual computed output</summary><table><tbody><ValueRows value={execution.actual} /></tbody></table></details>
        <details><summary>Fixture input</summary><table><tbody><ValueRows value={mock.benchmarkInput.input} /></tbody></table></details>
      </>}
    </section>
  );
}
