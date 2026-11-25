import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { run2DSolver } from '../../solvers/2d';
import { calcCantileverEndLoad, calcGuidedCantileverThermal, calcSimpleSpanPointLoad, calcSimpleSpanDistributedLoad } from '../../solvers/2d/math2d';
import { useExtendedStore } from '../store/useExtendedStore';
import { runExtendedSolver } from '../solver/ExtendedSolver'; // Reuse the pure function by mocking an equivalent 3D payload
import { getUnitLabel, formatUnit, MetricToImperial, ImperialToMetric, projectDisplayUnit } from '../utils/units';
import { prepareImported2D, importedAnchorsReady } from '../solver/imported2DWorkflow.js';
import { publishActiveReportContext } from '../../reporting/publishActiveReportContext.js';

function isDirect2DBenchmarkPayload(payload, currentBenchmarkMock) {
  return Boolean(payload && currentBenchmarkMock?.module === '2d-math');
}

function runDirect2DBenchmark(payload) {
  const methodId = payload.methodId || payload.calculationType;
  const input = payload.input || payload.inputs || {};
  const solvers = {
    CANTILEVER_END_LOAD: calcCantileverEndLoad,
    GC_BASIC_12EI: calcGuidedCantileverThermal,
    SIMPLE_SPAN_CONCENTRATED: calcSimpleSpanPointLoad,
    SIMPLE_SPAN_DISTRIBUTED: calcSimpleSpanDistributedLoad,
  };
  return solvers[methodId] ? solvers[methodId](input) : run2DSolver({ ...payload, calculationType: methodId, inputs: input });
}

