# Execution and verification record

The numerical implementation was developed through the user's Antigravity session in IDC_P20. Codex independently inspected the supplied papers, reviewed the implementation and executed the independent checks and final workflow.

Commands executed successfully from the project root:

- `python experiments/run_all.py` — final pipeline exit 0; 34.84 seconds, see final_pipeline.log.
- `python -m pytest -q` — 13 passed, see test_report.txt.
- `python audit/check_implementation.py audit/implementation_checks.json` — every check passes.
- `python audit/replay_runs.py` — 1,810,000 independent steps checked; zero energy violations above 1e-9; snapshot discrepancies below 2.5e-12.
- `python audit/temporal_convergence.py` — measured time order 0.99860 in both dimensions.
- `python audit/save_spectra.py` — optional diagnostic arrays and fit details saved.
- `python docs/build_audited_report.py` — four-page PDF and editable Markdown generated from saved results.
- `presentation/build_progress_deck.mjs` with bundled authoring runtime — package, layout, font and import checks pass; five slides rendered and reviewed.

Both GIF files have 101 frames; first/middle/last frames differ. The original paper checksums are unchanged.

The independent full replay checks all steps, while main CSV diagnostics are sampled in time. Slight positive roundoff near the uniform equilibrium is permitted by the stated 1e-9 tolerance. The primary report is P20_Technical_Report.pdf; its editable counterpart is P20_Technical_Report.md.
