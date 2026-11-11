# Independent web-app acceptance audit

Status: redesigned app independently accepted locally on 2026-11-11, pending final publishing checks. Antigravity authored app changes; Codex tested actual browser runs, mounted components, scientific exports, and protected assets. GitHub source has been pushed and Vercel deployment is READY at https://idc-p20.vercel.app. Repository integration is connected.

The redesigned notebook layout uses a square 2D physical plot, shared drawing/pointer bounds, top workspace transport controls, darker informative labels and keyboard focus. Missing or failed audit evidence cannot silently pass; spectral fits are descriptive. The original evidence regressions and two additional missing-field failures were reproduced and resolved. All four views fit a 390px viewport; wide validation tables scroll within their panels.

## Verified evidence

- 1D and rectangular 2D TypeScript stencils/trajectories agree with independently computed NumPy formulas (RHS <=3.56e-15, energy <=1.43e-14, trajectories <=1.12e-16).
- All three browser reference datasets are bitwise identical to archived NPZ arrays, including nonuniform timestamps and source provenance.
- Eighteen protected research files retain their original hashes.
- Full live 1D t=40 and 2D t=25 runs executed in the browser. Start/pause/resume, reset, field inspector, saved playback and final-frame display exercised. The production-built app also completed 2D and successfully ran again from its completed state, preserving t=0 in its history.
- Completed live 2D JSON export: independent free energy discrepancy 1.82e-12; mean and mean-square errors below 4e-16; 168 CSV records decrease in free energy. PNG export downloaded and verified as a valid 1636x720 image.
- Saved 2D final metrics and periodic inspector at (0,0) match original NPZ values. Pair final t=800 reaches phi=-1; mean-square curve uses 9 real snapshot values.
- At 390-pixel viewport all four views have scrollWidth=390; desktop and mobile screenshot evidence saved.
- Report PDF, Markdown and presentation download endpoints return exact original project files. Professor source papers remain local and are excluded from public assets.
- Independent worker audit confirms snapshot cadence, pause quiescence and stale RESET rejection; input validation audit passes all 11 cases.
- Mounted tests exercise real SimulationLab controls with delayed Worker messages, raw input rejection, geometry changes, initialization gating, actual ErrorBoundary recovery and deferred SavedResultsView dataset loads. Final full suite: 70/70 tests across 6 files pass, including 7 independent mounted UI checks and 7 scientific evidence-integrity checks. Production typecheck/build passes. Python tests: 13/13 pass. Clean npm ci succeeds and reports 0 vulnerabilities.

## Deployment setup

The canonical local app is `web/` inside IDC_P20. For Vercel use Root Directory `web`, framework Vite, build `npm run build`, output `dist`. No backend, database, secrets or external simulation datasets are required. Browser PRNG differs from NumPy; saved reference runs preserve original Python values. Live demos have a 50-million cell-step budget and bounded history.

The previous Complete_Project.zip is a portable copy of the research deliverables from the earlier phase; the app is developed in place in IDC_P20/web. It is not necessary to extract that ZIP over the working folder.

## Redesign release checks

Production-built browser completed 1D t=40 and 2D t=25; rerun/pause/resume/reset/geometry changes were exercised. Independent exported 2D energy differs by1.82e-12, mean by2.08e-17; CSV contains 168 records; PNG is valid 1008x894. Core parity, 11 invalid-input cases and worker stale-message/pause tests pass again. Dataset arrays remain bitwise equal to original NPZ and 18 protected research files unchanged.

GitHub Actions run 42959041267 passed both scientific and web jobs for commit e5a3d807c39792a9233d24eb2cbed1e7af1ba7f7. Vercel cloud build completed READY and assigned https://idc-p20.vercel.app. Remote application content was not fetched; local production-build interactions and cloud build status provide the verification evidence.
