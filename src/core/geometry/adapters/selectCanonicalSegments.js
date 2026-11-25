import { validateCanonicalGeometry } from '../validateCanonicalGeometry.js';

/** Select the engineering model, never reconstruct it from visualization proxies. */
export function selectCanonicalSegments(geometry, selectedIds) {
  const ids = new Set(selectedIds || []);
  const segments = (geometry?.segments || []).filter(segment => ids.has(segment.id) || ids.has(segment.sourceComponentUid));
  const nodeIds = new Set(segments.flatMap(segment => [segment.startNodeId, segment.endNodeId]));
  const nodes = (geometry?.nodes || []).filter(node => nodeIds.has(node.id));
  const selected = { ...geometry, nodes, segments, diagnostics: [], summary: { ...geometry?.summary, nodeCount: nodes.length, segmentCount: segments.length } };
  const validation = validateCanonicalGeometry(selected, { requireKnownUnit: true });
  const unmatched = [...ids].filter(id => !segments.some(segment => segment.id === id || segment.sourceComponentUid === id));
  selected.valid = validation.ok && segments.length > 0 && unmatched.length === 0;
  selected.diagnostics = validation.diagnostics;
  if (unmatched.length) selected.diagnostics.push({ severity:'error', code:'DISPLAY_ONLY_SELECTION', message:'Some selections are display-only and cannot enter the calculation model.', data:{unmatched} });
  if (!segments.length) selected.diagnostics.push({ severity:'error', code:'NO_CANONICAL_SELECTION', message:'No selected display component maps to an analysis segment.' });
  return structuredClone(selected);
}
