import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  SimulationConfig,
  Diagnostics,
  InspectionData,
  inspectPoint,
  getInitialConditionProvenance,
} from '../core/tdgl';
import {
  validateSimulationConfig,
  MAX_SNAPSHOTS,
  ValidationResult,
} from '../core/configValidation';
import { WorkerInMessage, WorkerOutMessage } from '../workers/simulation.worker';
import { FieldCanvas } from '../components/FieldCanvas';
import { InspectorCard } from '../components/InspectorCard';
import { DiagnosticsPlot } from '../components/DiagnosticsPlot';
import { TimelineScrubber } from '../components/TimelineScrubber';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

interface SnapshotRecord {
  time: number;
  step: number;
  field: Float64Array;
  diagnostics: Diagnostics;
}

interface ActiveDisplayBundle {
  runId: string;
  config: SimulationConfig;
  field: Float64Array;
  diagnostics: Diagnostics;
}

let runCounter = 0;

export const SimulationLab: React.FC = () => {
  // Preset options
  const [preset, setPreset] = useState<string>('1d_random');
  const [dimension, setDimension] = useState<1 | 2>(1);

  // Raw draft string states for form inputs (preserves exact user entry without truncation or silent defaults)
  const [draftL, setDraftL] = useState<string>('100');
  const [draftN, setDraftN] = useState<string>('1024');
  const [draftDt, setDraftDt] = useState<string>('0.001');
  const [draftDuration, setDraftDuration] = useState<string>('40');
  const [draftSeed, setDraftSeed] = useState<string>('42');
  const [draftNoiseAmplitude, setDraftNoiseAmplitude] = useState<string>('0.05');
  const [draftPhi0, setDraftPhi0] = useState<string>('0.0');
  const [draftPairR0, setDraftPairR0] = useState<string>('7.0');

  // Active validated configuration locked to current run
  const [activeConfig, setActiveConfig] = useState<SimulationConfig | null>(null);
  const activeConfigRef = useRef<SimulationConfig | null>(null);

  // Atomic live display bundle: field, diagnostics, config, and runId are ALWAYS in sync
  const [displayBundle, setDisplayBundle] = useState<ActiveDisplayBundle | null>(null);

  // Simulation execution state
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState<number>(0);

  // Inspector point coordinates
  const [selectedI, setSelectedI] = useState<number>(512);
  const [selectedJ, setSelectedJ] = useState<number | null>(null);

  // Web Worker ref & runId ref for atomic message filtering
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef<string>('');
  const autoStartOnNextInitRef = useRef<boolean>(false);

  // Memoize validation result strictly over draft strings (prevents truncation and infinite re-render loops)
  const valResult: ValidationResult = useMemo(() => {
    return validateSimulationConfig({
      dimension,
      L: draftL,
      N: draftN,
      dt: draftDt,
      duration: draftDuration,
      seed: draftSeed,
      noiseAmplitude: draftNoiseAmplitude,
      phi0: draftPhi0,
      preset:
        preset === '1d_pair'
          ? 'kink_pair'
          : preset === 'uniform_plus1'
          ? 'plus1'
          : preset === 'uniform_minus1'
          ? 'minus1'
          : draftPhi0 !== '0.0' && draftPhi0 !== '0' && draftPhi0 !== ''
          ? 'biased'
          : 'random',
      pairR0: draftPairR0,
    });
  }, [dimension, draftL, draftN, draftDt, draftDuration, draftSeed, draftNoiseAmplitude, draftPhi0, preset, draftPairR0]);

  const provenance = useMemo(() => {
    if (valResult.config) {
      return getInitialConditionProvenance(valResult.config);
    }
    const L = Number(draftL) || 100;
    const N = Number(draftN) || 1024;
    return getInitialConditionProvenance({
      dimension,
      L,
      N,
      Nx: N,
      Ny: dimension === 1 ? 1 : N,
      dx: L / N,
      dt: Number(draftDt) || 0.001,
      duration: Number(draftDuration) || 40,
      seed: Number(draftSeed) || 42,
      noiseAmplitude: Number(draftNoiseAmplitude) || 0.05,
      phi0: Number(draftPhi0) || 0.0,
      preset:
        preset === '1d_pair'
          ? 'kink_pair'
          : preset === 'uniform_plus1'
          ? 'plus1'
          : preset === 'uniform_minus1'
          ? 'minus1'
          : draftPhi0 !== '0.0' && draftPhi0 !== '0' && draftPhi0 !== ''
          ? 'biased'
          : 'random',
      pairR0: Number(draftPairR0) || 7.0,
    });
  }, [valResult.config, dimension, draftL, draftN, draftDt, draftDuration, draftSeed, draftNoiseAmplitude, draftPhi0, preset, draftPairR0]);

  const valResultRef = useRef<ValidationResult>(valResult);
  valResultRef.current = valResult;

  const isFormLocked = status === 'running' || status === 'paused';

  // Preset switch handler (All default presets calibrated to stay strictly within 50M cell-steps)
  const applyPreset = (name: string, targetDim?: 1 | 2) => {
    setPreset(name);
    setStatus('idle');
    setDisplayBundle(null);
    setSnapshots([]);
    setActiveSnapshotIdx(0);

    const dim = targetDim ?? dimension;

    if (name === '1d_random') {
      setDimension(1);
      setDraftL('100');
      setDraftN('1024');
      setDraftDt('0.001');
      setDraftDuration('40');
      setDraftSeed('42');
      setDraftNoiseAmplitude('0.05');
      setDraftPhi0('0.0');
      setSelectedI(512);
      setSelectedJ(null);
    } else if (name === '2d_random') {
      setDimension(2);
      setDraftL('128');
      setDraftN('128');
      setDraftDt('0.01');
      setDraftDuration('25');
      setDraftSeed('42');
      setDraftNoiseAmplitude('0.05');
      setDraftPhi0('0.0');
      setSelectedI(64);
      setSelectedJ(64);
    } else if (name === '1d_pair') {
      setDimension(1);
      setDraftL('100');
      setDraftN('1024');
      setDraftDt('0.001');
      setDraftDuration('40');
      setDraftPairR0('7.0');
      setDraftNoiseAmplitude('0.0');
      setDraftPhi0('0.0');
      setSelectedI(500);
      setSelectedJ(null);
    } else if (name === '1d_biased') {
      setDimension(1);
      setDraftL('100');
      setDraftN('1024');
      setDraftDt('0.001');
      setDraftDuration('40');
      setDraftSeed('42');
      setDraftNoiseAmplitude('0.05');
      setDraftPhi0('0.2');
      setSelectedI(512);
      setSelectedJ(null);
    } else if (name === 'uniform_plus1') {
      setDimension(dim);
      setDraftL(dim === 1 ? '100' : '128');
      setDraftN(dim === 1 ? '512' : '128');
      setDraftDt(dim === 1 ? '0.001' : '0.01');
      setDraftDuration('20');
      setDraftPhi0('1.0');
      setDraftNoiseAmplitude('0.0');
      setSelectedI(dim === 1 ? 256 : 64);
      setSelectedJ(dim === 1 ? null : 64);
    } else if (name === 'uniform_minus1') {
      setDimension(dim);
      setDraftL(dim === 1 ? '100' : '128');
      setDraftN(dim === 1 ? '512' : '128');
      setDraftDt(dim === 1 ? '0.001' : '0.01');
      setDraftDuration('20');
      setDraftPhi0('-1.0');
      setDraftNoiseAmplitude('0.0');
      setSelectedI(dim === 1 ? 256 : 64);
      setSelectedJ(dim === 1 ? null : 64);
    }
  };

  // Setup Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      // Stale run filtering: ignore messages from obsolete or reset runs
      if (msg.runId && runIdRef.current && msg.runId !== runIdRef.current) {
        return;
      }

      const cfg = activeConfigRef.current;
      if (!cfg) return;
      const expectedTotal = cfg.dimension === 1 ? cfg.Nx : cfg.Nx * cfg.Ny;

      if (msg.type === 'INITIALIZED') {
        if (msg.field.length !== expectedTotal) return;
        setDisplayBundle({
          runId: msg.runId,
          config: cfg,
          field: msg.field,
          diagnostics: msg.diagnostics,
        });
        setSnapshots([{ time: 0, step: 0, field: msg.field, diagnostics: msg.diagnostics }]);
        setActiveSnapshotIdx(0);

        if (autoStartOnNextInitRef.current) {
          autoStartOnNextInitRef.current = false;
          setStatus('running');
          workerRef.current?.postMessage({ type: 'START', runId: msg.runId } as WorkerInMessage);
        }
      } else if (msg.type === 'TICK') {
        if (msg.field.length !== expectedTotal) return;
        setDisplayBundle({
          runId: msg.runId,
          config: cfg,
          field: msg.field,
          diagnostics: msg.diagnostics,
        });
        if (msg.isSnapshot) {
          setSnapshots((prev) => {
            let nextList = [
              ...prev,
              {
                time: msg.diagnostics.time,
                step: msg.diagnostics.step,
                field: msg.field,
                diagnostics: msg.diagnostics,
              },
            ];
            // Enforce bounded snapshot history cap
            if (nextList.length > MAX_SNAPSHOTS) {
              nextList = [nextList[0], ...nextList.slice(1).filter((_, idx) => idx % 2 === 1)];
            }
            setActiveSnapshotIdx(nextList.length - 1);
            return nextList;
          });
        }
      } else if (msg.type === 'PAUSED') {
        setStatus('paused');
        if (msg.field.length === expectedTotal) {
          setDisplayBundle({
            runId: msg.runId,
            config: cfg,
            field: msg.field,
            diagnostics: msg.diagnostics,
          });
        }
      } else if (msg.type === 'COMPLETED') {
        setStatus('completed');
        if (msg.field.length === expectedTotal) {
          setDisplayBundle({
            runId: msg.runId,
            config: cfg,
            field: msg.field,
            diagnostics: msg.diagnostics,
          });
          setSnapshots((prev) => {
            let nextList = [
              ...prev,
              {
                time: msg.diagnostics.time,
                step: msg.diagnostics.step,
                field: msg.field,
                diagnostics: msg.diagnostics,
              },
            ];
            if (nextList.length > MAX_SNAPSHOTS) {
              nextList = [nextList[0], ...nextList.slice(1).filter((_, idx) => idx % 2 === 1)];
            }
            setActiveSnapshotIdx(nextList.length - 1);
            return nextList;
          });
        }
      } else if (msg.type === 'RESET_ACK') {
        setStatus('idle');
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  // Initialize simulation field with validated active config (zero external dependency churn)
  const initSimulation = useCallback(() => {
    const vr = valResultRef.current;
    if (!workerRef.current || !vr.isValid || !vr.config) return;

    const newId = `run_${Date.now()}_${++runCounter}_${Math.random().toString(36).substring(2, 7)}`;
    runIdRef.current = newId;
    activeConfigRef.current = vr.config;
    setActiveConfig(vr.config);
    setStatus('idle');
    setDisplayBundle(null);
    setSnapshots([]);
    setActiveSnapshotIdx(0);

    workerRef.current.postMessage({
      type: 'INIT',
      runId: newId,
      config: vr.config,
    } as WorkerInMessage);
  }, []);

  // Auto-init strictly when draft parameters change while idle
  useEffect(() => {
    if (status === 'idle' && valResult.isValid) {
      initSimulation();
    }
  }, [
    dimension,
    draftL,
    draftN,
    draftDt,
    draftDuration,
    draftSeed,
    draftNoiseAmplitude,
    draftPhi0,
    preset,
    draftPairR0,
    status,
    initSimulation,
    valResult.isValid,
  ]);

  // Simulation Controls
  const handleStart = () => {
    if (!valResult.isValid || !displayBundle) return;
    if (status === 'idle') {
      setStatus('running');
      workerRef.current?.postMessage({ type: 'START', runId: runIdRef.current } as WorkerInMessage);
    } else if (status === 'paused') {
      setStatus('running');
      workerRef.current?.postMessage({ type: 'RESUME', runId: runIdRef.current } as WorkerInMessage);
    } else if (status === 'completed') {
      autoStartOnNextInitRef.current = true;
      handleReset();
    }
  };

  const handlePause = () => {
    setStatus('paused');
    workerRef.current?.postMessage({ type: 'PAUSE', runId: runIdRef.current } as WorkerInMessage);
  };

  const handleStepOnce = () => {
    setStatus('paused');
    workerRef.current?.postMessage({ type: 'STEP_ONCE', runId: runIdRef.current } as WorkerInMessage);
  };

  const handleReset = () => {
    setStatus('idle');
    setDisplayBundle(null);
    setSnapshots([]);
    setActiveSnapshotIdx(0);
    workerRef.current?.postMessage({ type: 'RESET', runId: runIdRef.current } as WorkerInMessage);
    initSimulation();
  };

  // Timeline seeking
  const handleSeek = (idx: number) => {
    if (idx >= 0 && idx < snapshots.length && activeConfigRef.current) {
      const snap = snapshots[idx];
      const cfg = activeConfigRef.current;
      const expectedTotal = cfg.dimension === 1 ? cfg.Nx : cfg.Nx * cfg.Ny;
      if (snap.field.length === expectedTotal) {
        setDisplayBundle({
          runId: runIdRef.current,
          config: cfg,
          field: snap.field,
          diagnostics: snap.diagnostics,
        });
        setActiveSnapshotIdx(idx);
      }
    }
  };

  // Effective configuration for Canvas & Inspector
  const parsedL = Number(draftL) || 100.0;
  const parsedN = Number(draftN) || 1024;
  const effectiveConfig: SimulationConfig =
    displayBundle?.config ||
    activeConfig ||
    valResult.config || {
      dimension,
      L: parsedL,
      N: parsedN,
      Nx: parsedN,
      Ny: dimension === 1 ? 1 : parsedN,
      dx: parsedL / parsedN,
      dt: Number(draftDt) || 0.001,
      duration: Number(draftDuration) || 40.0,
      seed: Number(draftSeed) || 42,
      noiseAmplitude: Number(draftNoiseAmplitude) || 0.05,
      phi0: Number(draftPhi0) || 0.0,
      preset: 'random',
      pairR0: Number(draftPairR0) || 7.0,
    };

  const displayField = displayBundle ? displayBundle.field : null;
  const displayDiag = displayBundle ? displayBundle.diagnostics : null;
  const activeRunId = displayBundle ? displayBundle.runId : '';

  // Export handlers
  const exportJSON = () => {
    if (!displayField || !displayDiag) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            runId: runIdRef.current,
            timestamp: new Date().toISOString(),
            activeConfig: effectiveConfig,
            currentTime: displayDiag.time,
            currentStep: displayDiag.step,
            diagnostics: displayDiag,
            field: Array.from(displayField),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tdgl_${effectiveConfig.dimension}d_snapshot_t${displayDiag.time.toFixed(2)}_${runIdRef.current}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const exportCSV = () => {
    if (snapshots.length === 0) return;
    const header = 'step,time,free_energy,mean_phi,mean_phi2,min_phi,max_phi\n';
    const rows = snapshots
      .map(
        (s) =>
          `${s.step},${s.time.toFixed(4)},${s.diagnostics.freeEnergy.toFixed(6)},${s.diagnostics.meanPhi.toFixed(
            6
          )},${s.diagnostics.meanPhi2.toFixed(6)},${s.diagnostics.minPhi.toFixed(6)},${s.diagnostics.maxPhi.toFixed(6)}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tdgl_${effectiveConfig.dimension}d_diagnostics_${runIdRef.current}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const exportPNG = () => {
    const canvas = document.getElementById('tdgl-field-canvas') as HTMLCanvasElement | null;
    if (!canvas || !displayDiag) return;
    const filename = `tdgl_${effectiveConfig.dimension}d_t${displayDiag.time.toFixed(3)}_${runIdRef.current}.png`;

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png');
    } else {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
    }
  };

  // Ensure selected coordinates are clamped whenever grid resolution changes
  useEffect(() => {
    const maxI = Math.max(0, effectiveConfig.Nx - 1);
    setSelectedI((prev) => (prev > maxI ? maxI : prev));
    if (selectedJ !== null) {
      const maxJ = Math.max(0, effectiveConfig.Ny - 1);
      setSelectedJ((prev) => (prev !== null && prev > maxJ ? maxJ : prev));
    }
  }, [effectiveConfig.Nx, effectiveConfig.Ny, selectedJ]);

  const clampedI = Math.min(Math.max(0, selectedI), effectiveConfig.Nx - 1);
  const clampedJ =
    effectiveConfig.dimension === 2 && selectedJ !== null
      ? Math.min(Math.max(0, selectedJ), effectiveConfig.Ny - 1)
      : null;

  // Compute inspector data for active field
  const inspectorData: InspectionData | null = displayBundle
    ? inspectPoint(displayBundle.field, clampedI, clampedJ, displayBundle.config)
    : null;

  // Actual next snapshot interval at current scrubber index
  const hasNextSnap = activeSnapshotIdx < snapshots.length - 1;
  const nextSnapInterval = hasNextSnap
    ? snapshots[activeSnapshotIdx + 1].time - snapshots[activeSnapshotIdx].time
    : null;
  const isFinalFrame = activeSnapshotIdx === snapshots.length - 1 && status === 'completed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Editorial View Header */}
      <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.65rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '0.2rem' }}>
          Simulation Laboratory
        </h1>
        <p style={{ fontSize: '0.825rem', color: 'var(--ink-secondary)' }}>
          Explicit Forward Euler numerical integration of the real scalar nonconserved Model-A TDGL equation: ∂<sub>t</sub>φ = φ - φ³ + ∇²φ.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="lab-layout mobile-field-first">
        {/* Left Column: Preset, Parameters & Diagnostics */}
        <aside className="lab-sidebar">
          {/* Controls & Configuration Panel */}
          <div className="notebook-panel">
            <div className="notebook-panel-header">
              <div className="notebook-panel-title">Instrument Parameters</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                {isFormLocked ? 'Run in progress (locked)' : 'Editable'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Presets Selector */}
              <div className="param-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="sim-preset-select" className="param-label">
                    Preset:
                  </label>
                  <span className="param-hint">Demo calibration</span>
                </div>
                <select
                  id="sim-preset-select"
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value)}
                  disabled={isFormLocked}
                  style={{ width: '100%' }}
                >
                  <option value="1d_random">1D Critical Quench (L=100, N=1024, dt=1e-3, t_end=40)</option>
                  <option value="2d_random">2D Domain Coarsening (L=128, N=128², dt=0.01, t_end=25)</option>
                  <option value="1d_pair">1D Kink–Antikink Annihilation (R0=7.0, t_end=40)</option>
                  <option value="1d_biased">1D Biased State (phi0=0.2, t_end=40)</option>
                  <option value="uniform_plus1">Uniform +1 Ground State</option>
                  <option value="uniform_minus1">Uniform -1 Ground State</option>
                </select>

                {/* Initial Condition Generator & Provenance Indicator */}
                <div
                  style={{
                    marginTop: '0.45rem',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-xs)',
                    background: provenance.isCanonicalReference ? 'rgba(46, 125, 50, 0.08)' : 'var(--bg-subtle)',
                    border: `1px solid ${provenance.isCanonicalReference ? 'rgba(46, 125, 50, 0.3)' : 'var(--border-hairline)'}`,
                    fontSize: '0.72rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, color: provenance.isCanonicalReference ? 'var(--forest)' : 'var(--ink-primary)' }}>
                      {provenance.isCanonicalReference ? '✓ Canonical Reference IC' : provenance.label}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>
                      {provenance.source === 'canonical_numpy_pcg64'
                        ? 'NumPy PCG64'
                        : provenance.source === 'mulberry32'
                        ? 'Mulberry32'
                        : 'Analytic'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
                    {provenance.description}
                  </div>
                </div>
              </div>

              {/* Spatial Dimension Toggle */}
              <div className="param-group">
                <div className="param-label">
                  <span>Spatial Dimension:</span>
                  <span className="param-hint">{dimension}D mesh</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  <button
                    className={`btn btn-sm ${dimension === 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setDimension(1);
                      applyPreset('1d_random', 1);
                    }}
                    disabled={isFormLocked}
                  >
                    1D Line
                  </button>
                  <button
                    className={`btn btn-sm ${dimension === 2 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setDimension(2);
                      applyPreset('2d_random', 2);
                    }}
                    disabled={isFormLocked}
                  >
                    2D Mesh
                  </button>
                </div>
              </div>

              {isFormLocked && (
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                  * Parameters locked during active run. Reset or wait for completion to edit.
                </div>
              )}

              {/* Domain Settings: L & N */}
              <div className="param-group">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="input-L" className="param-label" style={{ marginBottom: '2px' }}>
                      System Size L
                    </label>
                    <input
                      id="input-L"
                      type="text"
                      inputMode="decimal"
                      value={draftL}
                      onChange={(e) => setDraftL(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="input-N" className="param-label" style={{ marginBottom: '2px' }}>
                      Grid Points N (int)
                    </label>
                    <input
                      id="input-N"
                      type="text"
                      inputMode="numeric"
                      value={draftN}
                      onChange={(e) => setDraftN(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Timestep & Duration */}
              <div className="param-group">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="input-dt" className="param-label" style={{ marginBottom: '2px' }}>
                      Time Step Δt
                    </label>
                    <input
                      id="input-dt"
                      type="text"
                      inputMode="decimal"
                      value={draftDt}
                      onChange={(e) => setDraftDt(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="input-duration" className="param-label" style={{ marginBottom: '2px' }}>
                      Duration t<sub>final</sub>
                    </label>
                    <input
                      id="input-duration"
                      type="text"
                      inputMode="decimal"
                      value={draftDuration}
                      onChange={(e) => setDraftDuration(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Seed & Noise Amplitude */}
              <div className="param-group">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="input-seed" className="param-label" style={{ marginBottom: '2px' }}>
                      Seed (uint32)
                    </label>
                    <input
                      id="input-seed"
                      type="text"
                      inputMode="numeric"
                      value={draftSeed}
                      onChange={(e) => setDraftSeed(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="input-noise" className="param-label" style={{ marginBottom: '2px' }}>
                      Noise |δφ| ≤ 0.5
                    </label>
                    <input
                      id="input-noise"
                      type="text"
                      inputMode="decimal"
                      value={draftNoiseAmplitude}
                      onChange={(e) => setDraftNoiseAmplitude(e.target.value)}
                      disabled={isFormLocked}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Kink-Antikink Separation */}
              {preset === '1d_pair' && (
                <div className="param-group">
                  <label htmlFor="input-r0" className="param-label" style={{ marginBottom: '2px' }}>
                    Defect Separation R₀
                  </label>
                  <input
                    id="input-r0"
                    type="text"
                    inputMode="decimal"
                    value={draftPairR0}
                    onChange={(e) => setDraftPairR0(e.target.value)}
                    disabled={isFormLocked}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Validation Warnings */}
              {valResult.warnings.map((w, idx) => (
                <div key={idx} className="notice-box notice-warning">
                  <span>⚠ {w}</span>
                </div>
              ))}

              {/* Stability Bound & Budget Information */}
              {valResult.errors.length > 0 ? (
                <div className="notice-box notice-error">
                  <div style={{ fontWeight: 600 }}>Configuration Invalid</div>
                  <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                    {valResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="notice-box notice-success">
                  <div style={{ fontWeight: 600 }}>
                    Monotonicity Bound: Δt<sub>max</sub> = {valResult.budget?.stabilityLimit.toFixed(6)}
                    <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--ink-secondary)', marginLeft: '4px' }}>
                      (sufficient condition for |φ| ≤ M)
                    </span>
                  </div>
                  {valResult.budget?.linearStabilityLimit && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                      Ordered-State Linear Stability: Δt<sub>lin</sub> = {valResult.budget.linearStabilityLimit.toFixed(6)} (Yadav et al. 2024 Eq. 35)
                    </div>
                  )}
                  <div style={{ color: 'var(--ink-secondary)', marginTop: '3px' }}>
                    Satisfied ({valResult.budget?.safetyRatio.toFixed(1)}% of monotonicity bound). Budget:{' '}
                    {valResult.budget?.cellSteps.toLocaleString()} cell-steps (≤ 50M cap).
                  </div>
                </div>
              )}

              {/* Export Buttons */}
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minWidth: '75px' }}
                  onClick={exportJSON}
                  disabled={!displayField}
                  title="Export field snapshot and configuration as JSON"
                >
                  <Download size={11} /> JSON Field
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minWidth: '75px' }}
                  onClick={exportCSV}
                  disabled={snapshots.length === 0}
                  title="Export time series diagnostics as CSV"
                >
                  <Download size={11} /> CSV Time Series
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minWidth: '75px' }}
                  onClick={exportPNG}
                  disabled={!displayField}
                  title="Export canvas snapshot as PNG"
                >
                  <ImageIcon size={11} /> PNG Frame
                </button>
              </div>
            </div>
          </div>

          {/* Physical Diagnostics Plot Component */}
          <DiagnosticsPlot
            currentDiag={displayDiag}
            history={snapshots.map((s) => s.diagnostics)}
          />
        </aside>

        {/* Right Column: Interactive Field Visualizer & Inspector */}
        <main className="lab-workspace">
          {/* Primary Transport Toolbar (Mobile & Desktop single source of truth) */}
          <div className="notebook-panel lab-transport-toolbar" style={{ padding: '0.65rem 0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Run Control
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>·</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                  State: <strong style={{ color: status === 'running' ? 'var(--forest)' : 'var(--ink-primary)', textTransform: 'capitalize' }}>{status}</strong>
                </span>
                {isFormLocked && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                    (Parameters locked)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {status === 'running' ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ minWidth: '85px', borderColor: 'var(--ink-primary)' }}
                    onClick={handlePause}
                  >
                    <Pause size={13} /> Pause
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ minWidth: '85px' }}
                    onClick={handleStart}
                    disabled={!valResult.isValid || !displayBundle}
                  >
                    <Play size={13} /> {status === 'paused' ? 'Resume' : status === 'completed' ? 'Run Again' : 'Start'}
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleStepOnce}
                  disabled={status === 'running' || !valResult.isValid}
                  title="Single Forward Euler Step"
                  aria-label="Single Step"
                >
                  <StepForward size={13} /> Step
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                  title="Reset Simulation"
                  aria-label="Reset Simulation"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Field Visualization Canvas Panel */}
          <div className="notebook-panel">
            <div className="notebook-panel-header">
              <div className="notebook-panel-title">
                Figure 1: Spatial Order Parameter Field φ(r, t)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                t = {displayDiag ? displayDiag.time.toFixed(3) : '0.000'} · Frame {snapshots.length > 0 ? activeSnapshotIdx + 1 : 1} of {snapshots.length || 1}
                {activeRunId && <span style={{ marginLeft: '0.4rem', color: 'var(--ink-muted)' }}>[{activeRunId}]</span>}
              </div>
            </div>

            <div className={`field-stage ${effectiveConfig.dimension === 2 ? 'field-stage-2d' : 'field-stage-1d'}`}>
              <FieldCanvas
                dimension={effectiveConfig.dimension}
                field={displayField}
                Nx={effectiveConfig.Nx}
                Ny={effectiveConfig.Ny}
                L={effectiveConfig.L}
                dx={effectiveConfig.dx}
                selectedI={clampedI}
                selectedJ={clampedJ}
                onSelectPoint={(i, j) => {
                  setSelectedI(i);
                  setSelectedJ(j);
                }}
              />
            </div>

            {/* Accessible Coordinate Inputs for Inspector */}
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
                <label htmlFor="sim-inspect-i" style={{ color: 'var(--ink-secondary)' }}>
                  i (0 to {effectiveConfig.Nx - 1}):
                </label>
                <input
                  id="sim-inspect-i"
                  type="number"
                  min="0"
                  max={effectiveConfig.Nx - 1}
                  value={clampedI}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setSelectedI(Math.min(Math.max(0, val), effectiveConfig.Nx - 1));
                  }}
                  style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
                />
              </div>

              {effectiveConfig.dimension === 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label htmlFor="sim-inspect-j" style={{ color: 'var(--ink-secondary)' }}>
                    j (0 to {effectiveConfig.Ny - 1}):
                  </label>
                  <input
                    id="sim-inspect-j"
                    type="number"
                    min="0"
                    max={effectiveConfig.Ny - 1}
                    value={clampedJ ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setSelectedJ(Math.min(Math.max(0, val), effectiveConfig.Ny - 1));
                    }}
                    style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
                  />
                </div>
              )}
              <span style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', marginLeft: 'auto' }}>
                Click field or enter indices to inspect
              </span>
            </div>

            {/* Timeline Scrubber */}
            <div style={{ marginTop: '0.65rem' }}>
              <TimelineScrubber
                currentIndex={activeSnapshotIdx}
                totalSnapshots={snapshots.length}
                currentTime={displayDiag ? displayDiag.time : 0}
                totalDuration={effectiveConfig.duration}
                onSeek={handleSeek}
                disabled={status === 'running'}
              />
            </div>
          </div>

          {/* Numerical Update Inspector Card */}
          <InspectorCard
            data={inspectorData}
            dx={effectiveConfig.dx}
            dt={effectiveConfig.dt}
            nextSnapInterval={nextSnapInterval}
            isFinalFrame={isFinalFrame}
          />
        </main>
      </div>
    </div>
  );
};
