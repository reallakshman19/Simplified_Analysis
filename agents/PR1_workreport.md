# PR 1 — Functional workflow recovery

## CURRENT RECOVERY STATE
```
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY / RECOVERABLE
TAKEOVER_AUTHORITY: Scoped implementation complete
REPOSITORY: reallakshman19/Simplified_Analysis
SOURCE_TASK: owner asked to fix defects identified in repository review
PR_OR_WIP: PR1
BRANCH: fix/functional-workflows-20261125
PR_HEAD_OBSERVED: 3b5c079f7ebc1fbb1a4abdeb7db9db8d30148a01
REPORT_BASIS_HEAD: 3b5c079f7ebc1fbb1a4abdeb7db9db8d30148a01
MAIN_HEAD_LAST_CHECKED: ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7
MERGE_BASE: ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED
GROUNDING_EPOCH: GE-003
CURRENT_STAGE: HANDOVER
LAST_COMPLETED_STAGE: VALIDATE
CURRENT_BLOCKER: None for PR review
HIGHEST_RISK: Existing engineering screening limitations and browser scenarios outside CI coverage.
EXACT_NEXT_ACTION: Review PR #1 and the two passing certification runs.
```

## Handover in 60 seconds
The branch implements real geometry property preservation, selection from the authoritative sketch graph (not Viewer proxies), 2D imported-route selection and calculation with explicit anchors and uniform pipe-spec confirmation, current benchmark routing/dispatch, project display units and stale result invalidation, actual result publication from 2D/3D/Rack, and more meaningful verification. Both certification workflows now pass after pinning Ubuntu 24.04 and Node 22 and using the same Playwright browser directory for installation and tests. CI built the production bundle and ran seven browser tests, including the PCF-to-2D-to-Reports and live Pipe Rack benchmark flows.

## Ground truth and coordination

PR #1 is open and targets main at ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7. The implementation was verified at 3b5c079f7ebc1fbb1a4abdeb7db9db8d30148a01. No other open PRs or reviews were present during reconciliation. The 56 changed paths match the ledger. The [U0 Baseline Certification](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45736674687) and [Release Candidate Certification](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45736674685) both passed. Earlier attempts failed while installing Playwright on Ubuntu 26.04.

## Scope and acceptance
- Actual PCF/sketch data must reach solver, retaining IDs, coordinates, properties, endpoint anchors and units.
- Unsupported 2D branched/disconnected/non-planar/non-axis-aligned routes must block, not silently substitute geometry.
- Benchmark fixtures must execute the registered solver and compare actual numeric values; valid subtab routing; formula-only cases remain QA fixtures.
- Current solver result must populate Reports; changes invalidate results and calculations, report identity explicit.
- Unit preference affects display not stored physics; cutoff and rack friction values consumed explicitly. Existing defaults and 37 independent fixture expectations unchanged except correction of obsolete UI metadata assertions.
- No claim of full stress analysis or independently certified engineering data. Mixed-spec 2D route requires operator confirmation; unsupported topologies retain diagnostics.
- Full build and browser workflow regression necessary before readiness; no deployment/merge without authorization.

## Implementation / active items
| ID | State | Evidence / remaining |
|---|---|---|
| ISS-01 2D transfer | Implemented, local behavior PASS | prepareImported2D conversion exercised by existing runExtendedSolver with 10 ft × 20 ft route. The browser test verifies both dimensions in the published report. |
| ISS-02 properties / Viewer | Implemented, local PASS | roundtrip raw/nested metadata and exact selection regression, retain canonical sketch through display proxies |
| ISS-03 benchmark navigation | Implemented, local PASS | valid plans (37), 37 actual fixture comparisons. Browser QA verifies the Pipe Rack and cantilever fixtures. |
| ISS-04 settings and stale state | Partially implemented | unit display and cutoff/friction integration, input mutations stale; the Settings browser test covers stale-result invalidation. Some legacy settings and data sources remain outside this repair. |
| ISS-05 reports | Implemented integration, local payload checks PASS | the 2D and fixture report paths passed browser QA. 3D publication was inspected in source. |
| ISS-06 release check | Implemented | source/script/current docs check passes 19/19, both CI workflows complete successfully on Ubuntu 24.04 |
| RISK-01 engineering authority | OPEN | existing fallback tables, approximate GC3D and support loads remain; no numerical requalification beyond existing fixture suite |
| RISK-02 CI / production startup | RESOLVED for PR validation | Ubuntu 24.04 and Node 22 build and browser checks passed in both workflows. |
| DEBT-01 | OPEN | additional end-to-end scenarios and authoritative material/reference settings migration outside tested repair; do not claim current full release certification. |

## Technical diagnosis and invariants
Observed: base numeric benchmarks passed while invalid routing and property loss were reproduced. Hypothesis confirmed via source and actual pure modules: source-to-destination contract mismatch, not arithmetic failure. Falsifier: imported route IDs/legs differ from source or selected fixture result fails independent expected fields. The browser regression confirms the actual PCF geometry reaches the 2D solver and report. Preserve engine unit basis (canonical mm, Extended ft/Imperial, display conversion only), equations and original numerical fixtures/tolerance. Short-drop cutoff default remains 3 ft, explicit setting can configure screening and report records it. Do not promote a default/fallback to verified engineering authority.

