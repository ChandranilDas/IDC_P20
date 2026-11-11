# Browser reproduction, remaining release blocker

Browser QA after41 tests passed:
1. Default1D Start, Pause, Resume, completed t40.
2. Reset Simulation.
3. Select2D Domain Coarsening preset.
Result: blank React page. Console TypeError undefined.toFixed at InspectorCard.tsx111. New activeConfig2D is rendered against old1D field while worker INITIALIZED pending. This also applies to grid resizing and SavedResults run-change render before fetch effect clears buffer.

Fix through Antigravity: atomically associate displayed field, diagnostics and config by runId; clear pending frame on all init/config/preset changes and guard expected field length before inspector/render. Never label old data with new config. Add React error boundary with recovery/reset so errors do not blank whole app. Add REAL mounted component transitions1D->2D->1D,grid resize/reset/newrun,rapid saved switches. Pure core tests do not cover this.

Independent input11cases pass, worker cadence/pause/stale-reset pass, full science assets unchanged and exact. Server5173 restarted for QA. Do not modify protectedPython/results/report/slides.
