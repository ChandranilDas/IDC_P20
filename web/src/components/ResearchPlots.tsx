import React, { useRef, useEffect, useMemo } from 'react';
import { SimulationConfig, Diagnostics } from '../core/tdgl';

export interface ResearchSnapshot {
  time: number;
  step: number;
  field: Float64Array;
  diagnostics: Diagnostics;
}

export interface ResearchPlotsProps {
  config: SimulationConfig;
  snapshots: ResearchSnapshot[];
}

// Scientific diverging colormap: -1 -> #2b5c8f (Navy), 0 -> #ffffff (White), +1 -> #b83a24 (Terracotta)
function getCoolwarmRGB(val: number): [number, number, number] {
  const v = Math.max(-1.0, Math.min(1.0, val));
  if (v < 0) {
    const t = v + 1.0;
    const r = Math.round(43 + (255 - 43) * t);
    const g = Math.round(92 + (255 - 92) * t);
    const b = Math.round(143 + (255 - 143) * t);
    return [r, g, b];
  } else {
    const t = v;
    const r = Math.round(255 + (184 - 255) * t);
    const g = Math.round(255 + (58 - 255) * t);
    const b = Math.round(255 + (36 - 255) * t);
    return [r, g, b];
  }
}

/**
 * Colors matching src/plot_style.py time_color(t):
 * LinearSegmentedColormap across ['#666666', '#2b5c8f', '#315646', '#b83a24']
 * at normalized log1p(t) / log1p(1000).
 */
