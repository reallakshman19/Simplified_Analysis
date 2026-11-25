import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { canonicalGeometryToSketcher, sketcherToCanonicalGeometry } from '../src/core/geometry/adapters/sketcherToCanonicalGeometry.js';
import { selectCanonicalSegments } from '../src/core/geometry/adapters/selectCanonicalSegments.js';
import { pcfToCanonicalGeometry } from '../src/core/geometry/adapters/pcfToCanonicalGeometry.js';
import { prepareImported2D, importedAnchorsReady } from '../src/calc-extended/solver/imported2DWorkflow.js';
import { runExtendedSolver } from '../src/calc-extended/solver/ExtendedSolver.js';
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
