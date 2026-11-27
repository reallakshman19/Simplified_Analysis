const COORDINATE_TO_MM = new Map([['mm', 1], ['m', 1000], ['in', 25.4], ['ft', 304.8]]);

/**
 * Convert canonical geometry back into simple PCF-like PIPE components.
 * Output coordinates are in millimeters. Nominal bore values remain DN.
 * This is intentionally conservative: when original parsed components are
 * available, prefer pcfSerializer on those components for higher fidelity.
 * @param {import('../geometryTypes.js').CanonicalGeometry} geometry
 * @returns {Array<Record<string, unknown>>}
 */
export function canonicalToPcfComponents(geometry) {
  const unit = geometry?.unit ?? 'mm';
  const factor = COORDINATE_TO_MM.get(unit);
  if (factor === undefined) throw new RangeError(`Cannot export PCF with unknown canonical coordinate unit "${unit}".`);
  const nodesById = new Map((geometry?.nodes || []).map((node) => [node.id, node]));
  return (geometry?.segments || []).map((segment, index) => {
    const start = nodesById.get(segment.startNodeId);
    const end = nodesById.get(segment.endNodeId);
    return {
      id: segment.sourceComponentUid || `canonical-${index + 1}`,
      type: segment.type || 'PIPE',
      bore: segment.diameter || 0,
      points: [start, end].filter(Boolean).map((node) => ({
        x: node.x * factor,
        y: node.y * factor,
        z: node.z * factor,
        bore: segment.diameter || node.meta?.bore || 0,
      })),
      attributes: {
        MATERIAL: segment.material || '',
        SOURCE: 'CANONICAL_GEOMETRY_EXPORT',
        'SOURCE-SEGMENT': segment.id,
      },
      rawLines: [],
    };
  });
}
