/**
 * pcfParser.js — Parse PCF text into structured component objects.
 *
 * Canonical parse entry points:
 *   parsePcf(rawText) → Component[]
 *   parsePcfWithDiagnostics(rawText) → { components, diagnostics, summary }
 */

import { npsToDn } from '../core/geometry/pipeSchedules.js';

const COORDINATE_TO_MM = new Map([['MM', 1], ['INCH', 25.4], ['MM-HUNDREDTHS', 0.01]]);
const BORE_UNITS = new Set(['MM', 'INCH', 'INCH-SIXTEENTH']);
const UNIT_HEADER = /^(UNITS-CO-ORDS|UNITS-BORE)(?:\s+(.*))?$/i;

const COMP_TYPES = new Set([
  'PIPE', 'ELBOW', 'TEE', 'FLANGE', 'VALVE',
  'SUPPORT', 'BEND', 'REDUCER', 'CAP', 'GASKET', 'BOLT',
  'REDUCER-CONCENTRIC', 'REDUCER-ECCENTRIC', 'OLET',
  'INSTRUMENT', 'WELD', 'COUPLING', 'CROSS', 'STRAINER',
  'BLIND-FLANGE', 'UNION', 'TRAP', 'FILTER', 'MISC-COMPONENT',
  'MESSAGE-SQUARE',
]);

let idCounter = 0;
const nextUid = () => `comp-${++idCounter}`;

const parseCoordinateLine = (line, keyword, diagnostics, lineNumber, sourceUnits) => {
  const parts = line.split(/\s+/);
  if (parts.length < 4) {
    diagnostics.push({
      severity: 'warn',
      code: 'PCF_COORD_INCOMPLETE',
      message: `${keyword} line has too few coordinate fields.`,
      data: { line, lineNumber },
    });
    return null;
  }

  const factor = COORDINATE_TO_MM.get(sourceUnits.coordinates ?? 'MM');
  const [x, y, z] = parts.slice(1, 4).map((value) => Number(value) * factor);
  if (![x, y, z].every(Number.isFinite)) {
    diagnostics.push({
      severity: 'warn',
      code: 'PCF_COORD_INVALID_NUMBER',
      message: `${keyword} line contains non-numeric coordinates.`,
      data: { line, lineNumber },
    });
    return null;
  }

  const rawBore = parts.length >= 5 ? Number(parts[4]) : 0;
  const boreUnit = sourceUnits.bore ?? 'MM';
  if (boreUnit === 'MM' || rawBore === 0) return { x, y, z, bore: Number.isFinite(rawBore) ? rawBore : 0 };

  const nps = boreUnit === 'INCH-SIXTEENTH' ? rawBore / 16 : rawBore;
  const bore = npsToDn(nps);
  if (bore === null) {
    diagnostics.push({
      severity: 'error',
      code: 'PCF_NOMINAL_BORE_UNMAPPED',
      message: `Line ${lineNumber}: nominal bore ${parts[4]} in ${boreUnit} has no supported DN mapping.`,
      data: { lineNumber, bore: parts[4], unit: boreUnit },
    });
    return null;
  }
  return { x, y, z, bore };
};

const createComponent = (type) => ({
  id: nextUid(),
  uid: undefined,
  type,
  points: [],
  centrePoint: null,
  branch1Point: null,
  branch2Point: null,
  branch3Point: null,
  coOrds: null,
  coords: null,
  bore: 0,
  attributes: {},
  rawLines: [],
});

/**
 * Normalize PCF coordinates to millimeters and bore to DN. Headerless snippets
 * retain the millimeter convention. Invalid unit declarations block the import.
 * @param {string} rawText
 * @returns {{ components: object[], diagnostics: Array<Record<string, unknown>>, summary: Record<string, unknown> }}
 */