const RatioBar = ({ ratio }) => {
  const pct = Math.min(ratio * 100, 120); // cap display at 120%
  const color = ratio > 1.0 ? '#ef4444' : ratio > 0.95 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ position: 'relative', height: '6px', background: '#1e293b',
                  borderRadius: '3px', width: '80px', display: 'inline-block' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.min(pct, 100)}%`, background: color,
                    borderRadius: '3px', transition: 'width 0.3s' }} />
      {ratio > 1.0 && (
        <div style={{ position: 'absolute', left: '100%', top: 0, height: '100%',
                      width: `${pct - 100}%`, background: '#7f1d1d', borderRadius: '0 3px 3px 0' }} />
      )}
    </div>
  );
};

const FormulaTracePanel = ({ formulaTrace = [] }) => {
  const [open, setOpen] = useState(false);
  if (!formulaTrace.length) return null;
  return (
    <div style={{ marginTop: '1rem', border: '1px solid #1e3a5f', borderRadius: '6px' }}>
      <button onClick={() => setOpen(!open)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f1a2e',
                       color: '#94a3b8', textAlign: 'left', fontSize: '0.8rem', cursor: 'pointer', border: 'none' }}>
        {open ? '▾' : '▸'} Calculation Trace ({formulaTrace.length} steps)
      </button>
      {open && (
        <div style={{ padding: '8px 12px', maxHeight: '400px', overflowY: 'auto' }}>
          {formulaTrace.map((step, i) => (
            <div key={i} style={{ marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <div style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {step.name}
              </div>
              <div style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '2px' }}>
                {step.expression}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '4px' }}>
                {Object.entries(step.values || {}).map(([k, v]) => (
                  <span key={k} style={{ marginRight: '1rem' }}>
                    {k} = {typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'number' ? v.toFixed(4) : String(v))}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#020617', color: '#e2e8f0', overflow: 'hidden' },
  overlay: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: 12, fontSize: 14 },
  row: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', alignItems: 'center' },
  input: { width: '80px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px', borderRadius: '4px' },
  statusBadge: (pass) => ({ background: pass ? '#064e3b' : '#7f1d1d', color: pass ? '#34d399' : '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' })
};

// Interactive foreignObject input component overlaying the SVG
const EditableText = ({ x, y, valueKey, label, inputs, onUpdate, align="middle", width=40 }) => {
  // shift foreignObject up/left to center the HTML input exactly where the SVG text would be
  const xOffset = align === 'middle' ? width/2 : (align === 'end' ? width : 0);
  return (
    <foreignObject x={x - xOffset} y={y - 6} width={width} height="16" style={{ overflow: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'middle' ? 'center' : (align==='end' ? 'flex-end' : 'flex-start') }}>
        <span style={{ fontSize: '8px', color: '#94a3b8', marginRight: '2px' }}>{label}</span>
        <style>{`
          .hide-spinners::-webkit-inner-spin-button, .hide-spinners::-webkit-outer-spin-button {
            -webkit-appearance: none; margin: 0;
          }
          .hide-spinners { -moz-appearance: textfield; }
        `}</style>
        <input
          type="number"
          className="hide-spinners"
          value={inputs[valueKey]}
          onChange={(e) => onUpdate(valueKey, e.target.value)}
          style={{
            width: '28px', background: 'rgba(15,23,42,0.8)', border: '1px solid #3b82f6',
            color: '#fff', fontSize: '8px', padding: '1px', borderRadius: '2px', textAlign: 'center',
            outline: 'none'
          }}
        />
      </div>
    </foreignObject>
  );
};

// 2D SVG Schematic Renderer
const Schematic2D = ({ shape, inputs, onUpdate }) => {
  const c = '#38bdf8'; // pipe color

  if (shape === 'L-Shape') {
    // Dynamic scaling logic
    const totalW = Math.max(inputs.Vx, 1);
    const totalH = Math.max(inputs.Vy, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const w = totalW * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 20,80 L 20,${80 - h} L ${20 + w},${80 - h}`} />
        <circle cx="20" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={20 + w} cy={80 - h} r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={20 + w/2} y={80 - h - 5} valueKey="Vx" label="Vx" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={15} y={80 - h/2} valueKey="Vy" label="Vy" align="end" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  if (shape === 'Z-Shape') {
    const totalW = Math.max(inputs.Vx1 + inputs.Vx2, 1);
    const totalH = Math.max(inputs.Vy, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const w1 = inputs.Vx1 * scale;
    const w2 = inputs.Vx2 * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 10,80 L ${10 + w1},80 L ${10 + w1},${80 - h} L ${10 + w1 + w2},${80 - h}`} />
        <circle cx="10" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={10 + w1 + w2} cy={80 - h} r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={10 + w1/2} y={85} valueKey="Vx1" label="Vx1" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={5 + w1} y={80 - h/2} valueKey="Vy" label="Vy" align="end" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={10 + w1 + w2/2} y={80 - h - 5} valueKey="Vx2" label="Vx2" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  if (shape === 'U-Loop') {
    const totalW = Math.max(inputs.L + inputs.W, 1);
    const totalH = Math.max(inputs.H, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const l1 = (inputs.L / 2) * scale;
    const w = inputs.W * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 10,80 L ${10 + l1},80 L ${10 + l1},${80 - h} L ${10 + l1 + w},${80 - h} L ${10 + l1 + w},80 L ${10 + l1 * 2 + w},80`} />
        <circle cx="10" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={10 + l1 * 2 + w} cy="80" r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={10 + l1 + w/2} y={85} valueKey="L" label="L" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={10 + l1 + w/2} y={80 - h - 5} valueKey="W" label="W" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={5 + l1} y={80 - h/2} valueKey="H" label="H" align="end" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  return null;
};

