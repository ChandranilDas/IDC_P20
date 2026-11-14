# Source audit: Project20 scientific submission

## Authoritative references

1. M. K. Verma, R. Agrawal, P. K. Yadav and S. Puri, *Nonlinear energy dissipation and transfers in coarsening systems*, Physical Review E 107, 034207 (2023), DOI: 10.1103/PhysRevE.107.034207.
2. P. K. Yadav, M. K. Verma and S. Puri, *Spectral energy transfers in domain growth problems*, Physical Review E 110, 044130 (2024), DOI: 10.1103/PhysRevE.110.044130.

The allocation topic is **Simulating the 1D and 2D TDGL equation**. The submission uses numerically generated initial fields and requires no external dataset.

## Model and numerical correspondence

| Source | Adopted element | Implementation |
| --- | --- | --- |
| [1], Eq. (1); [2], Sec. II B, Eqs. (22)-(23) | Real scalar, nonconserved Model-A equation, φ_t = φ - φ³ + ∇²φ | `src/tdgl_core.py`, RHS functions |
| [2], Eq. (2) | F = integral[-φ²/2 + φ⁴/4 + abs(grad φ)²/2] | Unshifted energy; uniform minimum -volume/4 |
| [2], Sec. III, Eqs. (32)-(33) | Central spatial differences and forward Euler | Periodic three-point / five-point stencils and explicit updates |
| [2], Table I | 1D L=100, N=1024, h=0.09765625, dt=0.001; 2D L=128, 128×128, h=1, dt=0.01 | Full random-run experiment configurations |
| [2], Eq. (35) | dt <= h²/(h² + 2D) | Ordered-state linear stability check |
| [2], Eq. (28) | Exact uniform nonlinear evolution | `audit/temporal_convergence.py` |
| [1], domain-wall discussion | Isolated tanh kink and paired walls | Interior residual benchmark and separate periodic paired-wall trajectory |
| [2], Sec. V B | Hardened sign-field spectral diagnostic | Optional `src/spectra.py` and `audit/save_spectra.py` |

The supplied papers are broader than this project. Only the real, nonconserved TDGL model is implemented. No conserved Model-B solver, external physical dataset, complex superconducting order parameter or electromagnetic field is introduced.

## Implementation-specific numerical audit

The discrete free energy uses **forward-edge differences counted once**, ensuring its gradient is exactly minus the nearest-neighbor RHS times cell volume. Directional-derivative tests verify this correspondence. A centered-gradient-squared diagnostic would give a different discrete operator.

The linear time-step bound is local to ordered states; it is not unconditional nonlinear stability or energy stability. Main-run diagnostics are sampled. `audit/replay_runs.py` independently checks energy at **every** step, tolerating increases no larger than 1e-9.

A single tanh kink is not periodic. Its residual is evaluated only on `[0.2L, 0.8L]` at L=60. A periodic paired-wall field is evolved separately. The pair is an approximate superposition with endpoints at -1 to floating-point precision, not an exact stationary periodic solution.

## Project choices and limits

- Random fields use `default_rng(42)` uniform samples in [-0.05, 0.05]. Zero expectation does not imply an exactly zero finite-sample mean.
- Full random-run endpoints are t=1000 (1D) and t=100 (2D). These are project observation windows. Neither random trajectory is uniformly ordered at its saved endpoint.
- The pair uses x1=46.5, x2=53.5 and R0=7, evolving through t=800. This changed separation makes annihilation visible in a practical run; it is not an exact reproduction of the paper's longer pair example.
- Notebook demonstrations use smaller, explicitly labelled configurations. Their fields must not be substituted for the full-run report results.
- The 2D mesh h=1 is coarse relative to the sqrt(2) wall-width scale. Morphological observations do not establish precise continuum interfacial measurements.
- The homogeneous time-convergence benchmark isolates the temporal method and has no spatial error. It does not establish full 2D space-time convergence.
- No asymptotic domain-growth exponent is measured. Spectral regressions are single-realization finite-window diagnostics; their standard errors exclude seed, window and discretization uncertainty.
- Fourier modal energy, whose sum is mean(φ²)/2, is distinct from the Ginzburg-Landau free energy. The 2D radial modal mean and radial shell sum have different geometric normalization. No nonlinear spectral transfer or flux is measured.

## Retained evidence

`results/raw/` holds generated fields and sampled diagnostics. `results/validation/` holds operator, stability and convergence records. `audit/` contains independent energy-gradient checks, full replay and a fresh complete-driver rerun comparison. See the detailed report for derivations, calculations, actual figures and quantitative conclusions.
