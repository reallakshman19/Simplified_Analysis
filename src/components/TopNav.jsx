import React from 'react';
import { useAppStore } from '../store/appStore';
import { Layers, Activity, Settings, Table, PenTool, Home, FileText, CheckSquare, Wrench } from 'lucide-react';
import { VERSION_STRING } from '../config/version';
import { uiTabs } from '../config/uiTabs';
import { TabQualificationBadge } from '../benchmarking/TabQualificationBadge';

const TAB_ICONS = Object.freeze({
  activity: Activity,
  'check-square': CheckSquare,
  'file-text': FileText,
  home: Home,
  layers: Layers,
  'pen-tool': PenTool,
  settings: Settings,
  table: Table,
  wrench: Wrench,
});

export const TopNav = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const TabItem = ({ label, title, id, iconId }) => {
    const isActive = activeTab === id;
    const Icon = TAB_ICONS[iconId];
    return (
      <div
        data-testid={`nav-tab-${id}`}
        title={title}
        onClick={() => setActiveTab(id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          minHeight: '48px',
          padding: '9px 14px',
          cursor: 'pointer',
          background: isActive ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' : 'transparent',
          color: isActive ? '#3b82f6' : '#94a3b8',
          borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s ease-in-out',
          fontWeight: isActive ? '600' : '500',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
      >
        <Icon size={16} />
        {label}
        <TabQualificationBadge compact tabId={id} />
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#0f172a', /* Slate 900 */
      borderBottom: '1px solid #1e293b', /* Slate 800 */
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      minWidth: 0
    }}>
      <div style={{ padding: '0 16px', fontWeight: 'bold', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>3D</div>
        Calc Suite
      </div>
      <div style={{ width: '1px', height: '24px', background: '#334155', margin: '0 10px', flexShrink: 0 }} />
      <div style={{ display: 'flex', flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        {uiTabs.map((item) => <TabItem key={item.id} {...item} />)}
      </div>
      <div style={{ padding: '0 16px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {VERSION_STRING}
      </div>
    </div>
  );
};
