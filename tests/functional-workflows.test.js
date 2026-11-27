import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { canonicalGeometryToSketcher, sketcherToCanonicalGeometry } from '../src/core/geometry/adapters/sketcherToCanonicalGeometry.js';
import { selectCanonicalSegments } from '../src/core/geometry/adapters/selectCanonicalSegments.js';
import { pcfToCanonicalGeometry } from '../src/core/geometry/adapters/pcfToCanonicalGeometry.js';
import { exportPcf, importPcf, parsePcfWithDiagnostics } from '../src/pcf/index.js';
import { prepareImported2D, importedAnchorsReady } from '../src/calc-extended/solver/imported2DWorkflow.js';
import { calcMistNozzleQualification, runExtendedSolver } from '../src/calc-extended/solver/ExtendedSolver.js';
import { L_Bend_GM } from '../src/calc-extended/mocks/mock-data.js';
import { solvePipeRack } from '../src/core/solvers/piperack/solvePipeRack.js';
import { solveByTopologyRouter } from '../src/core/solvers/routing/solveByTopologyRouter.js';
import { solveGC3D } from '../src/solvers/3d/solveGC3D.js';
import { engineeringMockCatalog, validateMockLoadActions } from '../src/mocks/engineeringMockCatalog.js';
import { buildBenchmarkLoadState } from '../src/benchmarking/benchmarkLaunch.js';
import { executeBenchmarkFixture } from '../src/benchmarking/executeBenchmarkFixture.js';
import { isSimplifiedTabId } from '../src/config/uiTabs.js';
import { inputForDisplay, inputFromDisplay, projectDisplayUnit } from '../src/calc-extended/utils/units.js';
import { buildReportPayload } from '../src/reporting/buildReportPayload.js';

