import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Database, Download, TerminalSquare, Layers } from 'lucide-react';
import { detectDominantPlaneFromSegments, getSegmentEndpoints, projectPointToPlane } from '../core/geometry/planeDetection';
import { selectCanonicalSegments } from '../core/geometry/adapters/selectCanonicalSegments';

export const DataTableTab = () => {
  const components = useAppStore(state => state.components);
  const geometry = useAppStore(state => state.canonicalGeometry);
  const selectedIds = useAppStore(state => state.selectedIds);
  const updateComponentAttribute = useAppStore(state => state.updateComponentAttribute);
  const updateComponentPoint = useAppStore(state => state.updateComponentPoint);

  // Stages logic
  const stages = useAppStore(state => state.processingStages);
  const [activeView, setActiveView] = useState('raw'); // 'raw', 'stage1', 'stage2'

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Type,Point1,Point2,Material\n";

    components.forEach(c => {
      const p1 = c.points?.[0] ? `${c.points[0].x};${c.points[0].y};${c.points[0].z}` : '';
      const p2 = c.points?.[1] ? `${c.points[1].x};${c.points[1].y};${c.points[1].z}` : '';
      const mat = c.attributes?.MATERIAL || c.attributes?.['ITEM-CODE'] || '';
      csvContent += `${c.id},${c.type},${p1},${p2},${mat}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pcf_data.csv");
    document.body.appendChild(link);
    link.click();
  };

  const renderStage1 = () => {
     const data = stages.stage1 || [];
     return (
         <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
             <h3 className="text-white mb-4 text-sm font-bold border-b border-slate-700 pb-2">Stage 1: Selected 3D Geometry ({data.length})</h3>
             {data.length === 0 ? <p className="text-slate-500 text-sm">No geometry selected in 3D Viewer.</p> : (
                 <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left text-slate-300">
                        <thead className="bg-slate-900 text-slate-400">
                            <tr>
                                <th className="p-2">ID</th>
                                <th className="p-2">Type</th>
                                <th className="p-2">3D Points</th>
                                <th className="p-2">Material / Item</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(c => (
                                <tr key={c.id} className="border-b border-slate-700">
                                    <td className="p-2 text-blue-400 font-mono">{c.id}</td>
                                    <td className="p-2">{c.type}</td>
                                    <td className="p-2 font-mono">{JSON.stringify(c.points)}</td>
                                    <td className="p-2">{c.attributes?.MATERIAL || c.attributes?.['ITEM-CODE']}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}
         </div>
     )
  };

  const renderStage2 = () => {
     const model = selectedIds.size ? selectCanonicalSegments(geometry, selectedIds) : geometry;
     if (!model?.segments?.length) {
         return <div className="p-4 text-slate-500 text-sm">Load pipe geometry in 3D Viewer or select a pipe component to preview a projection.</div>;
     }
     // Project each segment independently so disconnected runs and branches keep their positions.
     const { plane } = detectDominantPlaneFromSegments(model.segments, { nodes: model.nodes });
     const nodesById = new Map(model.nodes.map(node => [node.id, node]));
     const segments2D = model.segments.map(segment => {
         const { start, end } = getSegmentEndpoints(segment, nodesById);
         return { id: segment.id, start2D: projectPointToPlane(start, plane).slice(0, 2), end2D: projectPointToPlane(end, plane).slice(0, 2), trueLength: Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z) };
     });

     return (
         <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
             <h3 className="text-white mb-4 text-sm font-bold border-b border-slate-700 pb-2 flex justify-between">
                 <span>Stage 2: Orthographic Preview ({model.unit})</span>
                 <span className="text-blue-400 font-mono">Target Plane: {plane}</span>
             </h3>
             {!model.valid && <p role="status" className="mb-3 text-sm text-amber-300">Geometry validation found errors. Review the imported components before analysis.</p>}
             <div className="overflow-x-auto text-xs">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-900 text-slate-400">
                        <tr>
                            <th className="p-2">ID</th>
                            <th className="p-2">Start 2D</th>
                            <th className="p-2">End 2D</th>
                            <th className="p-2">True Length</th>
                        </tr>
                    </thead>
                    <tbody>
                        {segments2D.map((s) => (
                            <tr key={s.id} className="border-b border-slate-700">
                                <td className="p-2 text-blue-400 font-mono">{s.id}</td>
                                <td className="p-2 font-mono">[{s.start2D?.map(v => v.toFixed(2)).join(', ')}]</td>
                                <td className="p-2 font-mono">[{s.end2D?.map(v => v.toFixed(2)).join(', ')}]</td>
                                <td className="p-2 font-mono text-green-400">{s.trueLength?.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>

         </div>
     )
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 p-6 overflow-hidden text-slate-200">

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="text-blue-500" />
            2D Transform Datatable Debug
        </h2>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* TABS FOR STAGES */}
      <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
         <button onClick={() => setActiveView('raw')} className={`px-4 py-2 text-sm font-medium rounded transition-colors ${activeView === 'raw' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Raw PCF</button>
         <button onClick={() => setActiveView('stage1')} className={`px-4 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2 ${activeView === 'stage1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Layers size={14}/> Stage 1 (Selected 3D)</button>
         <button onClick={() => setActiveView('stage2')} className={`px-4 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2 ${activeView === 'stage2' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><TerminalSquare size={14}/> Stage 2 (2D Proj)</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeView === 'raw' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
            {components.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                No data loaded. Parse a PCF file in the 3D Viewer tab first.
                </div>
            ) : (
                <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                    <th className="p-3 text-slate-400 font-semibold w-24">ID</th>
                    <th className="p-3 text-slate-400 font-semibold w-32">Type</th>
                    <th className="p-3 text-slate-400 font-semibold">Points (XYZ, mm)</th>
                    <th className="p-3 text-slate-400 font-semibold">Attributes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {components.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-slate-700/50 transition-colors">
                        <td className="p-3 font-mono text-xs text-blue-400">{c.id}</td>
                        <td className="p-3">
                        <span className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 font-medium">
                            {c.type}
                        </span>
                        </td>
                        <td className="p-3">
                        <div className="flex flex-col gap-1 text-xs font-mono text-slate-400">
                            {c.points?.map((pt, ptIdx) => (
                            <div key={ptIdx} className="flex gap-2 items-center">
                                <span className="text-slate-500 w-4">P{ptIdx + 1}</span>
                                <input type="number" value={pt.x} onChange={(e) => updateComponentPoint(i, ptIdx, 'x', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 text-slate-300" />
                                <input type="number" value={pt.y} onChange={(e) => updateComponentPoint(i, ptIdx, 'y', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 text-slate-300" />
                                <input type="number" value={pt.z} onChange={(e) => updateComponentPoint(i, ptIdx, 'z', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 text-slate-300" />
                            </div>
                            ))}
                        </div>
                        </td>
                        <td className="p-3">
                        <div className="flex flex-col gap-1 text-xs">
                            {Object.entries(c.attributes || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                                <span className="text-slate-500 w-24 truncate" title={k}>{k}:</span>
                                <input
                                type="text"
                                value={v}
                                onChange={(e) => updateComponentAttribute(i, k, e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-slate-300 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            ))}
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
            </div>
        )}
        {activeView === 'stage1' && renderStage1()}
        {activeView === 'stage2' && renderStage2()}
      </div>
    </div>
  );
};
