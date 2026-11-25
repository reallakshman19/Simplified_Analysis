/**
 * Per-tab qualification evidence banner.
 *
 * Functionality: makes generated qualification status and evidence access
 * visible inside every tab.
 * Inputs: active tab identifier.
 * Output: status banner with a link to the QA tab.
 * Fallback: missing results display Not Run through the badge component.
 */

import React from 'react';
import { useAppStore } from '../store/appStore';
import { TabQualificationBadge } from './TabQualificationBadge';
import { tabBenchmarkSuite } from './tabBenchmarkSnapshot';

export function TabQualificationBanner({ tabId }) {
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const tabSummary = tabBenchmarkSuite.tabs.find((tab) => tab.tabId === tabId);
  const caseCount = tabSummary?.caseIds?.length || 0;
  return (
    <div
      data-testid="tab-qualification-banner"
      style={{
        alignItems: 'center',
        background: '#111827',
        borderBottom: '1px solid #334155',
        color: '#cbd5e1',
        display: 'flex',
        flexShrink: 0,
        fontSize: 11,
        gap: 8,
        minHeight: 30,
        padding: '4px 12px',
      }}
    >
      <span>Recorded tab benchmark (not a live test):</span>
      <TabQualificationBadge compact={false} tabId={tabId} />
      <span>{caseCount} required evidence case{caseCount === 1 ? '' : 's'}</span>
      {tabId !== 'benchmarks' && (
        <button
          data-testid="open-tab-qualification-evidence"
          onClick={() => setActiveTab('benchmarks')}
          style={{ background: 'transparent', border: 0, color: '#60a5fa', cursor: 'pointer', marginLeft: 'auto' }}
          type="button"
        >
          View evidence
        </button>
      )}
    </div>
  );
}
