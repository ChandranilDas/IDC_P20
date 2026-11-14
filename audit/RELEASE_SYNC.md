# Synchronized scientific release - 14 November 2026

This record supersedes earlier report/deck/download and browser-generator descriptions.

## Common numerical record

The canonical numerical fields remain in results/raw/. They have not been replaced or modified. results/reference_results.json recomputes exact summaries, step counts and source hashes from these arrays.

The 14-page detailed report, corrected five-slide final deck, executed notebook and app Saved Results use those same archives. Every plot in the corrected slides is regenerated from those fields or actual kink-validation records. The previous presentation's conflicting values and charts were replaced.

## Live browser computation

The standard random seed-42 reference geometries use the exact archived NumPy initial fields. Both default live trajectories are independently tested against the full archives at common observation times: t=40 in 1D and t=25 in 2D, with field discrepancy below 1e-10. Their shorter observation windows are explicitly distinguished from the full t=1000 / t=100 runs. Custom settings use the labelled Mulberry32 generator; deterministic uniform and paired-wall profiles have their own labels.

The Model-A equation, periodic stencils, forward Euler update and unshifted matched discrete free energy remain unchanged. The app distinguishes the paper's ordered-state linear bound from its conservative sufficient bound under a field-amplitude assumption. It does not promise unconditional energy descent or universal scaling.

## Executed checks

- 13 Python tests pass.
- 78 web tests pass, including archived initialization, short trajectory and full default live-trajectory comparisons.
- Production TypeScript/Vite build passes.
- Notebook: all nine code cells executed from a fresh kernel, no error outputs. It recomputes and asserts full-run summaries against the shared result record.
- Full Python driver rerun completed in 37.56 seconds with exact agreement of regenerated numerical archives; this was performed during the submission audit.
- Independent replay covers all 1,810,000 full-run steps, with no energy increase above 1e-9 and maximum saved-field discrepancy approximately 2.491e-12.
- Corrected PPTX: five slides, package/import/layout validation passed, every slide visually reviewed. No claim of native PowerPoint inspection.
- Detailed PDF: 14 pages, 25 equations, eight figures; changed pages visually reviewed and numerical/identity text checked.

## Artifact synchronization

scripts/sync_release.py publishes and checks current report, final deck and notebook copies. It also checks rounded slide metrics and report summaries against the actual arrays. Both current download filenames and legacy report/presentation URLs serve the current files. web/public/generated/release_manifest.json records the downloadable files' SHA-256 hashes.

The unzipped local submission is Project20/. Earlier material is retained only as historical copies outside the submission. Do not use historical deck/report copies as current deliverables.
