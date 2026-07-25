import React from 'react';
import { useAppStore } from './store/appStore';
import { TopNav } from './components/TopNav';
import { DataTableTab } from './components/DataTableTab';
import { CalcExtendedTab } from './calc-extended/components/CalcExtendedTab';
import { Viewer3DTab } from './components/Viewer3DTab';
import SketcherTab from './sketcher/SketcherTab';
import { AnalysisTab } from './3d-analysis';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabQualificationBanner } from './benchmarking/TabQualificationBanner';
import { resolveSimplifiedTabId } from './config/uiTabs';
import './App.css';

import { ReportsTab } from './reporting/ReportsTab';
import { SettingsTab } from './settings/SettingsTab';
import { ConfigTab } from './config/ConfigTab';
import { BenchmarksValidationTab } from './components/BenchmarksValidationTab';

function App() {
  const storedActiveTab = useAppStore(state => state.activeTab);
  const activeTab = resolveSimplifiedTabId(storedActiveTab);

  // Expose store for e2e testing
  if (typeof window !== 'undefined') {
    window.useAppStore = useAppStore;
  }

  const tabPanels = {
    home: <ErrorBoundary><Viewer3DTab /></ErrorBoundary>,
    pcf: <DataTableTab />,
    sketcher: <ErrorBoundary><SketcherTab /></ErrorBoundary>,
    '3d-analysis': <ErrorBoundary><AnalysisTab /></ErrorBoundary>,
    simpAnalysis: <ErrorBoundary><CalcExtendedTab /></ErrorBoundary>,
    reports: <ReportsTab />,
    benchmarks: <BenchmarksValidationTab />,
    settings: <SettingsTab />,
    diagnostics: <ConfigTab />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#0f172a' }}>
      <TopNav />
      <TabQualificationBanner tabId={activeTab} />
      <main data-testid={`tab-panel-${activeTab}`} style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
        {tabPanels[activeTab]}
      </main>
    </div>
  );
}

export default App;
