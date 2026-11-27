import { canonicalToExtended } from '../../core/geometry/adapters/canonicalToExtended.js';
import { validateCanonicalGeometry } from '../../core/geometry/validateCanonicalGeometry.js';

// Keep the original model axes (particularly vertical Z), IDs and properties.
// ExtendedSolver consumes feet; this adapter is the sole coordinate conversion.
export function prepareImported2D(geometry, plane = 'XY') {
  const fail = (reason) => ({ ok: false, reason, nodes: [], segments: [], anchorOptions: [], anchors: {} });
  const validation = validateCanonicalGeometry(geometry, { requireKnownUnit: true });
  if (!validation.ok || geometry?.valid === false || !geometry?.segments?.length) return fail('Invalid or empty imported geometry.');
  if (!['mm', 'm', 'in', 'ft'].includes(geometry.unit)) return fail('Unsupported imported geometry unit.');
  const { nodes, segments } = canonicalToExtended(geometry);
  if (!['XY', 'XZ', 'YZ'].includes(plane)) return fail('Select an axis-aligned drafting plane.');
  const perpendicular = { XY: 'z', XZ: 'y', YZ: 'x' }[plane];
  if (nodes.some(node => Math.abs(node[perpendicular] - nodes[0][perpendicular]) > 1e-6)) {
    return fail('Route is not planar in the selected plane. Use 3D Calc.');
  }

  const neighbors = new Map(nodes.map(node => [node.id, []]));
  const usedAxes = new Set();
  for (const segment of segments) {
    if (['TEE','OLET','BRANCH'].includes(String(segment.type).toUpperCase())) return fail('Branch fittings are not supported by the two-anchor 2D workflow.');
    const start = nodes.find(node => node.id === segment.startNodeId);
    const end = nodes.find(node => node.id === segment.endNodeId);
    if (!start || !end || start.id === end.id) return fail('Invalid segment connectivity.');
    const axes = ['x', 'y', 'z'].filter(axis => Math.abs(end[axis] - start[axis]) > 1e-6);
    if (axes.length !== 1) return fail('2D screening requires nonzero, axis-aligned segments.');
    usedAxes.add(axes[0]);
    neighbors.get(start.id).push(end.id);
    neighbors.get(end.id).push(start.id);
  }
  if (usedAxes.size < 2) return fail('No perpendicular flexibility leg. Use an appropriate straight-span check.');
  const terminals = nodes.filter(node => neighbors.get(node.id).length === 1);
  if (terminals.length !== 2 || [...neighbors.values()].some(list => list.length > 2 || list.length === 0)) {
    return fail('Branched, cyclic or disconnected routes require a different calculation method.');
  }
  const visited = new Set();
  const pending = [terminals[0].id];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...neighbors.get(id));
  }
  if (visited.size !== nodes.length) return fail('Disconnected route. Select a single continuous run.');
  const marked = nodes.filter(node => node.restraint === 'ANCHOR');
  if (marked.some(node => !terminals.some(terminal => terminal.id === node.id))) {
    return fail('Intermediate anchors are outside this two-anchor screening scope.');
  }
  const anchors = marked.length === 2 ? { anchor1: marked[0].id, anchor2: marked[1].id } : { anchor1: '', anchor2: '' };
  return { ok: true, nodes, segments, plane, anchorOptions: terminals, anchors, source: geometry.source };
}

export function importedAnchorsReady(route, anchors) {
  return Boolean(route?.ok && anchors?.anchor1 !== anchors?.anchor2 &&
    route.anchorOptions.some(node => node.id === anchors?.anchor1) &&
    route.anchorOptions.some(node => node.id === anchors?.anchor2));
}