export const parsePcfWithDiagnostics = (rawText) => {
  idCounter = 0;
  const diagnostics = [];
  const components = [];
  const sourceUnits = { coordinates: null, bore: null };
  const text = typeof rawText === 'string' ? rawText : '';
  const lines = text.split('\n').map((original, index) => ({ original, line: original.trim(), lineNumber: index + 1 }));
  let currentComp = null;
  let ignoredLineCount = 0;

  const pushCurrent = () => {
    if (currentComp) components.push(currentComp);
    currentComp = null;
  };

  for (const entry of lines) {
    const { line, lineNumber } = entry;
    if (!line) continue;

    const unitHeader = UNIT_HEADER.exec(line);
    if (unitHeader) {
      const header = unitHeader[1].toUpperCase();
      const value = unitHeader[2]?.toUpperCase();
      const field = header === 'UNITS-CO-ORDS' ? 'coordinates' : 'bore';
      const allowedUnits = field === 'coordinates' ? COORDINATE_TO_MM : BORE_UNITS;
      if (currentComp || !allowedUnits.has(value) || (sourceUnits[field] && sourceUnits[field] !== value)) {
        diagnostics.push({
          severity: 'error',
          code: 'PCF_INVALID_UNIT_HEADER',
          message: `Line ${lineNumber}: invalid, conflicting, or misplaced ${header}. Declare one supported value before the components: ${[...allowedUnits.keys()].join(', ')}.`,
          data: { lineNumber, header, value },
        });
      } else {
        sourceUnits[field] = value;
      }
      continue;
    }

    if (COMP_TYPES.has(line)) {
      pushCurrent();
      currentComp = createComponent(line);
      currentComp.rawLines.push(line);
      continue;
    }

    if (!currentComp) {
      ignoredLineCount += 1;
      continue;
    }

    if (line.startsWith('END-POINT')) {
      const point = parseCoordinateLine(line, 'END-POINT', diagnostics, lineNumber, sourceUnits);
      if (point) {
        currentComp.points.push(point);
        if (currentComp.bore === 0) currentComp.bore = point.bore;
      }
      currentComp.rawLines.push(line);
      continue;
    }

    if (line.startsWith('CENTRE-POINT')) {
      const point = parseCoordinateLine(line, 'CENTRE-POINT', diagnostics, lineNumber, sourceUnits);
      if (point) currentComp.centrePoint = point;
      currentComp.rawLines.push(line);
      continue;
    }

    if (line.startsWith('BRANCH1-POINT')) {
      const point = parseCoordinateLine(line, 'BRANCH1-POINT', diagnostics, lineNumber, sourceUnits);
      if (point) currentComp.branch1Point = point;
      currentComp.rawLines.push(line);
      continue;
    }

    if (line.startsWith('BRANCH2-POINT')) {
      const point = parseCoordinateLine(line, 'BRANCH2-POINT', diagnostics, lineNumber, sourceUnits);
      if (point) currentComp.branch2Point = point;
      currentComp.rawLines.push(line);
      continue;
    }

    if (line.startsWith('BRANCH3-POINT')) {
      const point = parseCoordinateLine(line, 'BRANCH3-POINT', diagnostics, lineNumber, sourceUnits);
      if (point) currentComp.branch3Point = point;
      currentComp.rawLines.push(line);
      continue;
    }

    if (line.startsWith('CO-ORDS')) {
      const point = parseCoordinateLine(line, 'CO-ORDS', diagnostics, lineNumber, sourceUnits);
      if (point) {
        currentComp.coOrds = point;
        currentComp.coords = point;
      }
      currentComp.rawLines.push(line);
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length > 1) {
      const key = parts[0];
      const val = parts.slice(1).join(' ');
      currentComp.attributes[key] = val;
    } else if (parts.length === 1 && !COMP_TYPES.has(line)) {
      currentComp.attributes[line] = '';
    }
    currentComp.rawLines.push(line);
  }

  pushCurrent();

  const componentsWithoutGeometry = components.filter((component) => (
    (!component.points || component.points.length === 0) &&
    !component.centrePoint &&
    !component.branch1Point &&
    !component.branch2Point &&
    !component.branch3Point &&
    !component.coOrds
  ));

  if (ignoredLineCount > 0) {
    diagnostics.push({
      severity: 'info',
      code: 'PCF_HEADER_LINES_IGNORED',
      message: 'Ignored non-component header/global PCF lines before first component.',
      data: { ignoredLineCount },
    });
  }

  if (componentsWithoutGeometry.length > 0) {
    diagnostics.push({
      severity: 'warn',
      code: 'PCF_COMPONENTS_WITHOUT_GEOMETRY',
      message: 'Some parsed components do not contain usable coordinate lines.',
      data: { count: componentsWithoutGeometry.length },
    });
  }

  const acceptedComponents = diagnostics.some(({ severity }) => severity === 'error') ? [] : components;
  return {
    components: acceptedComponents,
    diagnostics,
    summary: {
      componentCount: acceptedComponents.length,
      diagnosticCount: diagnostics.length,
      ignoredLineCount,
      componentsWithoutGeometry: componentsWithoutGeometry.length,
      sourceUnits: { coordinates: sourceUnits.coordinates ?? 'MM', bore: sourceUnits.bore ?? 'MM' },
    },
  };
};

/**
 * Backward-compatible parser API used by existing tabs.
 * @param {string} rawText
 * @returns {object[]}
 */
export const parsePcf = (rawText) => parsePcfWithDiagnostics(rawText).components;
