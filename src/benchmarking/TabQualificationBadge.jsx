/**
 * Compact qualification badge shared by navigation and QA surfaces.
 *
 * Functionality: renders the generated status for a registered tab.
 * Inputs: tab identifier and compact-display flag.
 * Output: accessible status badge.
 * Fallback: missing evidence displays Not Run.
 */

import React from 'react';
import { getTabQualificationStatus } from './tabBenchmarkSnapshot';

const STATUS_STYLES = Object.freeze({
  QUALIFIED: { background: '#14532d', borderColor: '#22c55e', color: '#dcfce7', label: 'Qualified' },
  FAILED: { background: '#7f1d1d', borderColor: '#ef4444', color: '#fee2e2', label: 'Failed' },
  NOT_RUN: { background: '#422006', borderColor: '#f59e0b', color: '#fef3c7', label: 'Not Run' },
});

export function TabQualificationBadge({ tabId, compact }) {
  const status = getTabQualificationStatus(tabId);
  const presentation = STATUS_STYLES[status] || STATUS_STYLES.NOT_RUN;
  return (
    <span
      data-testid={`tab-qualification-${tabId}`}
      data-status={status}
      title={`Benchmark qualification: ${presentation.label}`}
      style={{
        background: presentation.background,
        border: `1px solid ${presentation.borderColor}`,
        borderRadius: 999,
        color: presentation.color,
        fontSize: compact ? 8 : 11,
        fontWeight: 800,
        letterSpacing: compact ? 0 : '0.03em',
        lineHeight: 1,
        padding: compact ? '2px 4px' : '5px 8px',
        textTransform: 'uppercase',
      }}
    >
      {compact ? presentation.label.slice(0, 1) : presentation.label}
    </span>
  );
}
