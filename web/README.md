# TDGL Numerical Simulation Web Laboratory (Project P20)

Interactive scientific web application for simulating and analyzing the 1D and 2D real scalar nonconserved Time-Dependent Ginzburg–Landau (TDGL) equation (Model A).

Built with **Vite + React + TypeScript**. Designed as an editorial **scientific field notebook**—warm off-white paper (`#f5f3ed`), near-black ink (`#20241f`), fine hairlines (`#d8d8cd`), and deep forest green accents (`#315646`), replacing generic SaaS templates with an authentic scientific worksheet ledger. The numerical simulation engine runs in a dedicated background **Web Worker** using typed `Float64Array` buffers, keeping the main thread responsive during iterative numerical integration.

---

## 1. Architecture & Core Views

The application provides four dedicated views:

- **Simulation Lab**:
  - Live numerical integration of the real scalar Model-A TDGL equation $\partial_t \phi = \phi - \phi^3 + \nabla^2\phi$ using explicit Forward Euler and central finite differences under periodic boundary conditions.
  - Interactive 1D line chart and 2D heatmap canvas with a scientific diverging colormap matching Python coordinate orientation ($y$ vertical with $y=0$ at bottom, $x$ horizontal).
  - Continuous physical diagnostics: free energy $F(t)$, order parameter mean $\langle\phi\rangle$, mean-square $\langle\phi^2\rangle$, $\min\phi$, and $\max\phi$.
  - Bounded snapshot history buffer with timeline scrubber and step-by-step playback.
  - Interactive point-wise numerical update inspector: reveals local $\phi$, periodic stencil neighbors, non-linear reaction $(\phi - \phi^3)$, discrete Laplacian $\nabla^2\phi$, total RHS, Euler increment $\Delta t \cdot \text{RHS}$, and predicted next step. Distinguishes single Euler updates ($\Delta t$) from non-uniform snapshot intervals ($\Delta t_{\text{next\_frame}}$).
  - Export capabilities: JSON field snapshot + active config, CSV diagnostics time series, and reliable canvas PNG capture via Blob delivery.
  - *Note on Presets*: Browser live simulation presets are calibrated as short interactive demonstrations (1D random quench $t=40$, 2D domain coarsening $t=25$, 1D kink pair $t=40$) to stay safely within browser execution and memory budgets. Full long-duration simulations are provided in the Saved Results view.

- **Saved Results**:
  - Full-resolution Float64 binary datasets (`.bin`) exported directly from audited Python simulations, preserving complete spatial grids ($1024$ in 1D, $128 \times 128$ in 2D), non-uniform snapshot times, and SHA-256 cryptographic provenance.
  - Contains authoritative reference trajectories: 1D random quench ($t=0 \to 1000$), 2D domain coarsening ($t=0 \to 100$), and 1D kink-antikink annihilation ($t=0 \to 800$, $R_0=7.0$).
  - Full inspection and diagnostic playback work directly on saved reference runs without re-running simulations.

- **Validation**:
  - Authoritative presentation of the 6 core numerical and physical validation pillars derived from audited Python runs:
    1. Energy monotonicity across 1.81 million replayed integration steps ($0$ violations $> 10^{-9}$).
    2. Discrete gradient-flow consistency ($|\langle \delta F/\delta\phi, v \rangle - dF/d\epsilon| \le 1.1 \times 10^{-8}$).
    3. Analytical kink spatial truncation convergence ($p = 1.99$).
    4. Temporal convergence under timestep halving ($p_t = 0.9986$).
    5. 2D Fourier eigenmode invariance (residual $3.82 \times 10^{-13}$).
    6. Finite-window spectral power-law fits ($k^{-2.06}$ in 1D, $k^{-3.02}$ in 2D) consistent with Porod scaling tails.