export default function Bundle2DSolverView() {
  const analysisPayload = useAppStore((state) => state.analysisPayload);
  const currentBenchmarkMock = useAppStore((state) => state.currentBenchmarkMock);
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults);
  const setActiveReportContext = useAppStore((state) => state.setActiveReportContext);
  const markResultsStale = useAppStore((state) => state.markResultsStale);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  const lastDirect2DSignatureRef = useRef(null);

  const publishLoaded2DReportContext = useCallback((source = 'benchmark-auto-direct-2d', options = {}) => {
    if (!isDirect2DBenchmarkPayload(analysisPayload, currentBenchmarkMock)) {
      return false;
    }

    const signature = JSON.stringify({
      benchmarkId: currentBenchmarkMock?.id || analysisPayload?.caseId || null,
      methodId: analysisPayload?.methodId || analysisPayload?.calculationType || currentBenchmarkMock?.methodId || null,
      input: analysisPayload?.input || analysisPayload?.inputs || null,
      geometry: analysisPayload?.geometry || null,
    });

    if (!options.force && lastDirect2DSignatureRef.current === signature) {
      return true;
    }

    const solverResult = runDirect2DBenchmark({
      ...analysisPayload,
      methodId: analysisPayload?.methodId || currentBenchmarkMock?.methodId || analysisPayload?.calculationType,
    });

    const methodId =
      solverResult.methodId ||
      analysisPayload?.methodId ||
      currentBenchmarkMock?.methodId ||
      'CANTILEVER_END_LOAD';

    lastDirect2DSignatureRef.current = signature;
    setBenchmarkResult(solverResult);

    setActiveReportContext({
      source,
      benchmarkId: currentBenchmarkMock?.id || analysisPayload?.caseId || null,
      title: currentBenchmarkMock?.title || analysisPayload?.title || '2D Simplified Benchmark',
      moduleId: solverResult.moduleId || '2d-simplified-stress-check',
      methodId,
      input: analysisPayload,
      result: {
        ...solverResult,
        methodId,
        formulaIds: solverResult.formulaIds || [],
      },
      benchmarkStatus: currentBenchmarkMock ? 'MOCK_LOADED' : 'MANUAL_PAYLOAD',
      settings: {
        ...(engineeringDefaults || {}),
        projectUnitSystem: 'imperial',
        benchmarkCertificationRequired: true,
      },
      settingsHash: null,
      diagnostics: solverResult.diagnostics || [],
      warnings: solverResult.warnings || [],
    });

    return true;
  }, [
    analysisPayload,
    currentBenchmarkMock,
    engineeringDefaults,
    setActiveReportContext,
  ]);

  useEffect(() => {
    publishLoaded2DReportContext('benchmark-auto-direct-2d');
  }, [publishLoaded2DReportContext]);

  const { methodology, inputs: globalInputs } = useExtendedStore();
  const unitSystem = projectDisplayUnit(engineeringDefaults.projectUnitSystem);
  const imported = analysisPayload?.schemaVersion === 'simplified-2d-v1' && !currentBenchmarkMock;
  const importedRoute = useMemo(() => imported ? prepareImported2D(analysisPayload.sourceGeometry || analysisPayload.canonicalGeometry, analysisPayload.plane) : null, [imported, analysisPayload]);
  const [anchors, setAnchors] = useState({});
  const [specConfirmed, setSpecConfirmed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setAnchors(importedRoute?.anchors || {}); setSpecConfirmed(false); setError(''); setResults(null); }, [importedRoute]);
  const [shape, setShape] = useState('L-Shape');
  // Store geometry in feet regardless of display units.
  const [geom, setGeom] = useState({ Vx: 25, Vy: 16.5, Vx1: 15, Vx2: 10, L: 100, W: 10, H: 10 });
  const [results, setResults] = useState(null);

  const displayGeom = Object.fromEntries(Object.entries(geom).map(([k,v]) => [k, unitSystem === 'Metric' ? ImperialToMetric.ft_to_m(v) : v]));
  useEffect(() => { setResults(null); setSpecConfirmed(false); }, [globalInputs, methodology, engineeringDefaults]);
  const updateGeom = (k, v) => { setGeom(s => ({...s, [k]: unitSystem === 'Metric' ? MetricToImperial.m_to_ft(Number(v)) : Number(v)})); setResults(null); markResultsStale(); };
  const isBenchmark = isDirect2DBenchmarkPayload(analysisPayload, currentBenchmarkMock);

  const handleRun = () => {
    if (publishLoaded2DReportContext('manual-evaluate-direct-2d', { force: true })) {
      return;
    }

    setError('');
    if (!imported && Object.values(geom).some(value => !Number.isFinite(value) || value <= 0)) { setError('Enter positive profile dimensions.'); return; }
    if (imported && (!importedAnchorsReady(importedRoute, anchors) || !specConfirmed)) {
      setError(importedRoute?.reason || 'Select both endpoint anchors and confirm the uniform piping specification.');
      return;
    }
    const engineGeom = { ...geom };

    // Translate the 2D geometric inputs into the standard nodes/segments payload for ExtendedSolver
    let nodes = [];
    let segments = [];
    let selectedAnchors = { anchor1: 'n1' };

    if (imported) {
      nodes = importedRoute.nodes;
      segments = importedRoute.segments;
      selectedAnchors = anchors;
    } else if (shape === 'L-Shape') {
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: engineGeom.Vx, y: 0, z: 0 },
        { id: 'n3', x: engineGeom.Vx, y: engineGeom.Vy, z: 0 }
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' }
      ];
      selectedAnchors.anchor2 = 'n3';
    } else if (shape === 'Z-Shape') {
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: engineGeom.Vx1, y: 0, z: 0 },
        { id: 'n3', x: engineGeom.Vx1, y: engineGeom.Vy, z: 0 },
        { id: 'n4', x: engineGeom.Vx1 + engineGeom.Vx2, y: engineGeom.Vy, z: 0 }
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' },
        { id: 's3', startNodeId: 'n3', endNodeId: 'n4' }
      ];
      selectedAnchors.anchor2 = 'n4';
    } else if (shape === 'U-Loop') {
      const halfL = engineGeom.L / 2;
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: halfL, y: 0, z: 0 },
        { id: 'n3', x: halfL, y: engineGeom.H, z: 0 },
        { id: 'n4', x: halfL + engineGeom.W, y: engineGeom.H, z: 0 },
        { id: 'n5', x: halfL + engineGeom.W, y: 0, z: 0 },
        { id: 'n6', x: engineGeom.L + engineGeom.W, y: 0, z: 0 } // To ensure net distance is L (assuming W absorbs)
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' },
        { id: 's3', startNodeId: 'n3', endNodeId: 'n4' },
        { id: 's4', startNodeId: 'n4', endNodeId: 'n5' },
        { id: 's5', startNodeId: 'n5', endNodeId: 'n6' }
      ];
      selectedAnchors.anchor2 = 'n6';
    }

    const engineInputs = { ...globalInputs, frictionFactor: engineeringDefaults.rackFrictionFactor };
    if (imported && Number.isFinite(analysisPayload.designTemperature_F)) engineInputs.tOperate = analysisPayload.designTemperature_F;

    // Mock an empty vessel so it skips MIST. Pass down methodology to trigger friction logic.
    const payload = {
      nodes, segments, anchors: selectedAnchors, inputs: engineInputs, boundaryMovement: {x:0, y:0, z:0},
      constraints: { maxStress: 20000 }, vessel: { vesselOD: 0, vesselThk: 0, nozzleRad: 0, designPress: 0, flangeClass: 150, momentArm: 0 },
      methodology, shortDropLimit_ft: engineeringDefaults.shortDropLimit_ft
    };

    // Evaluate using the core mathematical engine
    let res;
    try { res = runExtendedSolver(payload); } catch (err) { setError(err.message); return; }

    // Tag the result with the active methodology so the UI can reflect the user's choice
    res.meta.methodologyUsed = methodology === '2D_BUNDLE' ? 'SIMPLIFIED_2D_METHOD' : 'FLUOR_GUIDED_CANTILEVER';

    const missingFlexibility = Object.entries(res.axes).filter(([, row]) => row.netDiff > 1e-9 && row.bendingLeg <= 1e-9);
    missingFlexibility.forEach(([axis,row]) => {
      row.status = 'NOT_QUALIFIED';
      res.warnings.push(axis + '-axis has no effective flexibility leg; zero calculated stress is not a pass.');
    });
    const result = { ...res, methodId: 'GC_ANCHOR_GUIDE_3EI', formulaIds: ['GUIDED_CANTILEVER_F_3EID_OVER_L3', 'CANTILEVER_STRESS_M_OVER_Z'], status: missingFlexibility.length ? 'NOT_QUALIFIED' : Object.values(res.axes).some(row => row.status === 'FAIL') ? 'FAILED' : 'SCREENING_ONLY' };
    setResults(result);
    publishActiveReportContext({ moduleId: '2d-simplified-stress-check', title: '2D Simplified Calculation', input: payload, result, settings: engineeringDefaults });
  };

  return (
    <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
           {/* Left dock */}
           <div style={{ width: '360px', borderRight: '1px solid #1e293b', background: '#0f172a', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>2D Loop Parameters</div>
              {isBenchmark ? <div data-testid="2d-benchmark-loaded">Benchmark: {currentBenchmarkMock.id}<br /><button onClick={() => useAppStore.getState().clearBenchmarkMock()}>Return to project</button></div> : imported ? <div data-testid="imported-2d-model">
                <strong>Imported {importedRoute?.plane || analysisPayload.plane} route</strong>
                <p>{importedRoute?.nodes.length || 0} nodes · {importedRoute?.segments.length || 0} segments</p>
                {!importedRoute?.ok && <p role="alert">{importedRoute?.reason}</p>}
                {importedRoute?.ok && [1, 2].map(n => <label key={n} style={styles.row}>Anchor {n}<select data-testid={`imported-2d-anchor-${n}`} style={styles.input} value={anchors[`anchor${n}`] || ''} onChange={e => { setAnchors(a => ({ ...a, [`anchor${n}`]: e.target.value })); setResults(null); markResultsStale(); }}><option value="">Select endpoint</option>{importedRoute.anchorOptions.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>)}
                <button type="button" onClick={() => useAppStore.getState().setAnalysisPayload(null)}>Use manual profile instead</button>
              </div> : <>
              <div style={styles.row}>
                <span>Profile Shape:</span>
                <select style={{...styles.input, width: '120px'}} value={shape} onChange={e => {setShape(e.target.value); setResults(null); markResultsStale();}}>
                  <option>L-Shape</option>
                  <option>Z-Shape</option>
                  <option>U-Loop</option>
                </select>
              </div>

              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '8px', fontWeight: 'bold' }}>Geometry ({getUnitLabel(unitSystem, 'length')})</div>
                {shape === 'L-Shape' && (
                  <>
                    <div style={styles.row}><span>Leg X (Vx):</span> <input type="number" style={styles.input} value={displayGeom.Vx} onChange={e => updateGeom('Vx', e.target.value)} /></div>
                    <div style={styles.row}><span>Leg Y (Vy):</span> <input type="number" style={styles.input} value={displayGeom.Vy} onChange={e => updateGeom('Vy', e.target.value)} /></div>
                  </>
                )}
                {shape === 'Z-Shape' && (
                  <>
                    <div style={styles.row}><span>Leg X1 (Vx1):</span> <input type="number" style={styles.input} value={displayGeom.Vx1} onChange={e => updateGeom('Vx1', e.target.value)} /></div>
                    <div style={styles.row}><span>Leg X2 (Vx2):</span> <input type="number" style={styles.input} value={displayGeom.Vx2} onChange={e => updateGeom('Vx2', e.target.value)} /></div>
                    <div style={styles.row}><span>Offset Leg (Vy):</span> <input type="number" style={styles.input} value={displayGeom.Vy} onChange={e => updateGeom('Vy', e.target.value)} /></div>
                  </>
                )}
                {shape === 'U-Loop' && (
                  <>
                    <div style={styles.row}><span>Anchor Dist (L):</span> <input type="number" style={styles.input} value={displayGeom.L} onChange={e => updateGeom('L', e.target.value)} /></div>
                    <div style={styles.row}><span>Loop Height (H):</span> <input type="number" style={styles.input} value={displayGeom.H} onChange={e => updateGeom('H', e.target.value)} /></div>
                    <div style={styles.row}><span>Loop Width (W):</span> <input type="number" style={styles.input} value={displayGeom.W} onChange={e => updateGeom('W', e.target.value)} /></div>
                  </>
                )}
              </div>

              </>}
              {!isBenchmark && <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                 <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>Piping Spec (Global)</div>
                 <div style={styles.row}>
                   <span>Material:</span>
                   <select style={styles.input} value={globalInputs.material} onChange={e => useExtendedStore.getState().updateInput('material', e.target.value)}>
                     <option>Carbon Steel</option>
                     <option>Austenitic Stainless Steel 18 Cr 8 Ni</option>
                   </select>
                 </div>
                 <div style={styles.row}>
                   <span>Size (in - Nominal):</span>
                   <input type="number" style={styles.input} value={globalInputs.pipeSize} onChange={e => useExtendedStore.getState().updateInput('pipeSize', Number(e.target.value))} />
                 </div>
                 <div style={styles.row}>
                   <span>Schedule:</span>
                   <select style={styles.input} value={globalInputs.schedule} onChange={e => useExtendedStore.getState().updateInput('schedule', e.target.value)}>
                     <option>40</option>
                     <option>80</option>
                   </select>
                 </div>
                 <div style={styles.row}>
                   <span>Temp ({getUnitLabel(unitSystem, 'temp')}):</span>
                   <input type="number" style={styles.input} value={unitSystem === 'Metric' ? ImperialToMetric.F_to_C(imported && Number.isFinite(analysisPayload.designTemperature_F) ? analysisPayload.designTemperature_F : globalInputs.tOperate) : imported && Number.isFinite(analysisPayload.designTemperature_F) ? analysisPayload.designTemperature_F : globalInputs.tOperate} disabled={imported && Number.isFinite(analysisPayload.designTemperature_F)} onChange={e => useExtendedStore.getState().updateInput('tOperate', unitSystem === 'Metric' ? MetricToImperial.C_to_F(Number(e.target.value)) : Number(e.target.value))} />
                 </div>
                {imported && <label><input data-testid="imported-2d-confirm-spec" type="checkbox" checked={specConfirmed} onChange={e => setSpecConfirmed(e.target.checked)} /> Confirm this uniform pipe specification applies to the imported route.</label>}
              </div>}
              {error && <p role="alert">{error}</p>}

              <button data-testid="run-2d-calculation" disabled={imported && (!importedAnchorsReady(importedRoute, anchors) || !specConfirmed)} onClick={handleRun} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto' }}>
                EVALUATE 2D PROFILE ►
              </button>
           </div>

           {/* Right viewport */}
           <div style={{ flex: 1, background: '#020617', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1e293b' }}>
                 {isBenchmark ? <div data-testid="2d-benchmark-result">{benchmarkResult ? <><h3>{benchmarkResult.methodId} — {benchmarkResult.status}</h3><dl>{Object.entries(benchmarkResult.outputs || benchmarkResult.results || {}).map(([key,value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{typeof value === 'number' ? value.toPrecision(8) : String(value)}</dd></React.Fragment>)}</dl></> : 'Awaiting benchmark evaluation'}</div> : imported ? <div><h3>Imported route coordinates (ft)</h3><table><thead><tr><th>Node</th><th>X</th><th>Y</th><th>Z</th></tr></thead><tbody>{importedRoute.nodes.map(node => <tr key={node.id}><td>{node.id}</td><td>{node.x.toFixed(3)}</td><td>{node.y.toFixed(3)}</td><td>{node.z.toFixed(3)}</td></tr>)}</tbody></table></div> : <Schematic2D shape={shape} inputs={displayGeom} onUpdate={updateGeom} />}
              </div>

              {results && !isBenchmark && (
                <div data-testid="2d-calculation-results" style={{ padding: '24px', minHeight: '300px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Evaluation Results — {results.status}
                    <span style={{ marginLeft: '12px', color: '#10b981', fontSize: '12px' }}>— Method: {results.meta.methodologyUsed}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Axis</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Expansion ({getUnitLabel(unitSystem, 'shortLength')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Bending Leg ({getUnitLabel(unitSystem, 'length')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Force ({getUnitLabel(unitSystem, 'force')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Stress ({getUnitLabel(unitSystem, 'pressure')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['X', 'Y', 'Z'].map(axis => {
                        const row = results.axes[axis];
                        if (!row || row.netDiff === 0) return null;
                        return (
                          <tr key={axis}>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px', color: '#38bdf8' }}>{axis}-Ax</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'shortLength', row.delta, 3)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'length', row.bendingLeg, 1)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'force', row.force, 0)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'pressure', row.stress, 0)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <RatioBar ratio={row.maxStress > 0 ? row.stress / row.maxStress : 0} />
                                <span style={styles.statusBadge(row.status === 'PASS')}>{row.status}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {results.warnings?.map((warning, i) => <p key={i} style={{color:'#fbbf24'}}>{String(warning)}</p>)}
                  <FormulaTracePanel formulaTrace={results.formulaTrace} />
                </div>
              )}
           </div>
        </div>
    </div>
  );
}
