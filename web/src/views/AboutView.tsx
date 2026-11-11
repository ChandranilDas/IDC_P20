import React from 'react';
import { FileText, Presentation, ExternalLink } from 'lucide-react';

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
          Temporal integration proceeds via an explicit Forward Euler scheme. To avoid unphysical numerical oscillations
          and blow-up across domain walls, the integration timestep is constrained by a conservative monotonicity bound:
        </p>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: '0.5rem 0' }}>
          Δt ≤ 1 / [ 3M² - 1 + 2D/(Δx)² ], &nbsp; where &nbsp; M = max(1, |φ₀| + |δφ|)
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
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>4. Audited Deliverable Downloads</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem' }}>
          Original audited reports and progress presentations produced during Project P20:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href="/downloads/P20_Technical_Report.pdf"
            download="P20_Technical_Report.pdf"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={14} color="var(--forest)" />
            <span>Technical Report (.pdf)</span>
          </a>
          <a
            href="/downloads/P20_Technical_Report.md"
            download="P20_Technical_Report.md"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={14} color="var(--forest)" />
            <span>Report Source (.md)</span>
          </a>
          <a
            href="/downloads/P20_Progress_Presentation.pptx"
            download="P20_TDGL_Progress_Presentation.pptx"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Presentation size={14} color="var(--forest)" />
            <span>Progress Presentation (.pptx)</span>
          </a>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: '0.65rem', fontStyle: 'italic' }}>
          Notice: Download files provide our original audited project artifacts. In accordance with academic licensing,
          the journal source articles (Verma et al. 2023, Yadav et al. 2024) are linked directly via their APS DOIs above.
        </p>
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
            <strong>PRNG Differences:</strong> Live interactive browser simulations employ a deterministic 32-bit Mulberry32 algorithm for cross-browser reproducibility,
            which generates distinct random initial fields from NumPy's <code>default_rng</code> (PCG64) used in the Python pipeline. Authoritative NumPy reference runs are preserved in the Saved Results view.
          </li>
          <li>
            <strong>Explicit Timestep Constraints:</strong> Explicit Forward Euler requires <code>Δt &lt; (Δx)² / 2D</code> to prevent diffusion instability.
            For fine grids, this limits browser demo runs to <code>t ≤ 25–40</code> within a 50M cell-step budget.
          </li>
        </ul>
      </section>
    </article>
  );
};