## Validation ledger (implementation head 3b5c079f7ebc1fbb1a4abdeb7db9db8d30148a01)
| Check | Status | Observation / oracle | Evidence / limitations |
|---|---|---|---|
| Baseline engineering benchmarks | PASS | LOCAL_EXECUTION / ANALYTICAL or fixture regression per fixture | base: 37/37 zero rounded max error |
| Current engineering benchmarks | PASS | LOCAL_EXECUTION / same fixture oracles | 37/37 zero rounded max error, 15 legacy/reference skipped, no numeric tolerance changes |
| Functional workflows | PASS | LOCAL_EXECUTION / independently specified geometry dimensions, implementation-coupled state contract | node --test tests/functional-workflows.test.js: 9/9, including actual QA dispatcher executing 37 fixtures |
| Import graph | PASS | LOCAL_EXECUTION / implementation-coupled | node scripts/import-check.mjs |
| Prebuild | PASS | LOCAL_EXECUTION / workflow tests + registry | npm run prebuild; only prebuild, not Vite |
| Smoke | PASS | LOCAL_EXECUTION / implementation-coupled | node scripts/smoke-check.mjs |
| Release docs/script presence | PASS | LOCAL_EXECUTION / source contract | 19/19; optional settings resolver missing warning; not completed production certification |
| U3/U4/U5/U6 behavior | PASS | LOCAL_EXECUTION / implementation-coupled | 21+14+13+4 checks pass |
| Native JS syntax | PASS | LOCAL_EXECUTION / parser | syntax-check fallback: 318 scanned, 52 JSX structural checks only, no Babel parse; E2E spec JS syntax checked separately |
| npm ci local | FAIL (infrastructure) | LOCAL_EXECUTION / none | registry 403 for zustand; offline cache miss; PREEXISTING environment |
| Strict JSX, production Vite build, Playwright browser flows | PASS | REMOTE_EXECUTION / strict parsing, Vite compilation, and browser assertions | Both GitHub Actions jobs passed. Seven Chromium cases ran per job using the dev server. The production build passed separately. |
| Independent engineering requalification | NOT_RUN | NOT_OBSERVED | unchanged equations/fixtures, not requalified for design |

## Changed-file ledger
52 production, CI, test, and generated result paths relative to main. These cover application integration, fixture execution, validation, and the runner compatibility fix.
- `.github/workflows/deploy.yml`
- `.github/workflows/release-candidate.yml`
- `.github/workflows/u0-certification.yml`
- `benchmarks/fixtures/ui-proof/UI-MOCK-LOAD-001.json`
- `e2e/benchmark-workflow.spec.js`
- `e2e/functional-workflows.spec.js`
- `package.json`
- `reports/benchmark-results.json`
- `scripts/full-check.mjs`
- `scripts/qa-check.mjs`
- `scripts/release-candidate-check.mjs`
- `scripts/syntax-check.mjs`
- `scripts/validate-tab-benchmark-registry.mjs`
- `src/3d-analysis/AnalysisStore.js`
- `src/3d-analysis/ConfigPanel.jsx`
- `src/3d-analysis/DebugTable.jsx`
- `src/3d-analysis/ModelContractPanel.jsx`
- `src/App.jsx`
- `src/benchmarking/BenchmarkFixturePanel.jsx`
- `src/benchmarking/TabQualificationBanner.jsx`
- `src/benchmarking/benchmarkLaunch.js`
- `src/benchmarking/executeBenchmarkFixture.js`
- `src/calc-extended/components/Bundle2DSolverView.jsx`
- `src/calc-extended/components/CalcExtendedTab.jsx`
- `src/calc-extended/components/ConfigDatabaseTab.jsx`
- `src/calc-extended/components/DashboardView.jsx`
- `src/calc-extended/components/GlobalDebugTab.jsx`
- `src/calc-extended/solver/ExtendedSolver.js`
- `src/calc-extended/solver/imported2DWorkflow.js`
- `src/calc-extended/store/useExtendedStore.js`
- `src/calc-extended/utils/units.js`
- `src/components/BenchmarksValidationTab.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/components/Viewer3DTab.jsx`
- `src/core/geometry/adapters/pcfToCanonicalGeometry.js`
- `src/core/geometry/adapters/selectCanonicalSegments.js`
- `src/core/geometry/adapters/sketcherToCanonicalGeometry.js`
- `src/mocks/benchmarkFixtureInputs.js`
- `src/mocks/engineeringMockCatalog.js`
- `src/piperack/components/PipeRackTab.jsx`
- `src/piperack/components/RackInputsDock.jsx`
- `src/piperack/components/RackResultsGrid.jsx`
- `src/piperack/components/RackVisualizer.jsx`
- `src/piperack/components/SectionCreatorTab.jsx`
- `src/piperack/store/usePipeRackStore.js`
- `src/reporting/index.js`
- `src/reporting/publishActiveReportContext.js`
- `src/settings/SettingsTab.jsx`
- `src/sketcher/SketcherStore.js`
- `src/sketcher/SketcherTab.jsx`
- `src/store/appStore.js`
- `tests/functional-workflows.test.js`

Additional recovery: agents/MASTER_INDEX.md, agents/PR1_workreport.md, agents/status/PR1.yaml, agents/claims/PR1.yaml. WIP migration removes initial branch-only WIP files; relative to main only new PR records remain.

## Review and continuation

The verified scope is ready for review. The PR has passing production builds, the configured browser suite, and the existing engineering fixtures. The browser suite does not cover all 3D, PCFX, or other repository scenarios. Independent engineering validation remains outside this repair. Deployment is pending merge and the Pages workflow.

## History

The initial review reproduced that independent numerical benchmarks passed despite workflow integration bugs. The first implementation repaired the UI-to-solver paths and added focused checks. After the owner approved workflow edits on 2026-11-26, the runner change restored Chromium installation and both CI workflows passed.
