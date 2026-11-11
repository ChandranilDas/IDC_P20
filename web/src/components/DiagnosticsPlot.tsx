import React, { useState } from 'react';
import { Diagnostics } from '../core/tdgl';

export interface TimeSeriesPoint {
  time: number;
  val: number;
}

interface DiagnosticsPlotProps {
  currentDiag: Diagnostics | null;
  history?: Diagnostics[];
  energySeries?: TimeSeriesPoint[];
  meanSeries?: TimeSeriesPoint[];
  meanSquareSeries?: TimeSeriesPoint[];
  meanSquareLabel?: string;
}

export const DiagnosticsPlot: React.FC<DiagnosticsPlotProps> = ({
  currentDiag,
  history,
  energySeries,
  meanSeries,
  meanSquareSeries,
  meanSquareLabel,
}) => {
  const [activeCurve, setActiveCurve] = useState<'energy' | 'mean' | 'meanSquare'>('energy');

  if (!currentDiag) return null;

  // Render SVG Sparkline against PHYSICAL TIME on the horizontal axis
  const renderSparkline = () => {
    let pointsData: TimeSeriesPoint[] = [];
    let strokeColor = '#315646'; // Forest green
    let label = 'Free Energy F(t)';

    if (activeCurve === 'energy') {
      pointsData = energySeries || history?.map((h) => ({ time: h.time, val: h.freeEnergy })) || [];
      strokeColor = '#315646';
      label = 'Free Energy F(t)';
    } else if (activeCurve === 'mean') {
      pointsData = meanSeries || history?.map((h) => ({ time: h.time, val: h.meanPhi })) || [];
      strokeColor = '#204b6e';
      label = 'Mean Order ⟨φ⟩(t)';
    } else {
      pointsData = meanSquareSeries || history?.map((h) => ({ time: h.time, val: h.meanPhi2 })) || [];
      strokeColor = '#8c2d19';
      label = meanSquareLabel ? `Mean Square ⟨φ²⟩(t) [${meanSquareLabel}]` : 'Mean Square ⟨φ²⟩(t)';
    }

    if (pointsData.length < 2) {
      return (
        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', textAlign: 'center', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
          Insufficient time series history to render sparkline
        </div>
      );
    }

    const w = 320;
    const h = 70;
    const padX = 8;
    const padY = 8;

    const tMin = pointsData[0].time;
    const tMax = pointsData[pointsData.length - 1].time;
    const tSpan = tMax - tMin || 1.0;

    const vals = pointsData.map((p) => p.val);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const spanV = maxV - minV || 1e-6;

    const points = pointsData
      .map((item) => {
        const x = padX + ((item.time - tMin) / tSpan) * (w - 2 * padX);
        const y = padY + (1.0 - (item.val - minV) / spanV) * (h - 2 * padY);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <div style={{ marginTop: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
          <span>t = {tMin.toFixed(1)}</span>
          <span style={{ color: strokeColor, fontWeight: 600 }}>{label}</span>
          <span>t = {tMax.toFixed(1)}</span>
        </div>
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ overflow: 'visible', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}
        >
          <polyline fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--ink-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
          <span>min: {minV.toFixed(4)}</span>
          <span>max: {maxV.toFixed(4)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="notebook-panel">
      {/* Panel Header */}
      <div className="notebook-panel-header">
        <div className="notebook-panel-title">Physical Diagnostics</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--forest)', fontWeight: 500 }}>
          dF/dt ≤ 0 Active
        </div>
      </div>

      {/* Numerical Diagnostics Ledger Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.4rem' }}>
        <div className="stat-pill">
          <div className="stat-label">Free Energy F</div>
          <div className="stat-val" style={{ color: 'var(--forest)' }}>
            {currentDiag.freeEnergy.toFixed(4)}
          </div>
        </div>

        <div className="stat-pill">
          <div className="stat-label">Mean ⟨φ⟩</div>
          <div className="stat-val">{currentDiag.meanPhi.toFixed(4)}</div>
        </div>

        <div className="stat-pill">
          <div className="stat-label">Mean Square ⟨φ²⟩</div>
          <div className="stat-val">
            {currentDiag.meanPhi2.toFixed(4)}
          </div>
        </div>

        <div className="stat-pill">
          <div className="stat-label">Extrema [Min, Max]</div>
          <div className="stat-val" style={{ fontSize: '0.8rem' }}>
            [{currentDiag.minPhi.toFixed(2)}, {currentDiag.maxPhi.toFixed(2)}]
          </div>
        </div>
      </div>

      {/* Curve Selector Plain Text Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.2rem' }}>
        <button
          onClick={() => setActiveCurve('energy')}
          style={{
            padding: '2px 4px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeCurve === 'energy' ? 600 : 400,
            color: activeCurve === 'energy' ? 'var(--forest)' : 'var(--ink-muted)',
            borderBottom: activeCurve === 'energy' ? '2px solid var(--forest)' : '2px solid transparent',
            background: 'transparent',
          }}
        >
          F(t)
        </button>
        <button
          onClick={() => setActiveCurve('mean')}
          style={{
            padding: '2px 4px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeCurve === 'mean' ? 600 : 400,
            color: activeCurve === 'mean' ? '#204b6e' : 'var(--ink-muted)',
            borderBottom: activeCurve === 'mean' ? '2px solid #204b6e' : '2px solid transparent',
            background: 'transparent',
          }}
        >
          ⟨φ⟩(t)
        </button>
        <button
          onClick={() => setActiveCurve('meanSquare')}
          style={{
            padding: '2px 4px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: activeCurve === 'meanSquare' ? 600 : 400,
            color: activeCurve === 'meanSquare' ? '#8c2d19' : 'var(--ink-muted)',
            borderBottom: activeCurve === 'meanSquare' ? '2px solid #8c2d19' : '2px solid transparent',
            background: 'transparent',
          }}
        >
          ⟨φ²⟩(t)
        </button>
      </div>

      {/* Sparkline Plotted Against Physical Time */}
      {renderSparkline()}
    </div>
  );
};
