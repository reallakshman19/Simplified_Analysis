import React from 'react';
import { useAppStore } from '../store/appStore';
import { getEngineeringIcon } from '../config/engineeringIcons';
import { engineeringMockCatalog, mockGroups } from '../mocks/engineeringMockCatalog';
import { uiTabs } from '../config/uiTabs';
import { TabQualificationBadge } from '../benchmarking/TabQualificationBadge';
import { tabBenchmarkSuite } from '../benchmarking/tabBenchmarkSnapshot';

const cardStyle = {
  background: '#111827',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minHeight: 180
};

const buttonStyle = {
  border: '1px solid #3b82f6',
  background: '#1d4ed8',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 700
};

function downloadQualificationEvidence() {
  const blob = new Blob([`${JSON.stringify(tabBenchmarkSuite, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'simplified-tab-benchmark-results.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function QualificationOverview() {
  return (
    <section data-testid="tab-qualification-overview" style={{ marginBottom: 28 }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Visible Tab Qualification</h3>
          <div data-testid="tab-qualification-semantic-hash" style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
            {tabBenchmarkSuite.semanticHash}
          </div>
        </div>
        <button data-testid="download-tab-qualification" onClick={downloadQualificationEvidence} style={buttonStyle} type="button">
          Download evidence JSON
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: 14 }}>
        {uiTabs.map((tab) => {
          const summary = tabBenchmarkSuite.tabs.find((item) => item.tabId === tab.id);
          const results = tabBenchmarkSuite.results.filter((item) => item.tabId === tab.id);
          return (
            <details data-testid={`qa-tab-status-${tab.id}`} key={tab.id} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
              <summary style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: 8 }}>
                <strong style={{ color: '#f8fafc' }}>{tab.label}</strong>
                <span style={{ marginLeft: 'auto' }}><TabQualificationBadge compact={false} tabId={tab.id} /></span>
              </summary>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 10 }}>
                {summary?.passedCases || 0} passed · {summary?.failedCases || 0} failed · {summary?.notRunCases || 0} not run
              </div>
              {results.map((result) => (
                <div key={result.caseId} style={{ borderTop: '1px solid #1e293b', marginTop: 8, paddingTop: 8 }}>
                  <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: 10 }}>{result.caseId}</div>
                  <div style={{ color: '#64748b', fontSize: 10 }}>{result.evidenceBasis} · {result.status}</div>
                </div>
              ))}
            </details>
          );
        })}
      </div>
    </section>
  );
}

function MockCard({ item, latestStatus }) {
  const loadBenchmarkMock = useAppStore((state) => state.loadBenchmarkMock);
  const Icon = getEngineeringIcon(item.iconId);
  const status = latestStatus?.[item.id] || item.latestStatus || 'NOT_RUN';
  return (
    <div data-testid={`benchmark-card-${item.id}`} style={cardStyle}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ background: '#0f172a', padding: 8, borderRadius: 8, color: '#60a5fa' }}><Icon size={20} /></div>
        <div>
          <div style={{ color: '#f8fafc', fontWeight: 800 }}>{item.caseId || item.id}</div>
          <div style={{ color: '#cbd5e1', fontSize: 13 }}>{item.title}</div>
        </div>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>Module: {item.module}</div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>Method: {item.methodId}</div>
      <div style={{ color: '#e2e8f0', fontSize: 12 }}>Expected: {item.expectedSummary}</div>
      <div style={{ color: status === 'PASSED' ? '#22c55e' : '#fbbf24', fontSize: 12, fontWeight: 700 }}>Latest status: {status}</div>
      <div style={{ color: '#64748b', fontSize: 11, wordBreak: 'break-all' }}>{item.benchmarkFixture}</div>
      <button data-testid={`load-benchmark-${item.id}`} style={buttonStyle} onClick={() => loadBenchmarkMock({ ...item, isBenchmarkMock: true, benchmarkInput: item.benchmarkInput })}>Load Benchmark Mock</button>
    </div>
  );
}

export function BenchmarksValidationTab() {
  const currentBenchmarkMock = useAppStore((state) => state.currentBenchmarkMock);
  const latestStatus = engineeringMockCatalog.reduce((acc, item) => ({ ...acc, [item.id]: item.latestStatus }), {});
  return (
    <div data-testid="benchmarks-validation-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginTop: 0 }}>Benchmarks / Validation</h2>
      <p style={{ color: '#cbd5e1' }}>
        Every visible tab is reconciled against deterministic evidence. Mock cards below remain engineering fixture launchers and are labelled separately from qualification.
      </p>
      <QualificationOverview />
      {currentBenchmarkMock && (
        <div data-testid="current-benchmark-mock" style={{ background: '#422006', border: '1px solid #f59e0b', color: '#fde68a', padding: 12, borderRadius: 10, marginBottom: 18 }}>
          Current benchmark mock: <b>{currentBenchmarkMock.id}</b> from {currentBenchmarkMock.benchmarkFixture}
        </div>
      )}
      {mockGroups.map((group) => {
        const items = engineeringMockCatalog.filter(group.match);
        return (
          <section key={group.title} style={{ marginBottom: 26 }}>
            <h3 style={{ color: '#e2e8f0' }}>{group.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {items.map((item) => <MockCard key={item.id} item={item} latestStatus={latestStatus} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