export function timeColor(t: number): string {
  const safeT = Math.max(0, Number.isFinite(t) ? t : 0);
  const fraction = Math.min(1, Math.max(0, Math.log1p(safeT) / Math.log1p(1000)));
  const norm = Math.min(255, Math.floor(fraction * 256)) / 255;

  let r: number, g: number, b: number;
  if (norm <= 1 / 3) {
    const f = norm * 3;
    r = Math.round(102 + (43 - 102) * f);
    g = Math.round(102 + (92 - 102) * f);
    b = Math.round(102 + (143 - 102) * f);
  } else if (norm <= 2 / 3) {
    const f = (norm - 1 / 3) * 3;
    r = Math.round(43 + (49 - 43) * f);
    g = Math.round(92 + (86 - 92) * f);
    b = Math.round(143 + (70 - 143) * f);
  } else {
    const f = (norm - 2 / 3) * 3;
    r = Math.round(49 + (184 - 49) * f);
    g = Math.round(86 + (58 - 86) * f);
    b = Math.round(70 + (36 - 70) * f);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// Subsamples 1D field to at most maxPoints while strictly preserving the last point
function subsample1D(field: Float64Array, maxPoints = 1000): { i: number; val: number }[] {
  const N = field.length;
  if (N <= maxPoints) {
    const res = new Array(N);
    for (let i = 0; i < N; i++) {
      res[i] = { i, val: field[i] };
    }
    return res;
  }
  const step = (N - 1) / (maxPoints - 1);
  const res: { i: number; val: number }[] = [];
  for (let k = 0; k < maxPoints - 1; k++) {
    const idx = Math.round(k * step);
    res.push({ i: idx, val: field[idx] });
  }
  res.push({ i: N - 1, val: field[N - 1] });
  return res;
}

interface TimeChartProps {
  title: string;
  yAxisLabel: string;
  color: string;
  timestamps: number[];
  values: number[];
  duration: number;
}

const TimeSeriesChart: React.FC<TimeChartProps> = ({
  title,
  yAxisLabel,
  color,
  timestamps,
  values,
  duration,
}) => {
  const width = 680;
  const height = 135;
  const marginLeft = 62;
  const marginRight = 20;
  const marginTop = 18;
  const marginBottom = 34;

  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const { tMin, tSpan, minY, ySpan, pointsStr, latestX, latestY, isSingle } = useMemo(() => {
    if (timestamps.length === 0 || values.length === 0) {
      return {
        tMin: 0,
        tMax: 1,
        tSpan: 1,
        minY: 0,
        maxY: 1,
        ySpan: 1,
        pointsStr: '',
        latestX: 0,
        latestY: 0,
        isSingle: true,
      };
    }

    const t0 = timestamps[0];
    const tEnd = timestamps[timestamps.length - 1];
    const tMin = t0;
    const tMax = tEnd > t0 ? tEnd : t0 + Math.max(1.0, duration || 1.0);
    const tSpan = Math.max(1e-9, tMax - tMin);

    const validY = values.filter(Number.isFinite);
    let minVal = validY.length > 0 ? Math.min(...validY) : 0;
    let maxVal = validY.length > 0 ? Math.max(...validY) : 1;

    // Handle constant solutions and single point
    if (Math.abs(maxVal - minVal) < 1e-9) {
      const pad = Math.abs(minVal) > 1e-4 ? Math.abs(minVal) * 0.1 : 0.1;
      minVal -= pad;
      maxVal += pad;
    } else {
      const pad = (maxVal - minVal) * 0.06;
      minVal -= pad;
      maxVal += pad;
    }

    const ySpan = maxVal - minVal;

    const toX = (t: number) => marginLeft + ((t - tMin) / tSpan) * plotW;
    const toY = (v: number) => marginTop + (1.0 - (v - minVal) / ySpan) * plotH;

    const pts = timestamps
      .map((t, idx) => {
        const x = toX(t);
        const y = toY(values[idx]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const lastIdx = timestamps.length - 1;
    const latestX = toX(timestamps[lastIdx]);
    const latestY = toY(values[lastIdx]);

    return {
      tMin,
      tMax,
      tSpan,
      minY: minVal,
      maxY: maxVal,
      ySpan,
      pointsStr: pts,
      latestX,
      latestY,
      isSingle: timestamps.length === 1,
    };
  }, [timestamps, values, duration, plotW, plotH, marginLeft, marginTop]);

  const currentVal = values.length > 0 ? values[values.length - 1] : 0;
  const currentTime = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;

  // Grid tick values
  const yTicks = useMemo(() => {
    return [0.0, 0.5, 1.0].map((frac) => minY + frac * ySpan);
  }, [minY, ySpan]);

  const xTicks = useMemo(() => {
    return [0.0, 0.25, 0.5, 0.75, 1.0].map((frac) => tMin + frac * tSpan);
  }, [tMin, tSpan]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)' }}>{title}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
          t = {currentTime.toFixed(3)}: <strong style={{ color }}>{currentVal.toFixed(6)}</strong>
        </span>
      </div>

      <svg
        role="img" aria-label={title}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-xs)',
          display: 'block',
        }}
      >
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((yVal, idx) => {
          const cy = marginTop + (1.0 - (yVal - minY) / ySpan) * plotH;
          return (
            <g key={idx}>
              <line x1={marginLeft} y1={cy} x2={marginLeft + plotW} y2={cy} stroke="#ebebe4" strokeWidth="1" />
              <text
                x={marginLeft - 7}
                y={cy + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--ink-muted)"
                fontFamily="var(--font-mono)"
              >
                {Math.abs(yVal) < 1e-4 && yVal !== 0 ? yVal.toExponential(2) : yVal.toFixed(4)}
              </text>
            </g>
          );
        })}

        {/* Vertical grid lines & X labels */}
        {xTicks.map((tVal, idx) => {
          const cx = marginLeft + ((tVal - tMin) / tSpan) * plotW;
          return (
            <g key={idx}>
              <line x1={cx} y1={marginTop} x2={cx} y2={marginTop + plotH} stroke="#ebebe4" strokeWidth="1" />
              <text
                x={cx}
                y={marginTop + plotH + 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ink-muted)"
                fontFamily="var(--font-mono)"
              >
                {tVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Plot Frame */}
        <rect x={marginLeft} y={marginTop} width={plotW} height={plotH} fill="none" stroke="#d8d8cd" strokeWidth="1" />

        {/* Axis titles */}
        <text
          x={marginLeft + plotW / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill="var(--ink-secondary)"
        >
          Time t
        </text>

        <text
          transform={`rotate(-90)`}
          x={-(marginTop + plotH / 2)}
          y="15"
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill="var(--ink-secondary)"
        >
          {yAxisLabel}
        </text>

        {/* Curve or single initial point */}
        {!isSingle && pointsStr && (
          <polyline
            points={pointsStr}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Marker for current/latest snapshot */}
        <circle cx={latestX} cy={latestY} r={isSingle ? 4 : 3} fill={color} stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export const ResearchPlots: React.FC<ResearchPlotsProps> = ({ config, snapshots }) => {
  const is1D = config.dimension === 1;
  const L = config.L > 0 ? config.L : 100;
  const V = Math.pow(L, config.dimension);
  const Nx = config.Nx || config.N;
  const Ny = config.Ny || config.N;

  // Real retained time series (no synthetic trends, no future timestamps)
  const { timestamps, fOverVSeries, qSeries, commonAmplitude } = useMemo(() => {
    const times: number[] = [];
    const fv: number[] = [];
    const q: number[] = [];
    let maxA = 1.0;

    for (const s of snapshots) {
      times.push(s.time);
      fv.push(s.diagnostics.freeEnergy / V);
      q.push(s.diagnostics.meanPhi2 / 2.0);
      maxA = Math.max(maxA, Math.abs(s.diagnostics.maxPhi), Math.abs(s.diagnostics.minPhi));
    }

    return {
      timestamps: times,
      fOverVSeries: fv,
      qSeries: q,
      commonAmplitude: Math.max(1.0, maxA),
    };
  }, [snapshots, V]);

  // Selected actual snapshots: First, Middle, Latest
  const selectedSnapshots = useMemo(() => {
    const len = snapshots.length;
    if (len === 0) return [];
    if (len === 1) {
      return [{ snap: snapshots[0], label: `t = ${snapshots[0].time.toFixed(2)} (Initial)` }];
    }
    if (len === 2) {
      return [
        { snap: snapshots[0], label: `t = ${snapshots[0].time.toFixed(2)} (Initial)` },
        { snap: snapshots[1], label: `t = ${snapshots[1].time.toFixed(2)} (Latest)` },
      ];
    }
    const target = Math.min(10, snapshots[len - 1].time / 2);
    const midIdx = snapshots.reduce((best, snap, i) =>
      Math.abs(snap.time - target) < Math.abs(snapshots[best].time - target) ? i : best, 0);
    return [
      { snap: snapshots[0], label: `t = ${snapshots[0].time.toFixed(2)} (Initial)` },
      ...(midIdx > 0 && midIdx < len - 1 ? [{ snap: snapshots[midIdx], label: `t = ${snapshots[midIdx].time.toFixed(2)} (Intermediate)` }] : []),
      { snap: snapshots[len - 1], label: `t = ${snapshots[len - 1].time.toFixed(2)} (Latest)` },
    ];
  }, [snapshots]);

  // Canvas ref for 1D Space-Time Heatmap
  const spaceTimeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1D Space-Time Heatmap: actual nonuniform snapshot times (not equal-height rows)
  useEffect(() => {
    if (!is1D || snapshots.length === 0) return;
    const canvas = spaceTimeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasW = Math.min(Nx, 360);
    const canvasH = 180;
    canvas.width = canvasW;
    canvas.height = canvasH;

    const t0 = snapshots[0].time;
    const tEnd = snapshots[snapshots.length - 1].time;
    const tSpan = tEnd > t0 ? tEnd - t0 : Math.max(1.0, config.duration || 1.0);

    const imgData = ctx.createImageData(canvasW, canvasH);
    const data = imgData.data;

    // For each pixel row r (0 at top, canvasH - 1 at bottom):
    // Map r to exact simulation time t (bottom is t0, top is tEnd)
    for (let r = 0; r < canvasH; r++) {
      const frac = 1.0 - r / Math.max(1, canvasH - 1);
      const t = t0 + frac * tSpan;

      // Find nearest active snapshot in real time
      let chosenIdx = 0;
      let minDiff = Math.abs(snapshots[0].time - t);
      for (let sIdx = 1; sIdx < snapshots.length; sIdx++) {
        const diff = Math.abs(snapshots[sIdx].time - t);
        if (diff < minDiff) {
          minDiff = diff;
          chosenIdx = sIdx;
        }
      }

      const field = snapshots[chosenIdx].field;
      const fieldLen = field.length;

      for (let c = 0; c < canvasW; c++) {
        const i = Math.floor((c / canvasW) * fieldLen);
        const val = field[i];
        const [red, green, blue] = getCoolwarmRGB(
          val !== undefined && Number.isFinite(val) ? val / commonAmplitude : 0
        );
        const pIdx = (r * canvasW + c) * 4;
        data[pIdx] = red;
        data[pIdx + 1] = green;
        data[pIdx + 2] = blue;
        data[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [is1D, snapshots, Nx, config.duration, commonAmplitude]);

  // 1D Field Overlay SVG data
  const overlayData = useMemo(() => {
    if (!is1D || selectedSnapshots.length === 0) return null;

    const width = 680;
    const height = 190;
    const marginLeft = 56;
    const marginRight = 20;
    const marginTop = 26;
    const marginBottom = 34;

    const plotW = width - marginLeft - marginRight;
    const plotH = height - marginTop - marginBottom;

    // Y bounds across selected snapshots
    let minPhi = -1.0;
    let maxPhi = 1.0;
    for (const item of selectedSnapshots) {
      minPhi = Math.min(minPhi, item.snap.diagnostics.minPhi);
      maxPhi = Math.max(maxPhi, item.snap.diagnostics.maxPhi);
    }
    const amp = Math.max(1.0, Math.max(Math.abs(minPhi), Math.abs(maxPhi)));
    const yMin = -amp * 1.05;
    const yMax = amp * 1.05;
    const ySpan = yMax - yMin;

    const toX = (i: number) => marginLeft + (i * config.dx / L) * plotW;
    const toY = (v: number) => marginTop + (1.0 - (v - yMin) / ySpan) * plotH;

    const curves = selectedSnapshots.map((item) => {
      const sampled = subsample1D(item.snap.field, 1000);
      const points = sampled
        .map((pt) => `${toX(pt.i).toFixed(1)},${toY(pt.val).toFixed(1)}`)
        .join(' ');
      return {
        label: item.label,
        time: item.snap.time,
        color: timeColor(item.snap.time),
        points,
      };
    });

    const yTicks = [-amp, 0, amp];
    const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => frac * L);

    return {
      width,
      height,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      plotW,
      plotH,
      curves,
      yTicks,
      xTicks,
      yMin,
      yMax,
      ySpan,
      toX,
      toY,
    };
  }, [is1D, selectedSnapshots, Nx, L, config.dx]);

  if (snapshots.length === 0) {
    return (
      <div className="notebook-panel" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
        No simulation snapshots recorded yet. Run a simulation to display research plots.
      </div>
    );
  }

  return (
    <div className="notebook-panel" aria-label="Evolution figures" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="notebook-panel-header">
        <div className="notebook-panel-title">Evolution figures</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
          {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'} · t = {snapshots[snapshots.length - 1].time.toFixed(3)}
        </div>
      </div>

      {/* Two Full-Width Axis-Labelled SVG Time Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Chart 1: Free Energy Density F/V */}
        <TimeSeriesChart
          title="Free Energy Density F / V"
          yAxisLabel="f = F/V"
          color="#315646"
          timestamps={timestamps}
          values={fOverVSeries}
          duration={config.duration}
        />

        {/* Chart 2: Ordering Measure Q = <phi^2> / 2 */}
        <TimeSeriesChart
          title="Ordering Measure Q = ⟨φ²⟩ / 2"
          yAxisLabel="Q = ⟨φ²⟩/2"
          color="#8c2d19"
          timestamps={timestamps}
          values={qSeries}
          duration={config.duration}
        />
      </div>

      {/* 1D Visualizations: Multi-Time Field Overlay & Nonuniform Space-Time Heatmap */}
      {is1D && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.25rem' }}>
          {/* 1D Overlay */}
          {overlayData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                  1D profiles at recorded times
                </span>
                {/* Time legend with exact time_color anchors */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {overlayData.curves.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '3px',
                          background: c.color,
                          borderRadius: '1px',
                        }}
                      />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <svg
                viewBox={`0 0 ${overlayData.width} ${overlayData.height}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'block',
                }}
              >
                {/* Y Gridlines & Labels */}
                {overlayData.yTicks.map((yVal, idx) => {
                  const cy = overlayData.toY(yVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={overlayData.marginLeft}
                        y1={cy}
                        x2={overlayData.marginLeft + overlayData.plotW}
                        y2={cy}
                        stroke="#ebebe4"
                        strokeWidth="1"
                      />
                      <text
                        x={overlayData.marginLeft - 7}
                        y={cy + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fill="var(--ink-muted)"
                        fontFamily="var(--font-mono)"
                      >
                        {yVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* X Gridlines & Labels */}
                {overlayData.xTicks.map((xVal, idx) => {
                  const frac = xVal / L;
                  const cx = overlayData.marginLeft + frac * overlayData.plotW;
                  return (
                    <g key={idx}>
                      <line
                        x1={cx}
                        y1={overlayData.marginTop}
                        x2={cx}
                        y2={overlayData.marginTop + overlayData.plotH}
                        stroke="#ebebe4"
                        strokeWidth="1"
                      />
                      <text
                        x={cx}
                        y={overlayData.marginTop + overlayData.plotH + 14}
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--ink-muted)"
                        fontFamily="var(--font-mono)"
                      >
                        {xVal.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Plot Frame */}
                <rect
                  x={overlayData.marginLeft}
                  y={overlayData.marginTop}
                  width={overlayData.plotW}
                  height={overlayData.plotH}
                  fill="none"
                  stroke="#d8d8cd"
                  strokeWidth="1"
                />

                {/* Axis Titles */}
                <text
                  x={overlayData.marginLeft + overlayData.plotW / 2}
                  y={overlayData.height - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill="var(--ink-secondary)"
                >
                  Spatial Coordinate x ∈ [0, {L.toFixed(0)})
                </text>

                <text
                  transform={`rotate(-90)`}
                  x={-(overlayData.marginTop + overlayData.plotH / 2)}
                  y="15"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="500"
                  fill="var(--ink-secondary)"
                >
                  Order Parameter φ(x)
                </text>

                {/* Overlay curves */}
                {overlayData.curves.map((curve, idx) => (
                  <polyline
                    key={idx}
                    points={curve.points}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            </div>
          )}

          {/* 1D Space-Time Heatmap */}
          <div>
            {snapshots.length === 1 && <p style={{fontSize:'.75rem',color:'var(--ink-secondary)'}}>One recorded field; the time history grows as the simulation advances.</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
                1D Space–Time Evolution φ(x, t)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                Scale: [±{commonAmplitude.toFixed(2)}] · Recorded times
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.65rem 0.85rem',
              }}
            >
              {/* Vertical Time Axis Label */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '180px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-muted)',
                  textAlign: 'right',
                  minWidth: '48px',
                }}
              >
                <span>t={snapshots[snapshots.length - 1].time.toFixed(1)}</span>
                <span style={{ transform: 'rotate(-90deg)', margin: 'auto', fontWeight: 600, color: 'var(--ink-secondary)' }}>
                  Time t ↑
                </span>
                <span>t={snapshots[0].time.toFixed(1)}</span>
              </div>

              {/* Heatmap Canvas */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <canvas
                  ref={spaceTimeCanvasRef}
                  role="img" aria-label="1D space-time evolution"
                  style={{
                    width: '100%',
                    height: '180px',
                    display: 'block',
                    border: '1px solid var(--border-hairline)',
                    imageRendering: 'pixelated',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <span>x=0</span>
                  <span style={{ fontWeight: 500, color: 'var(--ink-secondary)' }}>Space x ∈ [0, {L.toFixed(0)}) →</span>
                  <span>x={L.toFixed(0)}</span>
                </div>
              </div>

              {/* Colormap Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '180px', width: '28px' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                  +{commonAmplitude.toFixed(1)}
                </span>
                <div
                  style={{
                    flex: 1,
                    width: '10px',
                    margin: '3px 0',
                    borderRadius: '1px',
                    border: '1px solid var(--border-hairline)',
                    background: 'linear-gradient(to bottom, #b83a24 0%, #ffffff 50%, #2b5c8f 100%)',
                  }}
                />
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                  -{commonAmplitude.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2D Visualizations: Field Thumbnails Side by Side */}
      {!is1D && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
              2D Spatial Morphology Snapshots φ(x, y, t)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              φ range: [±{commonAmplitude.toFixed(2)}] · Orientation: (x→, y↑)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.85rem',
            }}
          >
            {selectedSnapshots.map((item, idx) => (
              <Thumbnail2D
                key={idx}
                snapshot={item.snap}
                label={item.label}
                Nx={Nx}
                Ny={Ny}
                commonAmplitude={commonAmplitude}
              />
            ))}

            {/* Shared Colormap Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                alignSelf: 'center',
                minWidth: '55px',
                height: '140px',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                +{commonAmplitude.toFixed(1)}
              </span>
              <div
                style={{
                  width: '12px',
                  flex: 1,
                  margin: '4px 0',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '1px',
                  background: 'linear-gradient(to bottom, #b83a24 0%, #ffffff 50%, #2b5c8f 100%)',
                }}
              />
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                -{commonAmplitude.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>φ scale</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface Thumbnail2DProps {
  snapshot: ResearchSnapshot;
  label: string;
  Nx: number;
  Ny: number;
  commonAmplitude: number;
}

const Thumbnail2D: React.FC<Thumbnail2DProps> = ({ snapshot, label, Nx, Ny, commonAmplitude }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot.field) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Bounded rasterization <= 256px
    const rasterNx = Math.min(256, Math.max(1, Nx));
    const rasterNy = Math.min(256, Math.max(1, Ny));
    canvas.width = rasterNx;
    canvas.height = rasterNy;

    const imgData = ctx.createImageData(rasterNx, rasterNy);
    const data = imgData.data;

    // Same orientation as FieldCanvas: row i=x, col j=y, y up (y=0 at bottom)
    for (let r = 0; r < rasterNy; r++) {
      const j = Ny - 1 - Math.floor(((r + 0.5) * Ny) / rasterNy);
      for (let i = 0; i < rasterNx; i++) {
        const gridI = Math.floor(((i + 0.5) * Nx) / rasterNx);
        const val = snapshot.field[gridI * Ny + j];
        const [red, green, blue] = getCoolwarmRGB(
          val !== undefined && Number.isFinite(val) ? val / commonAmplitude : 0
        );
        const pixelIdx = (r * rasterNx + i) * 4;
        data[pixelIdx] = red;
        data[pixelIdx + 1] = green;
        data[pixelIdx + 2] = blue;
        data[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [snapshot, Nx, Ny, commonAmplitude]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: '1 1 140px' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </span>
      <canvas
        ref={canvasRef}
        role="img" aria-label={`Morphology ${label}`}
        style={{
          width: '100%',
          maxWidth: '180px',
          aspectRatio: '1 / 1',
          display: 'block',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-xs)',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default ResearchPlots;
