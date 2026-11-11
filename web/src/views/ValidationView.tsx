import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface AuditEvidence {
  validation_summary?: {
    fixed_points?: any;
    kink_convergence?: {
      evaluation_domain?: string;
      N_list?: number[];
      dx?: number[];
      l2_errors?: number[];
      linf_errors?: number[];
      p_l2?: number;
      p_linf?: number;
    };
    directional_derivative?: {
      '1D_relative_mismatch'?: number;
      '1D_passed'?: boolean;
      '2D_relative_mismatch'?: number;
      '2D_passed'?: boolean;
    };
    temporal_convergence?: {
      dt1?: number;
      err1?: number;
      dt2?: number;
      err2?: number;
      measured_order?: number;
      expected_order?: number;
    };
    fourier_eigenmode_2d?: {
      max_eigenvalue_residual?: number;
      exact_eigenvalue?: number;
      continuum_eigenvalue?: number;
      passed?: boolean;
    };
    free_energy_1d?: any;
    free_energy_2d?: any;
    stability?: any;
    spectra?: any;
  };
  independent_full_replay?: {
    tdgl_1d_random?: {
      steps?: number;
      max_energy_increase?: number;
      'energy_violations_above_1e-9'?: number;
      max_saved_field_discrepancy?: number;
      final_energy?: number;
      finite?: boolean;
      elapsed_seconds?: number;
      passed?: boolean;
    };
    tdgl_2d_random?: {
      steps?: number;
      max_energy_increase?: number;
      'energy_violations_above_1e-9'?: number;
      max_saved_field_discrepancy?: number;
      final_energy?: number;
      finite?: boolean;
      elapsed_seconds?: number;
      passed?: boolean;
    };
    tdgl_1d_kink_antikink?: {
      steps?: number;
      max_energy_increase?: number;
      'energy_violations_above_1e-9'?: number;
      max_saved_field_discrepancy?: number;
      final_energy?: number;
      finite?: boolean;
      elapsed_seconds?: number;
      passed?: boolean;
    };
  };
  independent_temporal_convergence?: {
    '1D'?: {
      dt?: number[];
      max_errors?: number[];
      fitted_order?: number;
      passed?: boolean;
    };
    '2D'?: {
      dt?: number[];
      max_errors?: number[];
      fitted_order?: number;
      passed?: boolean;
    };
  };
  spectral_fits?: {
    '1D_hardened'?: {
      exponent?: number;
      stderr?: number;
      r_squared?: number;
      k_range?: number[];
      fit_window?: string;
      theoretical_porod?: number;
    };
    '2D_hardened_modal'?: {
      exponent?: number;
      stderr?: number;
      r_squared?: number;
      k_range?: number[];
      fit_window?: string;
      theoretical_porod?: number;
    };
    '2D_hardened'?: {
      exponent?: number;
      stderr?: number;
      r_squared?: number;
      k_range?: number[];
      fit_window?: string;
      theoretical_porod?: number;
    };
  };
}

/** Strictly validates a full replay trajectory object for finite real values and required flags */
function isValidReplayRun(run: any): boolean {
  if (!run || typeof run !== 'object') return false;
  return (
    typeof run.steps === 'number' && Number.isFinite(run.steps) && run.steps > 0 &&
    typeof run.final_energy === 'number' && Number.isFinite(run.final_energy) &&
    run.finite === true &&
    typeof run['energy_violations_above_1e-9'] === 'number' &&
    Number.isFinite(run['energy_violations_above_1e-9']) &&
    run['energy_violations_above_1e-9'] >= 0 &&
    typeof run.max_saved_field_discrepancy === 'number' &&
    Number.isFinite(run.max_saved_field_discrepancy) &&
    typeof run.max_energy_increase === 'number' &&
    Number.isFinite(run.max_energy_increase) &&
    typeof run.passed === 'boolean'
  );
}