const route = {
  schemaVersion: 'canonical-geometry-v1', source: 'sketcher', unit: 'mm',
  nodes: [
    { id: 'A', x: 0, y: 0, z: 0, restraint: 'ANCHOR' },
    { id: 'B', x: 3048, y: 0, z: 0, restraint: 'FREE' },
    { id: 'C', x: 3048, y: 6096, z: 0, restraint: 'ANCHOR' },
  ],
  segments: [
    { id: 'S1', startNodeId: 'A', endNodeId: 'B', type: 'PIPE', diameter: 100, thickness: 6, material: 'Carbon Steel', meta: { schedule: '40', fluidDensity_kg_m3: 997, componentWeight_kg: 12, pipe: { od_mm: 114.3 } } },
    { id: 'S2', startNodeId: 'B', endNodeId: 'C', type: 'PIPE' },
  ],
};
function close(a,b) { assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`); }

test('geometry transfer preserves properties and isolates mutable copies', () => {
  const sketch = canonicalGeometryToSketcher(route);
  const props = sketch.segments[0].properties;
  assert.equal(props.wall_mm, 6);
  assert.equal(props.schedule, '40');
  assert.equal(props.fluidDensity_kg_m3, 997);
  assert.equal(props.componentWeight_kg, 12);
  assert.equal(props.pipe.od_mm, 114.3);
  props.pipe.od_mm = 120;
  assert.equal(route.segments[0].meta.pipe.od_mm, 114.3);
  const roundtrip = sketcherToCanonicalGeometry(sketch.nodes, sketch.segments);
  assert.equal(roundtrip.segments[0].thickness, 6);
  assert.equal(roundtrip.segments[0].meta.fluidDensity_kg_m3, 997);
});

test('actual imported route reaches ExtendedSolver with original node IDs, feet and anchors', () => {
  const input = prepareImported2D(route, 'XY');
  assert.equal(input.ok, true);
  assert.deepEqual(input.anchors, { anchor1: 'A', anchor2: 'C' });
  assert.equal(importedAnchorsReady(input, input.anchors), true);
  assert.equal(importedAnchorsReady(input, { anchor1:'A',anchor2:'A' }), false);
  close(input.nodes[1].x, 10);
  close(input.nodes[2].y, 20);
  const result = runExtendedSolver({
    nodes: input.nodes, segments: input.segments, anchors: input.anchors,
    inputs: { material: 'Carbon Steel', pipeSize: 8, schedule: '40', tOperate: 300, corrosionAllowance: 0, millTolerance: 0, frictionFactor: 0.3 },
    vessel: {}, boundaryMovement: { x:0,y:0,z:0 }, constraints: { maxStress:20000 }, methodology:'FLUOR',
  });
  close(result.axes.X.netDiff, 10);
  close(result.axes.X.bendingLeg,20);
  close(result.axes.Y.netDiff,20);
  close(result.axes.Y.bendingLeg,10);
  const context = { title:'2D imported', moduleId:'2d-simplified-stress-check', input: { nodes:input.nodes, segments:input.segments }, result };
  assert.equal(buildReportPayload(context, false).input.nodes[2].id,'C');
});

test('unsupported branch, disconnected geometry, nonplanar and invalid inputs do not silently calculate', () => {
  const nonplanar = structuredClone(route); nonplanar.nodes[2].z = 400;
  assert.equal(prepareImported2D(nonplanar,'XY').ok,false);
  const branch=structuredClone(route); branch.nodes.push({id:'D',x:3048,y:-1000,z:0});branch.segments.push({id:'S3',startNodeId:'B',endNodeId:'D',type:'PIPE'});
  assert.equal(prepareImported2D(branch,'XY').ok,false);
  const disconnected=structuredClone(route); disconnected.nodes.push({id:'D',x:5000,y:0,z:0});assert.equal(prepareImported2D(disconnected,'XY').ok,false);
  const invalid=structuredClone(route);invalid.valid=false;assert.equal(prepareImported2D(invalid,'XY').ok,false);
});

test('all benchmark launch plans resolve valid tabs and pipe rack has an explicit subtab', () => {
  for(const item of engineeringMockCatalog) {
    const s = buildBenchmarkLoadState(item);
    assert.ok(isSimplifiedTabId(s.activeTab));
    assert.equal(s.analysisPayload,item.benchmarkInput);
    if(item.module==='piperack-expansion-loop') {
      assert.equal(s.activeTab,'simpAnalysis');
      assert.equal(s.currentBenchmarkMock.loadTargetSubTab,'piperack');
    }
    if(item.module==='2d-math') assert.equal(s.currentBenchmarkMock.loadTargetSubTab,'2d');
  }
  assert.equal(validateMockLoadActions({expectedTotal:37}).mockLoadFailures,0);
});

test('all 37 current fixtures execute through the production QA dispatcher with original numeric expectations', async () => {
  let count=0;
  for(const entry of readdirSync('benchmarks/fixtures',{recursive:true,withFileTypes:true})) {
    if(!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fixture = JSON.parse(readFileSync(entry.parentPath+'/'+entry.name));
    if(fixture.schemaVersion!=='engineering-benchmark-v2') continue;
    const actual=await executeBenchmarkFixture(fixture);
    assert.equal(actual.passed,true,fixture.caseId);
    count++;
  }
  assert.equal(count,37);
});

test('display roundtrip preserves engine storage values and missing settings default to Imperial', () => {
  assert.equal(projectDisplayUnit(undefined),'Imperial');
  assert.equal(projectDisplayUnit('metric'),'Metric');
  for(const [type,value] of [['length',25],['shortLength',0.125],['temp',300],['pressure',435]]) {
    close(inputFromDisplay('Metric',type,inputForDisplay('Metric',type,value)),value);
  }
});

test('stale reports disclose stale status without substituting other inputs', () => {
  const payload=buildReportPayload({input:{nodes:['A','B','C']},result:{status:'PASSED',formulaIds:['F1']}},true);
  assert.equal(payload.status,'SCREENING_ONLY');
  assert.deepEqual(payload.input.nodes,['A','B','C']);
  assert.ok(payload.warnings.some(item=>item.code==='STALE_RESULTS'));
});

test('viewer selection uses exact sketch segment and keeps its properties, never display-only proxy geometry', () => {
  const selection = selectCanonicalSegments(route, new Set(['S1']));
  assert.deepEqual(selection.segments.map(s => s.id), ['S1']);
  assert.deepEqual(selection.nodes.map(n => n.id), ['A','B']);
  assert.equal(selection.segments[0].meta.fluidDensity_kg_m3, 997);
  assert.equal(selectCanonicalSegments(route,new Set(['display-elbow'])).valid,false);
});

test('PCF canonical conversion retains source raw attributes without inferring property values', () => {
  const component = { id:'P1', type:'PIPE', bore:100, points:[{x:0,y:0,z:0},{x:1000,y:0,z:0}], attributes:{'ITEM-CODE':'P-001', 'CUSTOM-PROP':'raw'} };
  const canonical = pcfToCanonicalGeometry([component]);
  assert.deepEqual(canonical.segments[0].meta.rawPcfAttributes, component.attributes);
  assert.equal(canonicalGeometryToSketcher(canonical).segments[0].properties.rawPcfAttributes['CUSTOM-PROP'],'raw');
});

test('PCF unit encodings yield equivalent normalized geometry and nominal bore [SIMULATED]', () => {
  for (const [coordinates, bore, x, y, nominal] of [
    ['MM', 'MM', 3048, 6096, 100],
    ['INCH', 'INCH', 120, 240, 4],
    ['MM-HUNDREDTHS', 'INCH-SIXTEENTH', 304800, 609600, 64],
  ]) {
    const input = [
      'UNITS-CO-ORDS ' + coordinates, 'UNITS-BORE ' + bore,
      'PIPE', `END-POINT 0 0 0 ${nominal}`, `END-POINT ${x} 0 0 ${nominal}`,
      'PIPE', `END-POINT ${x} 0 0 ${nominal}`, `END-POINT ${x} ${y} 0 ${nominal}`,
    ].join('\n');
    const { geometry, diagnostics } = importPcf(input);
    assert.deepEqual(diagnostics.sourceUnits, { coordinates, bore });
    assert.equal(geometry.unit, 'mm');
    assert.deepEqual(geometry.segments.map((segment) => segment.diameter), [100, 100]);
    const solverInput = prepareImported2D(geometry, 'XY');
    assert.equal(solverInput.ok, true);
    close(solverInput.nodes[2].x, 10);
    close(solverInput.nodes[2].y, 20);
    const written = exportPcf(geometry);
    assert.match(written, /^UNITS-CO-ORDS MM\nUNITS-BORE MM\n/);
    const roundtrip = importPcf(written).geometry;
    close(roundtrip.nodes[2].x, 3048);
    close(roundtrip.nodes[2].y, 6096);
    assert.deepEqual(roundtrip.segments.map((segment) => segment.diameter), [100, 100]);
  }

  const inchGeometry = { ...route, unit: 'in', nodes: route.nodes.map((node) => ({ ...node, x: node.x / 25.4, y: node.y / 25.4 })) };
  close(importPcf(exportPcf(inchGeometry)).geometry.nodes[2].y, 6096);
});

test('PCF normalizes fitting and support locations with the same units as pipe endpoints [SIMULATED]', () => {
  const { components } = parsePcfWithDiagnostics([
    'UNITS-CO-ORDS INCH', 'UNITS-BORE INCH-SIXTEENTH',
    'TEE', 'END-POINT 0 0 0 64', 'END-POINT 4 0 0 64', 'CENTRE-POINT 2 0 0',
    'BRANCH1-POINT 2 3 0 32', 'BRANCH2-POINT 2 -3 0 32', 'BRANCH3-POINT 2 0 3 32',
    'SUPPORT', 'CO-ORDS 4 0 0 64',
  ].join('\n'));
  const [fitting, support] = components;
  close(fitting.centrePoint.x, 50.8);
  close(fitting.branch1Point.y, 76.2);
  close(fitting.branch2Point.y, -76.2);
  close(fitting.branch3Point.z, 76.2);
  assert.equal(fitting.branch1Point.bore, 50);
  close(support.coOrds.x, 101.6);
  assert.equal(support.coOrds.bore, 100);
});

test('PCF unit conflicts and unmapped nominal sizes block import [SIMULATED]', () => {
  const pipe = 'PIPE\nEND-POINT 0 0 0 4\nEND-POINT 120 0 0 4';
  for (const input of ['UNITS-CO-ORDS FT\n' + pipe, 'UNITS-CO-ORDS MM\nUNITS-CO-ORDS INCH\n' + pipe, pipe + '\nUNITS-CO-ORDS INCH']) {
    assert.equal(importPcf(input).geometry.valid, false);
    const parsed = parsePcfWithDiagnostics(input);
    assert.equal(parsed.components.length, 0);
    assert.ok(parsed.diagnostics.some(({ code }) => code === 'PCF_INVALID_UNIT_HEADER'));
  }
  const unknown = parsePcfWithDiagnostics('UNITS-BORE INCH-SIXTEENTH\n' + pipe);
  assert.equal(unknown.components.length, 0);
  assert.ok(unknown.diagnostics.some(({ code }) => code === 'PCF_NOMINAL_BORE_UNMAPPED'));
});

test('the default topology router runs the checked-in GC3D route', async () => {
  const fixture = JSON.parse(readFileSync('benchmarks/fixtures/gc3d/GC3D-FULL-001.json', 'utf8'));
  const result = await solveByTopologyRouter(fixture.input);
  assert.equal(result.routing.selectedSolver, 'GC3D');
  assert.equal(result.status, 'PASSED');
  assert.equal(result.results.criticalNode, fixture.expected.criticalNode);
  assert.equal(Number(result.results.maxRatio.toFixed(12)), fixture.expected.maxRatio);
  assert.deepEqual(result.results, solveGC3D(fixture.input).results);
});

test('GC3D blocks invalid sections and non-finite stresses [SIMULATED]', () => {
  const { input } = JSON.parse(readFileSync('benchmarks/fixtures/gc3d/GC3D-FULL-001.json', 'utf8'));
  for (const patch of [{ wt_in: 0 }, { wt_in: input.segments[0].od_in / 2 }, { od_in: -1 }, { length_in: Infinity }]) {
    const modified = { ...input, segments: [{ ...input.segments[0], ...patch }, ...input.segments.slice(1)] };
    const result = solveGC3D(modified);
    assert.equal(result.status, 'NOT_QUALIFIED');
    assert.equal(result.results.overallResult, 'NOT_QUALIFIED');
    assert.deepEqual(result.results.legResults, []);
    assert.deepEqual(result.results.nodeResults, []);
    assert.ok(result.diagnostics.some(({ code, data }) => code === 'GC3D_INVALID_PIPE_SECTION' && data.segmentId === 'S1'));
  }
  const invalidSif = solveGC3D({ ...input, fittingData: { S1: { i_i: Infinity } } });
  assert.equal(invalidSif.status, 'NOT_QUALIFIED');
  assert.ok(invalidSif.diagnostics.some(({ code }) => code === 'GC3D_NONFINITE_LEG_RESULT'));
});

test('rack rejects invalid spacing without producing loop dimensions [SIMULATED]', () => {
  const { input } = JSON.parse(readFileSync('benchmarks/fixtures/piperack/PR-LOOP-001-L10.json', 'utf8'));
  for (const [overrides, expectedCode] of [
    [{ defaultSpacingFt: -2.5 }, 'RACK_SPACING_INVALID'],
    [{ defaultSpacingFt: 0 }, 'RACK_SPACING_INVALID'],
    [{ defaultSpacingFt: null }, 'RACK_SPACING_INVALID'],
    [{ defaultSpacingFt: Infinity }, 'RACK_SPACING_INVALID'],
    [{ anchorDistanceFt: 0 }, 'RACK_ANCHOR_DISTANCE_INVALID'],
    [{ defaultSpacingFt: 40 }, 'RACK_LOOP_TOO_WIDE'],
  ]) {
    const result = solvePipeRack(input.lines, { ...input.globalSettings, ...overrides }, input.methodology, input.globalInputs);
    assert.equal(result.status, 'NOT_QUALIFIED');
    assert.deepEqual(result.lines, []);
    assert.deepEqual(result.formulaTrace, []);
    assert.ok(result.diagnostics.some(({ code }) => code === expectedCode));
  }
});

test('rack nozzle screening requires explicit loads and positive allowables [SIMULATED]', () => {
  const { input } = JSON.parse(readFileSync('benchmarks/fixtures/piperack/PR-MIST-FAIL-001.json', 'utf8'));
  for (const [overrides, status] of [
    [{ vendorLoads: {} }, 'NOT_QUALIFIED'],
    [{ vendorLoads: { radialForceN: '  ', momentNmm: 0 } }, 'NOT_QUALIFIED'],
    [{ nozzleAllowables: { radialForceN: 0, momentNmm: 100 } }, 'NOT_QUALIFIED'],
    [{ vendorLoads: { radialForceN: '0', momentNmm: 0 } }, 'PASSED'],
    [{ vendorLoads: { radialForceN: 0.6, momentNmm: 0 }, nozzleAllowables: { radialForceN: 0.5, momentNmm: 100 } }, 'FAILED'],
  ]) {
    const result = solvePipeRack([{ ...input.lines[0], ...overrides }], input.globalSettings, input.methodology, input.globalInputs);
    assert.equal(result.lines[0].mistResult.status, status);
    assert.equal(result.status, status);
  }
});

test('Extended 3D keeps valid zero loads and propagates each governing failure [SIMULATED]', () => {
  const zeroLoads = { F_r: 0, M_l: '0', M_c: 0 };
  const partialLoads = { F_r: null, M_l: ' ', M_c: 0 };
  const run = (vessel, constraints) => runExtendedSolver({ ...L_Bend_GM, vessel: { ...L_Bend_GM.vessel, ...vessel }, constraints, methodology: 'FLUOR' });
  const result = run({ vendorNozzleLoads: zeroLoads }, L_Bend_GM.constraints);
  assert.equal(result.status, 'PASSED');
  assert.equal(result.mist.interactionRatio, 0);
  assert.equal(calcMistNozzleQualification({ vendorLoads: partialLoads }).status, 'NOT_QUALIFIED');
  const incomplete = run({ vendorNozzleLoads: partialLoads }, L_Bend_GM.constraints);
  assert.equal(incomplete.status, 'NOT_QUALIFIED');
  assert.equal(incomplete.mist.interactionRatio, null);
  const axisFailure = run({ vendorNozzleLoads: zeroLoads }, { maxStress: 1 });
  assert.equal(axisFailure.axes.X.status, 'FAIL');
  assert.equal(axisFailure.mist.status, 'PASS');
  assert.equal(axisFailure.status, 'FAILED');
  const shellFailure = run({ nozzleRad: 0.2, vendorNozzleLoads: { ...zeroLoads, F_r: 10000 } }, L_Bend_GM.constraints);
  assert.equal(shellFailure.mist.status, 'FAIL');
  assert.equal(shellFailure.flange.status, 'PASS');
  assert.equal(shellFailure.status, 'FAILED');
  const flangeFailure = run({ designPress: 100000 }, L_Bend_GM.constraints);
  assert.equal(flangeFailure.mist.status, 'NOT_QUALIFIED');
  assert.equal(flangeFailure.flange.status, 'FAIL');
  assert.equal(flangeFailure.status, 'FAILED');
});
