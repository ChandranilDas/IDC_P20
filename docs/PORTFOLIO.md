# P20 — TDGL numerical laboratory

Source: [ChandranilDas/IDC_P20](https://github.com/ChandranilDas/IDC_P20). Live application link will be added after deployment completes.

## Suggested CV entry

**TDGL Numerical Laboratory | Python, TypeScript, React**  
Developed an interactive 1D/2D Model-A phase-ordering laboratory with periodic finite differences, Web Worker integration, reproducible reference playback, and a pointwise stencil inspector. Validated spatial and temporal convergence and audited 1.81 million integration steps for free-energy descent.

## Evidence behind the entry

- Central spatial differences and Forward Euler time integration of the real scalar nonconserved equation, with periodic boundaries.
- Kink interior residual convergence: observed order 1.98947. Single-kink boundary wrapping is excluded from this interior benchmark.
- Temporal benchmark: fitted order 0.9986015 in both dimensions for the selected test configuration.
- Independent full replay: 1,810,000 steps, zero energy increases above 1e-9; largest archived-field discrepancy approximately 2.491e-12.
- Browser core independently agrees with NumPy stencil and trajectory calculations. The browser uses Mulberry32, while Python reference initial conditions use NumPy default_rng; equal seeds do not imply equal initial fields.
- 70 web tests and 13 Python tests, plus executed browser runs and export checks. Spectral fits are descriptive finite-window measurements.

## Deliverables

- [Technical report](P20_Technical_Report.pdf)
- [Report text](P20_Technical_Report.md)
- [Five-slide progress presentation](../presentation/P20_Progress_Presentation.pptx)
- [Independent replay record](../audit/independent_full_replay.json)

Antigravity authored the implementation with Codex independently reviewing and verifying it. Describe your own contribution accurately when discussing this project. Professor-provided source papers and the allocation image remain local; journal references are linked in the report.