export const ValidationView: React.FC = () => {
  const [evidence, setEvidence] = useState<AuditEvidence | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = () => {
    setLoading(true);
    setError(null);
    fetch('/generated/audit_evidence.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load audit_evidence.json`);
        return res.json();
      })
      .then((data: AuditEvidence) => {
        setEvidence(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch audit evidence');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  if (loading) {
    return (
      <div className="notebook-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-secondary)' }}>
        <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Loading scientific validation records and independent audit evidence...</p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="notice-box notice-error" style={{ padding: '1.5rem', margin: '0 auto', maxWidth: '640px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Failed to Load Audit Evidence</div>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          {error || 'Audit evidence record could not be loaded from /generated/audit_evidence.json.'}
        </p>
        <div style={{ marginTop: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchEvidence}>
            <RefreshCw size={12} /> Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const replay = evidence.independent_full_replay;
  const tempConv = evidence.independent_temporal_convergence;
  const dd = evidence.validation_summary?.directional_derivative;
  const eig = evidence.validation_summary?.fourier_eigenmode_2d;
  const spec = evidence.spectral_fits;
  const kinkConv = evidence.validation_summary?.kink_convergence;

  // 1. Strict validation of replay evidence
  const valid1D = isValidReplayRun(replay?.tdgl_1d_random);
  const valid2D = isValidReplayRun(replay?.tdgl_2d_random);
  const validPair = isValidReplayRun(replay?.tdgl_1d_kink_antikink);
  const hasReplay = valid1D && valid2D && validPair;

  const totalViolations = hasReplay
    ? replay!.tdgl_1d_random!['energy_violations_above_1e-9']! +
      replay!.tdgl_2d_random!['energy_violations_above_1e-9']! +
      replay!.tdgl_1d_kink_antikink!['energy_violations_above_1e-9']!
    : null;

  const totalStepsAudited = hasReplay
    ? replay!.tdgl_1d_random!.steps! +
      replay!.tdgl_2d_random!.steps! +
      replay!.tdgl_1d_kink_antikink!.steps!
    : null;

  // Pillar 1: Energy Monotonicity
  let p1Status: string = 'Unavailable';
  if (hasReplay) {
    const passed =
      replay!.tdgl_1d_random!.passed === true &&
      replay!.tdgl_2d_random!.passed === true &&
      replay!.tdgl_1d_kink_antikink!.passed === true &&
      totalViolations === 0 &&
      replay!.tdgl_1d_random!.max_saved_field_discrepancy! <= 1e-9 &&
      replay!.tdgl_2d_random!.max_saved_field_discrepancy! <= 1e-9 &&
      replay!.tdgl_1d_kink_antikink!.max_saved_field_discrepancy! <= 1e-9 &&
      replay!.tdgl_1d_random!.max_energy_increase! <= 1e-9 &&
      replay!.tdgl_2d_random!.max_energy_increase! <= 1e-9 &&
      replay!.tdgl_1d_kink_antikink!.max_energy_increase! <= 1e-9;
    p1Status = passed ? 'Pass' : 'Failed (Tolerances Exceeded)';
  }

  // Pillar 2: Gradient-Flow Consistency (Requires explicit boolean flags and real numbers)
  const hasDd = Boolean(
    dd &&
    typeof dd['1D_passed'] === 'boolean' &&
    typeof dd['2D_passed'] === 'boolean' &&
    typeof dd['1D_relative_mismatch'] === 'number' &&
    Number.isFinite(dd['1D_relative_mismatch']) &&
    dd['1D_relative_mismatch'] >= 0 &&
    typeof dd['2D_relative_mismatch'] === 'number' &&
    Number.isFinite(dd['2D_relative_mismatch']) &&
    dd['2D_relative_mismatch'] >= 0
  );
  let p2Status: string = 'Unavailable';
  if (hasDd) {
    const passed =
      dd!['1D_passed'] === true &&
      dd!['2D_passed'] === true &&
      dd!['1D_relative_mismatch']! <= 1e-6 &&
      dd!['2D_relative_mismatch']! <= 1e-6;
    p2Status = passed ? 'Pass' : 'Failed (Mismatch Exceeded)';
  }

  // Pillar 3: Spatial Truncation
  const hasKink = Boolean(
    kinkConv &&
    typeof kinkConv.p_l2 === 'number' &&
    Number.isFinite(kinkConv.p_l2) &&
    typeof kinkConv.p_linf === 'number' &&
    Number.isFinite(kinkConv.p_linf) &&
    Array.isArray(kinkConv.N_list) &&
    kinkConv.N_list.length > 0 &&
    Array.isArray(kinkConv.dx) &&
    kinkConv.dx.length > 0 &&
    Array.isArray(kinkConv.l2_errors) &&
    kinkConv.l2_errors.length > 0 &&
    Array.isArray(kinkConv.linf_errors) &&
    kinkConv.linf_errors.length > 0
  );
  let p3Status: string = 'Unavailable';
  if (hasKink) {
    const passed = kinkConv!.p_l2! >= 1.95 && kinkConv!.p_linf! >= 1.95;
    p3Status = passed ? 'Pass' : 'Failed (Order Low)';
  }

  // Pillar 4: Temporal Convergence (Requires explicit boolean flags and fitted orders)
  const hasTemp = Boolean(
    tempConv &&
    tempConv['1D'] &&
    tempConv['2D'] &&
    typeof tempConv['1D'].passed === 'boolean' &&
    typeof tempConv['2D'].passed === 'boolean' &&
    typeof tempConv['1D'].fitted_order === 'number' &&
    Number.isFinite(tempConv['1D'].fitted_order) &&
    typeof tempConv['2D'].fitted_order === 'number' &&
    Number.isFinite(tempConv['2D'].fitted_order)
  );
  let p4Status: string = 'Unavailable';
  if (hasTemp) {
    const passed =
      tempConv!['1D']!.passed === true &&
      tempConv!['2D']!.passed === true &&
      tempConv!['1D']!.fitted_order! >= 0.95 &&
      tempConv!['2D']!.fitted_order! >= 0.95;
    p4Status = passed ? 'Pass' : 'Failed';
  }

  // Pillar 5: 2D Fourier Invariance (Requires explicit passed flag and finite residual)
  const hasEig = Boolean(
    eig &&
    typeof eig.passed === 'boolean' &&
    typeof eig.max_eigenvalue_residual === 'number' &&
    Number.isFinite(eig.max_eigenvalue_residual) &&
    eig.max_eigenvalue_residual >= 0
  );
  let p5Status: string = 'Unavailable';
  if (hasEig) {
    const passed = eig!.passed === true && eig!.max_eigenvalue_residual! <= 1e-11;
    p5Status = passed ? 'Pass' : 'Failed';
  }

  // Row 6: Spectral Porod Tails (Always descriptive/informational, never claimed as Pass/Fail)
  const hasSpec = Boolean(
    spec &&
    ((typeof spec['1D_hardened']?.exponent === 'number' && Number.isFinite(spec['1D_hardened'].exponent)) ||
     (typeof (spec['2D_hardened_modal']?.exponent ?? spec['2D_hardened']?.exponent) === 'number' &&
      Number.isFinite(spec['2D_hardened_modal']?.exponent ?? spec['2D_hardened']?.exponent)))
  );
  const p6Status = hasSpec ? 'Descriptive' : 'Unavailable';

  // Overall acceptance badge
  const allPhysicalVerified =
    p1Status === 'Pass' &&
    p2Status === 'Pass' &&
    p3Status === 'Pass' &&
    p4Status === 'Pass' &&
    p5Status === 'Pass';

  const anyFailed =
    p1Status.startsWith('Failed') ||
    p2Status.startsWith('Failed') ||
    p3Status.startsWith('Failed') ||
    p4Status.startsWith('Failed') ||
    p5Status.startsWith('Failed');

  const renderStatusCell = (status: string) => {
    if (status === 'Pass') {
      return <span style={{ color: 'var(--forest)', fontWeight: 600 }}>Pass</span>;
    }
    if (status.startsWith('Failed')) {
      return <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{status}</span>;
    }
    if (status === 'Descriptive') {
      return <span style={{ color: 'var(--ink-secondary)', fontStyle: 'italic', fontWeight: 500 }}>Descriptive</span>;
    }
    return <span style={{ color: 'var(--ink-muted)' }}>Unavailable</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Editorial View Header */}
      <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '0.2rem' }}>
          Numerical & Physical Validation Evidence
        </h1>
        <p style={{ fontSize: '0.825rem', color: 'var(--ink-secondary)' }}>
          Direct quantitative evidence from {totalStepsAudited !== null ? totalStepsAudited.toLocaleString() : '—'} replayed Forward Euler integration steps,
          continuum spatial truncation limits, temporal order, Fourier eigenmode residuals, and descriptive spectral Porod scaling fits.
        </p>
      </div>

      {/* Primary Master Evidence Table */}
      <div className="notebook-panel">
        <div className="notebook-panel-header">
          <div className="notebook-panel-title">Table 1: Master Validation Matrix & Acceptance Thresholds</div>
          <div style={{ fontSize: '0.75rem' }}>
            {allPhysicalVerified ? (
              <span style={{ color: 'var(--forest)', fontWeight: 600 }}>All 5 Physical Criteria Satisfied (Pillar 6 Descriptive)</span>
            ) : anyFailed ? (
              <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>Tolerances Exceeded</span>
            ) : (
              <span style={{ color: 'var(--ink-secondary)', fontWeight: 500 }}>Audit Evidence Incomplete</span>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Validation Pillar</th>
                <th style={{ width: '28%' }}>Mathematical Formulation</th>
                <th style={{ width: '20%' }}>Acceptance Criterion</th>
                <th style={{ width: '18%' }}>Observed Result</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Energy Monotonicity</strong></td>
                <td>Every-step free energy dissipation: <code>dF/dt ≤ 0</code></td>
                <td><code>ΔF ≤ 10⁻⁹</code> per step</td>
                <td className="ledger-num">
                  {totalStepsAudited !== null ? `${totalViolations} violations / ${totalStepsAudited.toLocaleString()} steps` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p1Status)}</td>
              </tr>
              <tr>
                <td><strong>2. Gradient-Flow Consistency</strong></td>
                <td>Forward-edge directional derivative: <code>⟨δF/δφ, v⟩ = dF/dε</code></td>
                <td>Relative mismatch <code>≤ 10⁻⁶</code></td>
                <td className="ledger-num">
                  {hasDd ? (
                    <>
                      1D: {dd!['1D_relative_mismatch']!.toExponential(2)}<br />
                      2D: {dd!['2D_relative_mismatch']!.toExponential(2)}
                    </>
                  ) : (
                    '1D: — / 2D: —'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p2Status)}</td>
              </tr>
              <tr>
                <td><strong>3. Spatial Truncation</strong></td>
                <td>Analytical kink truncation: <code>tanh((x - x₀)/√2)</code> on <code>[0.2L, 0.8L]</code></td>
                <td>Order <code>p ≥ 1.95</code> (2nd order)</td>
                <td className="ledger-num">
                  {hasKink ? (
                    <>
                      L₂: p = {kinkConv!.p_l2!.toFixed(2)}<br />
                      L_∞: p = {kinkConv!.p_linf!.toFixed(2)}
                    </>
                  ) : (
                    'L₂: — / L_∞: —'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p3Status)}</td>
              </tr>
              <tr>
                <td><strong>4. Temporal Convergence</strong></td>
                <td>Timestep halving error ratio: <code>log₂(E(Δt)/E(Δt/2))</code></td>
                <td>Order <code>p_t ≥ 0.95</code> (1st order)</td>
                <td className="ledger-num">
                  {hasTemp ? (
                    <>
                      1D: p_t = {tempConv!['1D']!.fitted_order!.toFixed(4)}<br />
                      2D: p_t = {tempConv!['2D']!.fitted_order!.toFixed(4)}
                    </>
                  ) : (
                    '1D: — / 2D: —'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p4Status)}</td>
              </tr>
              <tr>
                <td><strong>5. 2D Fourier Invariance</strong></td>
                <td>Discrete Laplacian eigenmode: <code>cos(kx*x + ky*y)</code> on periodic mesh</td>
                <td>Max residual <code>≤ 10⁻¹¹</code></td>
                <td className="ledger-num">
                  {hasEig ? eig!.max_eigenvalue_residual!.toExponential(2) : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p5Status)}</td>
              </tr>
              <tr>
                <td><strong>6. Spectral Porod Tails</strong></td>
                <td>Finite-window isotropic power spectrum: <code>E(k) ~ k⁻ⁿ</code></td>
                <td>Descriptive single-realization fit</td>
                <td className="ledger-num">
                  {hasSpec ? (
                    <>
                      1D: k^{spec!['1D_hardened']?.exponent !== undefined ? spec!['1D_hardened']!.exponent!.toFixed(2) : '—'}<br />
                      2D: k^{(spec!['2D_hardened_modal']?.exponent ?? spec!['2D_hardened']?.exponent) !== undefined ? (spec!['2D_hardened_modal']?.exponent ?? spec!['2D_hardened']?.exponent)!.toFixed(2) : '—'}
                    </>
                  ) : (
                    '1D: — / 2D: —'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{renderStatusCell(p6Status)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Replay Details Panel */}
        <div className="notebook-panel">
          <div className="notebook-panel-header">
            <div className="notebook-panel-title">1. Independent Replay Step Breakdown</div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.65rem' }}>
            Numerical replay of every Forward Euler step against archived Python reference trajectories within floating-point tolerance (acceptance threshold <code>≤ 10⁻⁹</code>).
            Energy increases above <code>10⁻⁹</code> are treated as numerical descent violations.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Trajectory</th>
                  <th>Audited Steps</th>
                  <th>Final F</th>
                  <th style={{ textAlign: 'right' }}>Violations</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1D Random Quench</td>
                  <td className="ledger-num">{valid1D ? replay!.tdgl_1d_random!.steps!.toLocaleString() : '—'}</td>
                  <td className="ledger-num">{valid1D ? replay!.tdgl_1d_random!.final_energy!.toFixed(4) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="ledger-num">
                    {valid1D ? (
                      <span style={{ color: replay!.tdgl_1d_random!['energy_violations_above_1e-9'] === 0 ? 'var(--forest)' : 'var(--terracotta)', fontWeight: 600 }}>
                        {replay!.tdgl_1d_random!['energy_violations_above_1e-9']}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
                <tr>
                  <td>2D Domain Coarsening</td>
                  <td className="ledger-num">{valid2D ? replay!.tdgl_2d_random!.steps!.toLocaleString() : '—'}</td>
                  <td className="ledger-num">{valid2D ? replay!.tdgl_2d_random!.final_energy!.toFixed(4) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="ledger-num">
                    {valid2D ? (
                      <span style={{ color: replay!.tdgl_2d_random!['energy_violations_above_1e-9'] === 0 ? 'var(--forest)' : 'var(--terracotta)', fontWeight: 600 }}>
                        {replay!.tdgl_2d_random!['energy_violations_above_1e-9']}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
                <tr>
                  <td>1D Kink-Antikink Annihilation</td>
                  <td className="ledger-num">{validPair ? replay!.tdgl_1d_kink_antikink!.steps!.toLocaleString() : '—'}</td>
                  <td className="ledger-num">{validPair ? replay!.tdgl_1d_kink_antikink!.final_energy!.toFixed(4) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="ledger-num">
                    {validPair ? (
                      <span style={{ color: replay!.tdgl_1d_kink_antikink!['energy_violations_above_1e-9'] === 0 ? 'var(--forest)' : 'var(--terracotta)', fontWeight: 600 }}>
                        {replay!.tdgl_1d_kink_antikink!['energy_violations_above_1e-9']}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Spatial Truncation Table */}
        <div className="notebook-panel">
          <div className="notebook-panel-header">
            <div className="notebook-panel-title">2. Spatial Truncation Order on Analytical Kink</div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.65rem' }}>
            The 1D analytical stationary kink profile <code>φ(x) = tanh((x - x₀)/√2)</code> satisfies{' '}
            <code>d²φ/dx² + φ - φ³ = 0</code>. Truncation error is evaluated on interior domain <code>[0.2L, 0.8L]</code>.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Resolution N</th>
                  <th>Spacing Δx</th>
                  <th>L₂ Error</th>
                  <th style={{ textAlign: 'right' }}>L_∞ Error</th>
                </tr>
              </thead>
              <tbody>
                {hasKink ? (
                  kinkConv!.N_list!.map((nVal, idx) => (
                    <tr key={nVal}>
                      <td className="ledger-num">{nVal}</td>
                      <td className="ledger-num">{kinkConv!.dx![idx]?.toFixed(4) ?? '—'}</td>
                      <td className="ledger-num">{kinkConv!.l2_errors![idx]?.toExponential(3) ?? '—'}</td>
                      <td style={{ textAlign: 'right' }} className="ledger-num">{kinkConv!.linf_errors![idx]?.toExponential(3) ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '0.75rem' }}>
                      Spatial convergence audit data unavailable
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: hasKink ? 'var(--forest)' : 'var(--ink-muted)', fontWeight: 500 }}>
            {hasKink
              ? `Observed asymptotic convergence rate: p_L₂ = ${kinkConv!.p_l2!.toFixed(2)} (expected 2.00).`
              : 'Convergence rate data unavailable.'}
          </div>
        </div>
      </div>

      {/* Discrete Gradient Flow & Discrete Laplacian Eigenmode */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Discrete Gradient Flow Derivation */}
        <div className="notebook-panel">
          <div className="notebook-panel-header">
            <div className="notebook-panel-title">3. Forward-Edge Discrete Gradient Flow</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p>
              To ensure that the discrete temporal gradient descent matches the nearest-neighbor discrete Laplacian,
              the discrete free energy functional is defined using forward spatial differences:
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              F_discrete[φ] = ΔV ∑ [ -φ²/2 + φ⁴/4 + 0.5 ∑_α ((Δ⁺_α φ)/Δx_α)² ]
            </div>
            <p>
              Under an arbitrary perturbation direction <code>v</code>, directional derivative consistency requires:
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              lim_{`ε→0`} (F[φ + εv] - F[φ])/ε = ∑ (δF/δφ)_i · v_i · ΔV
            </div>
            <p style={{ color: hasDd ? 'var(--forest)' : 'var(--ink-muted)', fontWeight: 500, fontSize: '0.75rem' }}>
              {hasDd
                ? `Measured relative directional discrepancy: 1D = ${dd!['1D_relative_mismatch']!.toExponential(2)}, 2D = ${dd!['2D_relative_mismatch']!.toExponential(2)}.`
                : 'Directional derivative verification data unavailable.'}
            </p>
          </div>
        </div>

        {/* 2D Fourier Invariance */}
        <div className="notebook-panel">
          <div className="notebook-panel-header">
            <div className="notebook-panel-title">4. Discrete Periodic Fourier Eigenmodes</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p>
              On a periodic discrete grid, the 5-point discrete Laplacian acts as an exact linear operator on trigonometric modes:
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              φ(x, y) = cos(2π k_x x / L + 2π k_y y / L)
            </div>
            <p>
              The discrete eigenvalue differs from the continuum <code>-(k_x² + k_y²)</code> by the finite-difference factor:
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              λ_discrete = - (4/Δx²) sin²(k_x Δx / 2) - (4/Δy²) sin²(k_y Δy / 2)
            </div>
            <p style={{ color: hasEig ? 'var(--forest)' : 'var(--ink-muted)', fontWeight: 500, fontSize: '0.75rem' }}>
              {hasEig
                ? `Maximum discrete numerical residual: ${eig!.max_eigenvalue_residual!.toExponential(2)} (machine precision).`
                : 'Fourier eigenmode residual data unavailable.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
