import * as math2d from '../solvers/2d/math2d.js';
import * as solver2d from '../solvers/2d/index.js';
import * as solver3d from '../solvers/3d/index.js';
import * as gc3d from '../core/solvers/gc3d/GC3DCalcEngine.js';
import * as extended from '../calc-extended/solver/ExtendedSolver.js';
import * as rack from '../solvers/piperack/index.js';
import * as reporting from '../reporting/index.js';
import * as engineeringData from '../data/engineeringData.js';
import * as mockCatalog from '../mocks/engineeringMockCatalog.js';
import { compareEngineeringResults } from './compareEngineeringResults.js';

const modules = {
  '2d-math': math2d, '2d-simplified-stress-check': solver2d, '3d-guided-cantilever': solver3d,
  'gc3d-core': gc3d, 'calc-extended': extended, 'piperack-expansion-loop': rack,
  reporting, 'engineering-data': engineeringData, 'ui-proof': mockCatalog,
};

// Uses the same independent fixture expectations and solver exports as CLI QA.
export async function executeBenchmarkFixture(fixture) {
  const solver = modules[fixture?.module]?.[fixture?.solverExport];
  if (typeof solver !== 'function') throw new Error('No executable solver registered for this fixture.');
  const input = structuredClone(fixture.input);
  const result = Array.isArray(input) ? await solver(...input) : await solver(input);
  const actual = result?.results ?? result;
  const passedContract = result?.methodId === fixture.methodId && Array.isArray(result?.formulaIds) &&
    result.formulaIds.length > 0 && (!fixture.compare?.requiredStatus || result.status === fixture.compare.requiredStatus);
  const comparison = compareEngineeringResults(fixture, actual);
  return { result, actual, passed: passedContract && comparison.passed, maxError: comparison.maxError };
}
