import React from 'react';
import { InspectionData } from '../core/tdgl';

interface InspectorCardProps {
  data: InspectionData | null;
  dx: number;
  dt: number;
  nextSnapInterval?: number | null;
  isFinalFrame?: boolean;
}

const fmt = (v: number | null | undefined, digits = 6): string =>
  v !== null && v !== undefined && Number.isFinite(v) ? v.toFixed(digits) : '—';

export const InspectorCard: React.FC<InspectorCardProps> = ({
  data,
  dx,
  dt,
  nextSnapInterval,
  isFinalFrame,
}) => {
  if (!data) {
    return (
      <div className="notebook-panel" style={{ color: 'var(--ink-muted)', fontSize: '0.825rem', fontStyle: 'italic', padding: '1rem' }}>
        <p>Click any point on the field visualization or enter (i, j) coordinates to inspect its discrete mathematical update.</p>
      </div>
    );
  }

  return (
    <div className="notebook-panel">
      {/* Ledger Header */}
      <div className="notebook-panel-header">
        <div className="notebook-panel-title">
          Numerical Update Inspector{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--forest)', fontWeight: 600 }}>
            [{data.dimension === 1 ? `i = ${data.i}` : `i = ${data.i}, j = ${data.j}`}]
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
          Δx = {fmt(dx, 4)} · Δt = {fmt(dt, 4)}
        </div>
      </div>

      {/* Discrete Finite-Difference Stencil Table */}
      <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Stencil Coordinate</th>
              <th style={{ width: '30%' }}>Symbol</th>
              <th style={{ width: '30%', textAlign: 'right' }}>Field Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Local Field Value</td>
              <td><code>Point φ</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.val, 6)}</td>
            </tr>
            <tr>
              <td>Periodic West Neighbor</td>
              <td><code>Left φ[i-1]</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.left, 6)}</td>
            </tr>
            <tr>
              <td>Periodic East Neighbor</td>
              <td><code>Right φ[i+1]</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.right, 6)}</td>
            </tr>
            {data.dimension === 2 && data.down !== null && data.down !== undefined && (
              <tr>
                <td>Periodic South Neighbor</td>
                <td><code>Down φ[j-1]</code></td>
                <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.down, 6)}</td>
              </tr>
            )}
            {data.dimension === 2 && data.up !== null && data.up !== undefined && (
              <tr>
                <td>Periodic North Neighbor</td>
                <td><code>Up φ[j+1]</code></td>
                <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.up, 6)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Numerical Reaction-Diffusion Update Ledger */}
      <div style={{ overflowX: 'auto' }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Operator / Term</th>
              <th style={{ width: '30%' }}>Discretized Formula</th>
              <th style={{ width: '30%', textAlign: 'right' }}>Evaluated Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Discrete Laplacian</td>
              <td><code>∇²φ = Δ_h φ</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.laplacian, 6)}</td>
            </tr>
            <tr>
              <td>Nonlinear Reaction</td>
              <td><code>φ - φ³ = -∂V/∂φ</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.reaction, 6)}</td>
            </tr>
            <tr>
              <td>Total RHS</td>
              <td><code>(φ - φ³) + ∇²φ</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.rhs, 6)}</td>
            </tr>
            <tr>
              <td>Euler Increment</td>
              <td><code>Δt · RHS</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.eulerIncrement, 6)}</td>
            </tr>
            <tr style={{ fontWeight: 600, background: 'var(--bg-subtle)' }}>
              <td>Predicted Next State</td>
              <td><code>φⁿ⁺¹ = φⁿ + Δt·RHS</code></td>
              <td style={{ textAlign: 'right' }} className="ledger-num">{fmt(data.predictedEulerVal, 6)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Snapshot interval note if non-uniform cadence */}
      {nextSnapInterval !== undefined && nextSnapInterval !== null && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--ink-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
          * Next stored snapshot interval Δt<sub>next_frame</sub> = {nextSnapInterval.toFixed(3)} (single integration step is Δt = {dt.toFixed(4)}).
        </div>
      )}
      {isFinalFrame && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--forest)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
          ✓ Reached final simulation frame at t = {data.dt ? (data.val !== null ? 't_final' : '') : ''}.
        </div>
      )}
    </div>
  );
};
