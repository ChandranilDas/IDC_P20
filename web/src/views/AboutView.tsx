import React from 'react';
import { FileText, Presentation, ExternalLink, FileCode } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '840px', margin: '0 auto', lineHeight: 1.6 }}>
      {/* Article Header */}
      <header style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.85rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '0.35rem' }}>
          About Project P20: 1D & 2D TDGL Simulation Laboratory
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
          Theoretical formulation, numerical discretization, and physical dynamics of the real scalar nonconserved
          Time-Dependent Ginzburg–Landau equation (Model A).
        </p>
      </header>

      {/* 1. Physical Foundations */}
      <section className="notebook-panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>1. Physical Model & Phase Ordering Dynamics</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          Project P20 models the kinetics of phase separation in an isotropic Ising ferromagnet quenched rapidly from a high-temperature
          disordered state to below its critical temperature <em>T<sub>c</sub></em>. The system is characterized by a real scalar
          order parameter <code>φ(r, t)</code> representing local coarse-grained magnetization.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          Because total magnetization is not conserved, the dynamics falls into the Hohenberg–Halperin <strong>Model A</strong> class,
          governed by steepest-descent relaxation on the Ginzburg–Landau free energy functional:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          F[φ] = ∫ dᵈr [ -½ φ² + ¼ φ⁴ + ½ |∇φ|² ]
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.5rem' }}>
          The local potential <code>V(φ) = -½ φ² + ¼ φ⁴</code> possesses two symmetric degenerate minima at <code>φ = ±1</code> (ordered states)
          and an unstable local maximum at <code>φ = 0</code>. Taking the functional derivative yields the nonconserved TDGL equation:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          ∂φ/∂t = - δF/δφ = φ - φ³ + ∇²φ
        </div>
      </section>

      {/* 2. Numerical Methodology */}
      <section className="notebook-panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>2. Numerical Architecture & Stencil Discretization</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          Spatial derivatives are approximated on a uniform Cartesian mesh with grid spacings <code>Δx</code> (and <code>Δy</code>)
          using second-order central finite differences under periodic boundary conditions:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          ∇²φ(x_i, y_j) ≈ (φ_{`i+1,j`} - 2φ_{`i,j`} + φ_{`i-1,j`})/Δx² + (φ_{`i,j+1`} - 2φ_{`i,j`} + φ_{`i,j-1`})/Δy²
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.5rem' }}>
          Temporal integration proceeds via an explicit Forward Euler scheme. While continuous Model-A
          relaxation mathematically satisfies monotonic free energy dissipation (<code>dF/dt = -∫ (δF/δφ)² dᵈr ≤ 0</code>),
          explicit Euler discretizations do not guarantee unconditional energy decrease. To guarantee discrete energy decay,
          the integration timestep is constrained by a conservative sufficient monotonicity bound:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          Δt_mono ≤ 1 / [ (3M² - 1) + 2D/(Δx)² ], &nbsp; where &nbsp; M = max(1, |φ₀| + |δφ|)
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.5rem' }}>
          This sufficient monotonicity condition is strictly distinct from the ordered-state linear stability bound
          derived by Yadav et al. (PRE 2024, Eq. 35) around the broken-symmetry ground states <code>φ = ±1</code>:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          Δt_linear ≤ (Δx)² / [ (Δx)² + 2D ]
        </div>
      </section>

      {/* 3. Primary References */}
      <section className="notebook-panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>3. Primary Authoritative References</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          The mathematical formulations, validation benchmarks, and spectral scaling laws implemented in this laboratory
          directly cite peer-reviewed research in <em>Physical Review E</em>:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
          <div style={{ borderLeft: '2px solid var(--forest)', paddingLeft: '0.75rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
              1. Nonlinear energy dissipation and transfers in coarsening systems
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
              Mahendra K. Verma, Ramgopal Agrawal, Pradeep Kumar Yadav, and Sanjay Puri
            </div>
            <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
              <em>Physical Review E</em> <strong>107</strong>, 034207 (2023).
            </div>
            <a
              href="https://doi.org/10.1103/PhysRevE.107.034207"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--forest)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontSize: '0.75rem' }}
            >
              https://doi.org/10.1103/PhysRevE.107.034207 <ExternalLink size={11} />
            </a>
          </div>

          <div style={{ borderLeft: '2px solid var(--forest)', paddingLeft: '0.75rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
              2. Spectral energy transfers in domain growth problems
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '0.78rem' }}>
              Pradeep Kumar Yadav, Mahendra Kumar Verma, and Sanjay Puri
            </div>
            <div style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
              <em>Physical Review E</em> <strong>110</strong>, 044130 (2024).
            </div>
            <a
              href="https://doi.org/10.1103/PhysRevE.110.044130"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--forest)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontSize: '0.75rem' }}
            >
              https://doi.org/10.1103/PhysRevE.110.044130 <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </section>

      {/* 4. Research Deliverables */}
      <section className="notebook-panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>4. Project Documentation & Deliverables</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          Comprehensive technical report, presentation deck, and executable simulation notebook for Project P20:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href="/downloads/P20_Detailed_Report.pdf"
            download="P20_Detailed_Report.pdf"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={14} color="var(--forest)" />
            <span>Detailed Report (.pdf)</span>
          </a>
          <a
            href="/downloads/P20_Detailed_Report.md"
            download="P20_Detailed_Report.md"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={14} color="var(--forest)" />
            <span>Report Source (.md)</span>
          </a>
          <a
            href="/downloads/P20_Final.pptx"
            download="P20_Final.pptx"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Presentation size={14} color="var(--forest)" />
            <span>Final Presentation (.pptx)</span>
          </a>
          <a
            href="/downloads/P20_Simulations.ipynb"
            download="P20_Simulations.ipynb"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <FileCode size={14} color="var(--forest)" />
            <span>Simulation Notebook (.ipynb)</span>
          </a>
        </div>

      </section>

      {/* 5. Physical & Numerical Limitations */}
      <section className="notebook-panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>5. Numerical & Physical Limitations</h2>
        <ul style={{ fontSize: '0.825rem', color: 'var(--ink-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>
            <strong>Non-Periodicity of Single Kink:</strong> The continuous 1D analytical kink profile <code>tanh((x - x₀)/√2)</code> connects
            <code>φ = -1</code> to <code>φ = +1</code> and is non-periodic. On a periodic mesh, spatial truncation convergence is evaluated
            strictly on the interior sub-domain <code>[0.2L, 0.8L]</code>, while periodic defect annihilation is studied via kink–antikink pairs.
          </li>
          <li>
            <strong>Initial Perturbations & Random Seeds:</strong> Random quench simulations initiate from small random perturbations with zero expectation
            (<code>|δφ| ≤ 0.05</code>) about the disordered state; individual finite samples need not have exactly zero mean.
            Custom seeds generate independent pseudorandom initial configurations across different grid sizes and dimensions.
          </li>
          <li>
            <strong>Observation Windows & Extended Trajectories:</strong> In the interactive Simulation Lab, observation durations
            (<code>t = 40</code> in 1D, <code>t = 25</code> in 2D) are bounded to maintain responsive client-side performance under the
            50,000,000 cell-step work budget. Extended trajectories (<code>t = 1000</code> in 1D, <code>t = 100</code> in 2D) are provided
            in Saved Results to examine late-stage domain coarsening and optional spectral diagnostics.
          </li>
          <li>
            <strong>Explicit Timestep & Monotonicity Constraints:</strong> Explicit Forward Euler does not provide an unconditional nonlinear
            energy dissipation guarantee. While the continuous Model-A equation satisfies <code>dF/dt ≤ 0</code> everywhere, discrete Euler
            integration satisfies monotonic energy dissipation under the conservative sufficient condition <code>Δt ≤ 1 / [ (3M² - 1) + 2D/(Δx)² ]</code>,
            assuming <code>M ≥ 1</code> and the field remains bounded by <code>|φ| ≤ M</code>. This condition is more stringent than the ordered-state
            linear stability bound <code>Δt &lt; (Δx)² / [ (Δx)² + 2D ]</code> (Yadav et al. 2024 Eq. 35) around <code>φ = ±1</code>.
          </li>
        </ul>
      </section>
    </article>
  );
};
