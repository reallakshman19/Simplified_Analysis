# PR 1 — Functional workflow recovery

## CURRENT RECOVERY STATE
```
HANDOVER_READINESS: DEGRADED (browser/build not run)
PR_RECOVERY_STATE: HEALTHY / RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED for scoped integration; workflow edits pending explicit owner authorization
REPOSITORY: reallakshman19/Simplified_Analysis
SOURCE_TASK: owner asked to fix defects identified in repository review
PR_OR_WIP: PR1
BRANCH: fix/functional-workflows-20261125
PR_HEAD_OBSERVED: 8b13f10bf9668602ce35480c3eeddeeee6fb55ef
REPORT_BASIS_HEAD: 8b13f10bf9668602ce35480c3eeddeeee6fb55ef
MAIN_HEAD_LAST_CHECKED: ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7
MERGE_BASE: ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-002
CURRENT_STAGE: VALIDATE
LAST_COMPLETED_STAGE: IMPLEMENT (targeted production repairs)
CURRENT_BLOCKER: npm registry HTTP 403 in local environment; GitHub Actions Playwright install unsupported on ubuntu-latest/26.04 (preexisting).
HIGHEST_RISK: UI/build unverified; unqualified existing approximation/material data remains.
EXACT_NEXT_ACTION: Obtain explicit workflow edit authorization; pin CI runner to ubuntu-24.04 and Node 22, rerun actual build/browser tests and fix observed failures; do not promote authority/merge without owner.
```

## Handover in 60 seconds
The branch implements real geometry property preservation, selection from the authoritative sketch graph (not Viewer proxies), 2D imported-route selection and calculation with explicit anchors and uniform pipe-spec confirmation, current benchmark routing/dispatch, project display units and stale result invalidation, actual result publication from 2D/3D/Rack, and more meaningful verification. Screenings remain screening only. The new browser tests are committed but have not executed: CI fails during Chromium install, before build/tests. This is an infrastructure failure, not a passing or failing app test. No workflow files edited, no merge.

## Ground truth and coordination
PR #1 open, draft, mergeable, main at ac0df8f6ac33daf2ba07b6bb04ffd8e6a35a2bf7, implementation head above. No other live open PRs at last query. No prior master index or AGENTS.md on base. New work report/status/claim replace unique WIP files. Coherent claim over workflow integration and verification; no conflicting workstreams. Prior runs [45578856257](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45578856257) and [45578856260](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45578856260) stopped at Playwright install; preceding baseline logs show "Playwright does not support chromium on ubuntu26.04-x64". Latest runs [45579430566](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45579430566) and [45579430600](https://github.com/reallakshman19/Simplified_Analysis/actions/runs/45579430600) initially failure/in-progress. Re-fetch live checks after metadata commit.

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
| ISS-01 2D transfer | Implemented, local behavior PASS | prepareImported2D conversion exercised by existing runExtendedSolver with 10 ft × 20 ft route; confirm browser |
| ISS-02 properties / Viewer | Implemented, local PASS | roundtrip raw/nested metadata and exact selection regression, retain canonical sketch through display proxies |
| ISS-03 benchmark navigation | Implemented, local PASS | valid plans (37), 37 actual fixture comparisons; E2E pending |
| ISS-04 settings and stale state | Partially implemented | unit display and cutoff/friction integration, input mutations stale; other unsupported legacy settings/data authorities remain; browser pending |
| ISS-05 reports | Implemented integration, local payload checks PASS | actual 2D/GC3D/Rack publication; panel mount no false publication; browser pending |
| ISS-06 release check | Implemented | source/script/current docs check passes 19/19, browser QA no longer silently skips; workflow infrastructure still blocked |
| RISK-01 engineering authority | OPEN | existing fallback tables, approximate GC3D and support loads remain; no numerical requalification beyond existing fixture suite |
| RISK-02 CI / production startup | OPEN | user authorization required for workflow edit; local npm denied and CI unsupported OS. |
| DEBT-01 | OPEN | additional end-to-end scenarios and authoritative material/reference settings migration outside tested repair; do not claim current full release certification. |

## Technical diagnosis and invariants
Observed: base numeric benchmarks passed while invalid routing and property loss were reproduced. Hypothesis confirmed via source and actual pure modules: source-to-destination contract mismatch, not arithmetic failure. Falsifier: imported route IDs/legs differ from source or selected fixture result fails independent expected fields. Validate real workflow in browser next. Preserve engine unit basis (canonical mm, Extended ft/Imperial, display conversion only), equations and original numerical fixtures/tolerance. Short-drop cutoff default remains 3 ft, explicit setting can configure screening and report records it. Do not promote a default/fallback to verified engineering authority.

## Validation ledger (implementation head 8b13f10bf9668602ce35480c3eeddeeee6fb55ef)
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
| Strict JSX, production Vite build, Playwright browser flows | NOT_RUN | NOT_OBSERVED | dependencies unavailable locally, CI Chromium install fails; no product pass claimed |
| Independent engineering requalification | NOT_RUN | NOT_OBSERVED | unchanged equations/fixtures, not requalified for design |

## Changed-file ledger
49 production/test/artifact paths relative to main; all intended. Group: app/navigation/geometry/solver/store/report integration, actual QA fixture dispatch and tests, release/QA runners, refreshed engineering benchmark result (fixture title only). No workflow changes.
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

## Review / continuation
No merge requested, keep draft until real build and browser results. Current claim ACTIVE. Owner question sent about pinning workflows; do not infer permission from elapsed time. If authorized, update runner OS and supported Node, run CI until build/browser outcome, diagnose observed runtime errors. If no authorization, hand over as blocked on this explicit decision. Do not call recorded tab qualification current.

## Appendix A (for successor; qualification pending, no takeover occurred)
A1: trace imported PCF L-route through Viewer, Sketcher, prepareImported2D and actual solver/report; predict exact IDs/leg units and demonstrate falsifier.
A2: identify browser installation failure on current HEAD from live run logs and distinguish skipped product validation; propose minimal authorized workflow change.
A3: trace canonical property authority and selection through Viewer proxy; explain invariants about no inferred wall/property values and engine unit conversion.
A4: execute independent geometry test and actual fixture comparisons; identify any changed oracle, and separately demonstrate a real Playwright flow on current HEAD.
A5: after observing CI build/browser result, propose next smallest patch, exact path and independent check; protect existing solver equations and claims.

## History
GE-001 baseline main; PR allocated from WIP. GE-002 current implementation head and code ledger reconciled. Baseline defects reproduced and two implementation checkpoints pushed (8b13f10bf9668602ce35480c3eeddeeee6fb55ef). No other agent takeover.
