import React, { useState, useEffect, useRef } from 'react';
import { FieldCanvas } from '../components/FieldCanvas';
import { InspectorCard } from '../components/InspectorCard';
import { DiagnosticsPlot, TimeSeriesPoint } from '../components/DiagnosticsPlot';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { inspectPoint, computeDiagnostics, InspectionData, Diagnostics } from '../core/tdgl';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';

interface RunMetadata {
  id: string;
  name: string;
  dimension: 1 | 2;
  L: number;
  N?: number;
  Nx?: number;
  Ny?: number;
  dx: number;
  dy?: number;
  dt: number;
  seed?: number;
  noise_amplitude?: number;
  phi0?: number;
  R0?: number;
  dtype: string;
  byte_order: string;
  bytes_per_element: number;
  shape: number[];
  binary_file: string;
  source_npz: string;
  source_sha256: string;
  t_snapshots: number[];
  diag_times: number[];
  diagnostics: {
    free_energy: number[];
    mean_phi: number[];
    mean_phi2?: number[];
    min_phi?: number[];
    max_phi?: number[];
    snapshot_mean_phi2?: number[];
    snapshot_min_phi?: number[];
    snapshot_max_phi?: number[];
  };
  num_snapshots: number;
  num_diagnostic_points: number;
  final_observed: Record<string, any>;
}

interface Manifest {
  generated_at: string;
  description: string;
  runs: Record<string, RunMetadata>;
}

