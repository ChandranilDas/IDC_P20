# In-progress findings to recheck after Antigravity finishes

- Worker accumulates currentTime += dt and may overshoot duration. Require exact step-based timestamps and explicit duration rounding semantics; no silent dt changes.
- Worker eulerStep2D call signature changed to include dy before scratch/out: check all callers.
- Worker pause has no state acknowledgement; test no stale updates/reset generations and output on pause.
- Timeline onSeek is typed (index:number)=>void but passes functional updater; build should catch. Ensure callback and playback agree.
- FieldCanvas 1D maps i/(Nx-1) to whole L while actual x=i*dx, final point L-dx. Fix coordinate mapping and click mapping.
- FieldCanvas lacks ResizeObserver: verify resize/mobile redraw and no clipped axes/legend.
- About/report: use audited P20_Technical_Report.pdf/md, not pointer final_report.md; public professor papers excluded, our own report authorized.
- Test fixed-point 2D, wrapping corners, actual worker lifecycle, both UI modes, resource limits, all numerical configuration fields.
- Browser observed live run t=47.8 but history remains Frame1of1: worker lastReportTime resets on non-snapshot tick, preventing snapshot interval from ever elapsing. Use independent lastSnapshotStep and report timestamps.
- DiagnosticsPlot labels mean-square as Variance; fix to Mean square. Plot x axis must be physical time, not sample index (especially nonuniform saved times). Add mean and mean-square curves, not energy alone.
- UI says Stable integration assured from linear bound alone: replace with qualified linear check; nonlinear bound must also be enforced.
- SavedResultsView indexes diag arrays by frame index despite differing cadences; recompute all current metrics directly from displayed field. Avoid invented 0 or +/-1 for missing pair diagnostic history.
- SavedResultsView fetch race and invalid HTTP/binary need visible errors and cancellation.
- ValidationView should render evidence-backed values and not success badges on fetch failure.
- Public GitHub preparation: root .gitignore must exclude .env files, .vercel, the two original professor PDFs, extracted full-paper docs/text_2023.txt and text_2024.txt, allocation screenshot, local presentation build/regenerated caches; preserve files locally. Include a clear source-access note for future reproduction. Do not invent a license for professor material.
- README falsely promises60FPS, bounded history/PNG before implemented; align final docs with evidence. Remove absolute file:///Users links for portable repo. CV wording must not claim universal Porod verification or literally zero energy increases (threshold1e-9 used); say0 violations above1e-9 and descriptive finite-window spectral fits.
- Rename mean-square field from Variance; plot physical time x axis and include mean/mean-square curves.

## Independent worker harness (latest code)
Snapshot-cadence fix now passes (40 snapshots by t=2 with duration10); pause stops queued batches. Still FAIL: send INIT(runB), then stale RESET(runA), then START(runB) destroys the new run. Add runId guard to RESET before stopLoop. Test this exact sequence. Worker duration Math.round(duration/dt) must either reject noninteger ratios upfront or disclose actual end time, never silently pretend requested time. STEP_ONCE must not integrate beyond completed duration unless explicitly documented.