- **About**:
  - Physical Model-A TDGL equation, double-well potential $V(\phi) = -\frac{1}{2}\phi^2 + \frac{1}{4}\phi^4$, and reference links with DOI citations:
    - Verma et al., *Phys. Rev. E* 107, 034207 (2023) [DOI: 10.1103/PhysRevE.107.034207](https://doi.org/10.1103/PhysRevE.107.034207)
    - Yadav et al., *Phys. Rev. E* 110, 044130 (2024) [DOI: 10.1103/PhysRevE.110.044130](https://doi.org/10.1103/PhysRevE.110.044130)
  - Computational architecture, physical limitations, transparency note on AI pair-programming, and report/slides download links.

---

## 2. Input Validation & Work Budget Enforcements

All numeric inputs are handled as raw draft strings and parsed strictly without silent truncation (`parseInt`) or fallback defaults (`||`):
- **Work Budget Cap**: Total computation is bounded by $\text{cells} \times \text{steps} \le 50,000,000$ (50M cell-steps), preventing excessive client resource usage.
- **Memory Bounding**: Active simulation history is capped at $300$ snapshots (`MAX_SNAPSHOTS = 300`) using strided retention to prevent memory exhaustion.
- **Conservative Stability Bound**: Enforces $\Delta t \le 1 / [3M^2 - 1 + 2D/(\Delta x)^2]$ where $M = \max(1, |\phi_0| + \eta)$, guarding against numerical blowup.
- **Integer & Range Enforcement**: Seed is strictly validated as an unsigned 32-bit integer $[0, 4294967295]$. Fractional seeds (e.g., `1.5`) are visibly rejected without truncation. System size $L > 0$, grid size $N \in [16, 2048]$ (1D) or $[16, 256]$ (2D), initial bias $|\phi_0| \le 1.0$, and noise amplitude $|\delta\phi| \le 0.5$.
- **Atomic Association & Error Boundary**: Prevents dimension-mismatch render crashes across 1D/2D switches and encapsulates views in a recoverable React Error Boundary.

---

## 3. Test Suites & Verification

The codebase is verified across both TypeScript and Python test suites:

### Vitest Suite (TypeScript) — 70 Tests Passing

Fourteen independent acceptance tests (7 mounted UI interaction tests and 7 scientific evidence integrity tests) exercise actual controls, delayed worker messages, initialization gating, resizing, restart, error recovery, saved-dataset loading, and strict validation evidence rendering without fabricated fallbacks or premature passes on incomplete data.
```bash
cd web
npm test
```
- **Stencils & Numerical Parity**: Exact agreement within $10^{-12}$ against audited Python fixtures for 1D and 2D Forward Euler steps, discrete Laplacians, and rectangular unequal-spacing grids ($N_x \ne N_y$, $\Delta x \ne \Delta y$).
- **Analytical Fixed Points & Periodic Wrap**: Invariance of $\phi = \pm 1$ and boundary wrapping.
- **Energy Monotonicity**: Verifies step-by-step free energy decay on multi-step trajectories.
- **Input Validation**: Rejection of decimals in integers, empty inputs, negative values, and budget exceedances without silent fallback.
- **Worker Cadence & Lifecycle**: Atomic message filtering, non-snapshot progress reporting, and pause/reset acknowledgments.
- **Transitions & Error Boundary**: 1D $\leftrightarrow$ 2D state transitions, shape mismatch guards, defensive inspector formatting, and mounted error boundary recovery.
- **Physical Geometry & Mobile Transport**: Shared plot-bounds computation ensuring identical geometry between canvas drawing and pointer-to-grid mapping; square 2D stage with aligned colorbar; and single workspace transport toolbar placed before field/inspector for mobile usability.
- **Mounted Component Acceptance**: Testing Library + JSDOM acceptance suite verifying real mounted `SimulationLab` and `SavedResultsView` lifecycles, delayed obsolete worker messages, coordinate clamping on grid resize, start gating until initialization acknowledgement, and completed-run "Run Again" restarts.
- **Scientific Evidence Integrity**: Verification that empty or failed evidence responses never report fabricated numbers or passing statuses, that real failed energy/derivative evidence visibly fails, and that spectral fits remain descriptive rather than proof of universal scaling laws.

### Pytest Suite (Python) — 13 Tests Passing
```bash
.venv/bin/pytest tests/test_tdgl.py -v
```
- Directional derivative gradient-flow verification, analytical kink spatial truncation order, timestep convergence, stability bounds, Parseval spectral conservation, and 1.81 million step replay validation.

---

## 4. Local Installation & Development

### Reproducible Clean Install
```bash
cd web
npm ci
```

### Run Local Development Server
```bash
npm run dev
```
Serves the application locally at `http://127.0.0.1:5173`.

### Production Build & Typecheck
```bash
npm run build
```
Executes strict TypeScript check (`tsc --noEmit`) and Vite production bundle into `dist/`.

> **Note**: For local development, QA, and auditing only. Do not publish or deploy.

---

## 5. Deployment Configuration (When Authorized)

When deploying this project to Vercel:
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework Preset**: `Vite`

Configuration file is provided at `web/vercel.json`.

---

## 6. Portfolio & Curriculum Vitae (CV) Summary

```text
Project P20: 1D & 2D Time-Dependent Ginzburg–Landau (TDGL) Numerical Simulation & Interactive Laboratory
• Implemented and verified the real scalar nonconserved Model-A TDGL equation in 1D and 2D using explicit Forward Euler and central finite-difference stencils under periodic boundary conditions.
• Formulated an exact forward-edge discrete Ginzburg–Landau free energy functional guaranteed to match the discrete Laplacian under functional differentiation (directional derivative mismatch ≤ 1.1 × 10⁻⁸).
• Validated numerical accuracy across 1.81 million replayed integration steps (0 free energy violations above 10⁻⁹), confirming quadratic spatial convergence (p = 1.99), first-order temporal convergence (p = 0.9986), and descriptive finite-window spectral scaling fits (k⁻²·⁰⁶ in 1D, k⁻³·⁰² in 2D matching Porod tails).
• Engineered an interactive static web application (React, TypeScript, Vite) featuring non-blocking Web Worker integration (Float64Array), live physical diagnostics, an interactive finite-difference inspector, and lazy-loaded Float64 binary datasets exported from audited Python simulations.
```

## Published links

- [Live laboratory](https://idc-p20.vercel.app)
- [Source repository](https://github.com/ChandranilDas/IDC_P20)
- [CV summary and verification evidence](../docs/PORTFOLIO.md)