export const SavedResultsView: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>('tdgl_1d_random');
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadedBuffer, setLoadedBuffer] = useState<{ runId: string; buffer: Float64Array } | null>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);

  // Inspector point
  const [selectedI, setSelectedI] = useState<number>(512);
  const [selectedJ, setSelectedJ] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch manifest
  const loadManifest = () => {
    setLoading(true);
    setFetchError(null);
    fetch('/generated/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: Failed to fetch manifest.json`);
        return res.json();
      })
      .then((data: Manifest) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest.json:', err);
        setFetchError(err.message || 'Failed to load manifest');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadManifest();
  }, []);

  // Fetch binary dataset on run selection with atomic cancellation & strict byte checks
  const fetchDataset = (run: RunMetadata) => {
    // Abort previous in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setFetchError(null);
    setLoadedBuffer(null); // immediately clear old buffer so stale frames are never displayed
    setCurrentFrameIdx(0);

    fetch(`/${run.binary_file}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}: Failed to fetch binary dataset ${run.binary_file}`);
        }
        return res.arrayBuffer();
      })
      .then((buf) => {
        // Strict verification of dtype, byte order, and exact byte length
        if (run.dtype !== 'float64') {
          throw new Error(`Unsupported dataset dtype '${run.dtype}'. Expected little-endian 'float64'.`);
        }
        if (run.bytes_per_element !== 8) {
          throw new Error(`Invalid bytes_per_element ${run.bytes_per_element}. Expected 8 bytes per Float64.`);
        }
        if (buf.byteLength % 8 !== 0) {
          throw new Error(`Unaligned buffer: byte length ${buf.byteLength} is not a multiple of 8.`);
        }

        const expectedElements = run.shape.reduce((a, b) => a * b, 1);
        const expectedByteLength = expectedElements * 8;
        if (buf.byteLength !== expectedByteLength) {
          throw new Error(
            `Byte length mismatch for ${run.id}: expected ${expectedByteLength} bytes (${expectedElements} Float64 elements), received ${buf.byteLength} bytes.`
          );
        }

        const float64Array = new Float64Array(buf);
        setLoadedBuffer({ runId: run.id, buffer: float64Array });
        setLoading(false);

        // Center inspector
        if (run.dimension === 1) {
          setSelectedI(Math.floor((run.N || 1024) / 2));
          setSelectedJ(null);
        } else {
          setSelectedI(Math.floor((run.Nx || 128) / 2));
          setSelectedJ(Math.floor((run.Ny || 128) / 2));
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // cleanly ignore user-aborted switch
        console.error('Failed to fetch binary dataset:', err);
        setLoadedBuffer(null);
        setFetchError(err.message || 'Failed to load binary dataset');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!manifest || !manifest.runs[selectedRunId]) return;
    fetchDataset(manifest.runs[selectedRunId]);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [manifest, selectedRunId]);

  if (fetchError || (!loading && (!manifest || !manifest.runs[selectedRunId]))) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto' }} />
        <div style={{ marginTop: '0.75rem', fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>
          Failed to Load Authoritative Dataset
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px', maxWidth: '600px', margin: '6px auto 0' }}>
          {fetchError || 'Dataset configuration missing in manifest.'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (manifest && manifest.runs[selectedRunId]) {
                fetchDataset(manifest.runs[selectedRunId]);
              } else {
                loadManifest();
              }
            }}
          >
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const isBufferLoadedForSelectedRun = loadedBuffer !== null && loadedBuffer.runId === selectedRunId;

  if (loading || !isBufferLoadedForSelectedRun || !manifest) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <Database size={32} color="#147d92" style={{ margin: '0 auto' }} />
        <div style={{ marginTop: '0.75rem', fontWeight: 600, color: '#102c57' }}>
          Loading Simulation Run: {manifest?.runs[selectedRunId]?.name || selectedRunId}...
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
          Loading full-precision trajectory data...
        </div>
      </div>
    );
  }

  const run = manifest.runs[selectedRunId];
  const Nx = run.dimension === 1 ? run.N || 1024 : run.Nx || 128;
  const Ny = run.dimension === 1 ? 1 : run.Ny || 128;
  const frameSize = run.dimension === 1 ? Nx : Nx * Ny;
  const totalExpectedElements = run.shape.reduce((a, b) => a * b, 1);

  // Extract current frame from the Float64 buffer only if loaded buffer matches selected run and exact total shape
  let currentFrameField: Float64Array | null = null;
  if (
    loadedBuffer &&
    loadedBuffer.runId === selectedRunId &&
    loadedBuffer.buffer.length === totalExpectedElements &&
    (currentFrameIdx + 1) * frameSize <= loadedBuffer.buffer.length
  ) {
    currentFrameField = loadedBuffer.buffer.subarray(
      currentFrameIdx * frameSize,
      (currentFrameIdx + 1) * frameSize
    );
  }

  // Current frame timestamp from actual non-uniform snapshot times
  const currentTime = run.t_snapshots[currentFrameIdx] ?? 0;
  const step = Math.round(currentTime / run.dt);

  // Compute exact metrics DIRECTLY from the displayed frame - only if exact matching size
  const currentDiag: Diagnostics | null =
    currentFrameField && currentFrameField.length === frameSize
      ? computeDiagnostics(
          currentFrameField,
          run.dx,
          run.dimension,
          Nx,
          Ny,
          currentTime,
          step,
          run.dy
        )
      : null;

  // Diagnostics time series strictly based on actual physical time series
  const energySeries: TimeSeriesPoint[] = run.diag_times.map((t, idx) => ({
    time: t,
    val: run.diagnostics.free_energy[idx],
  }));

  const meanSeries: TimeSeriesPoint[] = run.diag_times.map((t, idx) => ({
    time: t,
    val: run.diagnostics.mean_phi[idx],
  }));

  // For mean-square: use actual available cadence without faking with 0
  let meanSquareSeries: TimeSeriesPoint[] = [];
  let meanSquareCadenceLabel: string | undefined = undefined;

  if (run.diagnostics.mean_phi2 && run.diagnostics.mean_phi2.length === run.diag_times.length) {
    meanSquareSeries = run.diag_times.map((t, idx) => ({
      time: t,
      val: run.diagnostics.mean_phi2![idx],
    }));
  } else if (run.diagnostics.snapshot_mean_phi2) {
    // Actual sparse snapshot cadence for pair run (9 points)
    meanSquareSeries = run.t_snapshots.map((t, idx) => ({
      time: t,
      val: run.diagnostics.snapshot_mean_phi2![idx],
    }));
    meanSquareCadenceLabel = `Actual Snapshot Cadence: ${run.t_snapshots.length} frames`;
  }

  // Point-wise Inspector - only if exact matching frameSize
  const inspectorData: InspectionData | null =
    currentFrameField && currentFrameField.length === frameSize
      ? inspectPoint(currentFrameField, selectedI, selectedJ, {
          dimension: run.dimension,
          Nx,
          Ny,
          dx: run.dx,
          dy: run.dy,
          dt: run.dt,
        })
      : null;

  const hasNextFrame = currentFrameIdx < run.t_snapshots.length - 1;
  const nextSnapInterval = hasNextFrame
    ? run.t_snapshots[currentFrameIdx + 1] - run.t_snapshots[currentFrameIdx]
    : null;
  const isFinalFrame = currentFrameIdx === run.t_snapshots.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Editorial View Header & Dataset Selector Bar */}
      <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '0.2rem' }}>
              Extended Simulation Trajectories
            </h1>
            <p style={{ fontSize: '0.825rem', color: 'var(--ink-secondary)' }}>
              Interactive inspection of full-duration phase ordering trajectories, domain growth morphologies, and physical diagnostics.
            </p>
          </div>

          {/* Dataset Selector Buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {Object.values(manifest.runs).map((r) => (
              <button
                key={r.id}
                className={`btn btn-sm ${selectedRunId === r.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedRunId(r.id)}
              >
                {r.id === 'tdgl_1d_random'
                  ? '1D Random Quench'
                  : r.id === 'tdgl_2d_random'
                  ? '2D Coarsening'
                  : '1D Kink-Antikink'}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Aligned Metadata Strip */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--ink-secondary)',
            fontFamily: 'var(--font-mono)',
            flexWrap: 'wrap',
          }}
        >
          <span>Run: <strong style={{ color: 'var(--ink-primary)', fontFamily: 'var(--font-sans)' }}>{run.name}</strong></span>
          <span>Grid: <strong style={{ color: 'var(--ink-primary)' }}>{run.dimension === 1 ? `N = ${Nx}` : `${Nx} × ${Ny}`}</strong></span>
          <span>L = <strong style={{ color: 'var(--ink-primary)' }}>{run.L.toFixed(1)}</strong></span>
          <span>Δx = <strong style={{ color: 'var(--ink-primary)' }}>{run.dx.toFixed(4)}</strong></span>
          <span>Δt = <strong style={{ color: 'var(--ink-primary)' }}>{run.dt}</strong></span>
          <span>Snapshots: <strong style={{ color: 'var(--ink-primary)' }}>{run.num_snapshots} frames</strong></span>
          <span style={{ marginLeft: 'auto', color: 'var(--forest)', fontWeight: 500 }}>Extended Trajectory</span>
        </div>

        {/* Evolution Window Strip */}
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.45rem 0.75rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.72rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
              Evolution Window (t = 0 → {run.t_snapshots[run.t_snapshots.length - 1]}):
            </span>{' '}
            <span style={{ color: 'var(--ink-secondary)' }}>
              {run.id === 'tdgl_1d_random'
                ? '1D ordering over 1,000,000 steps. Six domain walls remain at t = 1000.'
                : run.id === 'tdgl_2d_random'
                ? '2D ordering over 10,000 steps. Domains grow and interfaces smooth; the final field remains nonuniform.'
                : 'A paired domain contracts and disappears, leaving a uniform negative phase.'}
            </span>
          </div>
          <div style={{ color: 'var(--ink-secondary)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
            {run.seed !== undefined ? `Random Quench (seed ${run.seed})` : 'Analytic Profile'}
          </div>
        </div>
      </div>

      {/* Primary Workspace: Field Visualization FIRST */}
      <div className="notebook-panel">
        <div className="notebook-panel-header">
          <div className="notebook-panel-title">
            Figure: Reference Field φ(r, t)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
            t = {currentTime.toFixed(3)} · Frame {currentFrameIdx + 1} of {run.num_snapshots}
          </div>
        </div>

        <div className={`field-stage ${run.dimension === 2 ? 'field-stage-2d' : 'field-stage-1d'}`}>
          <FieldCanvas
            dimension={run.dimension}
            field={currentFrameField}
            Nx={Nx}
            Ny={Ny}
            L={run.L}
            dx={run.dx}
            dy={run.dy}
            selectedI={selectedI}
            selectedJ={selectedJ}
            onSelectPoint={(i, j) => {
              setSelectedI(i);
              setSelectedJ(j);
            }}
          />
        </div>

        {/* Accessible Coordinate Selection Inputs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '0.65rem',
            padding: '0.45rem 0.65rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>Point Inspector Index:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label htmlFor="saved-inspect-i" style={{ color: 'var(--ink-secondary)' }}>
              i (0 to {Nx - 1}):
            </label>
            <input
              id="saved-inspect-i"
              type="number"
              min="0"
              max={Nx - 1}
              value={selectedI}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setSelectedI(Math.min(Math.max(0, val), Nx - 1));
              }}
              style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
            />
          </div>

          {run.dimension === 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label htmlFor="saved-inspect-j" style={{ color: 'var(--ink-secondary)' }}>
                j (0 to {Ny - 1}):
              </label>
              <input
                id="saved-inspect-j"
                type="number"
                min="0"
                max={Ny - 1}
                value={selectedJ ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setSelectedJ(Math.min(Math.max(0, val), Ny - 1));
                }}
                style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
              />
            </div>
          )}
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', marginLeft: 'auto' }}>
            Click canvas to inspect point values
          </span>
        </div>

        {/* Timeline Scrubber */}
        <div style={{ marginTop: '0.65rem' }}>
          <TimelineScrubber
            currentIndex={currentFrameIdx}
            totalSnapshots={run.num_snapshots}
            currentTime={currentTime}
            totalDuration={run.t_snapshots[run.t_snapshots.length - 1] ?? run.L}
            onSeek={(idx) => {
              if (idx >= 0 && idx < run.num_snapshots) {
                setCurrentFrameIdx(idx);
              }
            }}
          />
        </div>
      </div>

      {/* Diagnostics and Inspector Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Physical Diagnostics Plot Component */}
        <DiagnosticsPlot
          currentDiag={currentDiag}
          energySeries={energySeries}
          meanSeries={meanSeries}
          meanSquareSeries={meanSquareSeries}
          meanSquareLabel={meanSquareCadenceLabel}
        />

        {/* Numerical Update Worksheet / Equation Ledger */}
        <InspectorCard
          data={inspectorData}
          dx={run.dx}
          dt={run.dt}
          nextSnapInterval={nextSnapInterval}
          isFinalFrame={isFinalFrame}
        />
      </div>

      {/* Simulation Specifications & Dataset Summary */}
      <details className="provenance-disclosure">
        <summary>Simulation parameters</summary>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.775rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--ink-secondary)' }}>
            <span>Domain: <strong>L = {run.L.toFixed(1)}</strong></span>
            <span>Grid: <strong>{run.dimension === 1 ? `N = ${Nx}` : `${Nx} × ${Ny}`}</strong></span>
            <span>Mesh Spacing: <strong>Δx = {run.dx.toFixed(4)}</strong></span>
            <span>Time Step: <strong>Δt = {run.dt}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--ink-secondary)' }}>
            <span>Field Array Shape: <strong>[{run.shape.join(', ')}]</strong></span>
            <span>Temporal Snapshots: <strong>{run.num_snapshots} frames</strong></span>
            <span>Diagnostic Samples: <strong>{run.num_diagnostic_points} points</strong></span>
            <span>Data Precision: <strong>Float64 (double precision)</strong></span>
          </div>
        </div>
      </details>
    </div>
  );
};
