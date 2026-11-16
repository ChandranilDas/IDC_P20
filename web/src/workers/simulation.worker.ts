/**
 * web/src/workers/simulation.worker.ts
 * Real Web Worker for non-blocking Model-A TDGL integration using Float64Array.
 *
 * Implements:
 * - Exact integer step tracking: currentTime = currentStep * dt (no FP accumulation)
 * - Independent snapshot cadence (lastSnapshotStep) and UI tick throttling (performance.now())
 * - Explicit PAUSED acknowledgement with latest field & diagnostics
 * - Clean RESET acknowledgement
 */

import {
  SimulationConfig,
  Diagnostics,
  generateInitialCondition,
  eulerStep1D,
  eulerStep2D,
  computeDiagnostics,
} from '../core/tdgl';

export type WorkerInMessage =
  | { type: 'INIT'; runId: string; config: SimulationConfig }
  | { type: 'START'; runId: string }
  | { type: 'PAUSE'; runId: string }
  | { type: 'RESUME'; runId: string }
  | { type: 'RESET'; runId: string }
  | { type: 'STEP_ONCE'; runId: string };

export type WorkerOutMessage =
  | {
      type: 'INITIALIZED';
      runId: string;
      field: Float64Array;
      diagnostics: Diagnostics;
    }
  | {
      type: 'TICK';
      runId: string;
      field: Float64Array;
      diagnostics: Diagnostics;
      isSnapshot: boolean;
    }
  | {
      type: 'PAUSED';
      runId: string;
      field: Float64Array;
      diagnostics: Diagnostics;
    }
  | {
      type: 'COMPLETED';
      runId: string;
      field: Float64Array;
      diagnostics: Diagnostics;
    }
  | {
      type: 'RESET_ACK';
      runId: string;
    }
  | {
      type: 'ERROR';
      runId: string;
      message: string;
    };

let activeRunId = '';
let currentConfig: SimulationConfig | null = null;
let currentPhi: Float64Array | null = null;
let scratchRhs: Float64Array | null = null;
let currentStep = 0;
let totalSteps = 0;
let snapshotIntervalSteps = 1;
let lastSnapshotStep = 0;
let lastUiPostWallTime = 0;
let isRunning = false;
let timerId: any = null;

function stopLoop() {
  isRunning = false;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

/** Fail visibly instead of publishing a non-finite field as a completed run. */
function failRun(error: unknown) {
  stopLoop();
  const message = error instanceof Error ? error.message : String(error);
  self.postMessage({ type: 'ERROR', runId: activeRunId, message } as WorkerOutMessage);
}

function checkFiniteField() {
  if (!currentPhi) return;
  for (let i = 0; i < currentPhi.length; i++) {
    if (!Number.isFinite(currentPhi[i])) {
      throw new Error('The numerical field became non-finite. Reset and reduce the time step or initial amplitude.');
    }
  }
}

function publishField(type: 'TICK' | 'COMPLETED', isSnapshot = false) {
  if (!currentConfig || !currentPhi) return;
  checkFiniteField();
  const cfg = currentConfig;
  const diagnostics = computeDiagnostics(currentPhi, cfg.dx, cfg.dimension, cfg.Nx, cfg.Ny,
    currentStep * cfg.dt, currentStep, cfg.dy);
  if (!Object.values(diagnostics).every(Number.isFinite)) {
    throw new Error('A numerical diagnostic overflowed. Reset with smaller amplitudes or a better-resolved configuration.');
  }
  const field = currentPhi.slice();
  // Transfer the display copy; the integrator keeps its own working field.
  self.postMessage({ type, runId: activeRunId, field, diagnostics, isSnapshot }, { transfer: [field.buffer] });
}

function runBatch() {
  if (!isRunning || !currentConfig || !currentPhi || !scratchRhs) return;
  try {
    const cfg = currentConfig;
    const started = performance.now();
    let batchSteps = 0;
    // Compute for a short wall-clock slice, then yield to PAUSE/RESET messages.
    // There is no total-work or duration cutoff.
    while (currentStep < totalSteps) {
      if (cfg.dimension === 1) {
        eulerStep1D(currentPhi, cfg.dx, cfg.dt, scratchRhs, currentPhi);
      } else {
        eulerStep2D(currentPhi, cfg.Nx, cfg.Ny, cfg.dx, cfg.dt, cfg.dy, scratchRhs, currentPhi);
      }
      currentStep++;
      batchSteps++;
      if (batchSteps % 8 === 0 && performance.now() - started >= 8) break;
    }
    if (currentStep >= totalSteps) {
      stopLoop();
      publishField('COMPLETED');
      return;
    }
    const isSnapshot = currentStep - lastSnapshotStep >= snapshotIntervalSteps;
    const now = performance.now();
    if (isSnapshot || now - lastUiPostWallTime >= 100) {
      if (isSnapshot) lastSnapshotStep = currentStep;
      lastUiPostWallTime = now;
      publishField('TICK', isSnapshot);
    } else {
      checkFiniteField();
    }
    if (isRunning) timerId = setTimeout(runBatch, 0);
  } catch (error) {
    failRun(error);
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  try {
  switch (msg.type) {
    case 'INIT': {
      stopLoop();
      activeRunId = msg.runId;
      currentConfig = msg.config;
      currentStep = 0;
      totalSteps = Math.max(1, Math.ceil(msg.config.duration / msg.config.dt));

      // Target ~200 snapshots across the run
      const targetSnapshots = 200;
      snapshotIntervalSteps = Math.max(1, Math.round(totalSteps / targetSnapshots));
      lastSnapshotStep = 0;
      lastUiPostWallTime = 0;

      const total = msg.config.dimension === 1 ? msg.config.N : msg.config.Nx * msg.config.Ny;
      currentPhi = generateInitialCondition(msg.config);
      checkFiniteField();
      scratchRhs = new Float64Array(total);

      const diag = computeDiagnostics(
        currentPhi,
        msg.config.dx,
        msg.config.dimension,
        msg.config.Nx,
        msg.config.Ny,
        0,
        0,
        msg.config.dy
      );

      if (!Object.values(diag).every(Number.isFinite)) throw new Error('Initial diagnostics overflowed; reduce the initial amplitude or grid size.');
      self.postMessage({
        type: 'INITIALIZED',
        runId: activeRunId,
        field: currentPhi.slice(),
        diagnostics: diag,
      } as WorkerOutMessage);
      break;
    }

    case 'START':
    case 'RESUME': {
      if (msg.runId !== activeRunId) return;
      if (!isRunning && currentPhi && currentConfig) {
        isRunning = true;
        timerId = setTimeout(runBatch, 0);
      }
      break;
    }

    case 'PAUSE': {
      if (msg.runId !== activeRunId) return;
      stopLoop();
      if (currentPhi && currentConfig) {
        const curSimTime = currentStep * currentConfig.dt;
        const diag = computeDiagnostics(
          currentPhi,
          currentConfig.dx,
          currentConfig.dimension,
          currentConfig.Nx,
          currentConfig.Ny,
          curSimTime,
          currentStep,
          currentConfig.dy
        );
        self.postMessage({
          type: 'PAUSED',
          runId: activeRunId,
          field: currentPhi.slice(),
          diagnostics: diag,
        } as WorkerOutMessage);
      }
      break;
    }

    case 'STEP_ONCE': {
      if (msg.runId !== activeRunId || !currentConfig || !currentPhi || !scratchRhs) return;
      if (currentStep >= totalSteps) return; // Strictly prevent stepping beyond duration
      stopLoop();
      const cfg = currentConfig;
      if (cfg.dimension === 1) {
        eulerStep1D(currentPhi, cfg.dx, cfg.dt, scratchRhs, currentPhi);
      } else {
        eulerStep2D(currentPhi, cfg.Nx, cfg.Ny, cfg.dx, cfg.dt, cfg.dy, scratchRhs, currentPhi);
      }
      currentStep++;
      checkFiniteField();
      const curSimTime = currentStep * cfg.dt;

      const diag = computeDiagnostics(
        currentPhi,
        cfg.dx,
        cfg.dimension,
        cfg.Nx,
        cfg.Ny,
        curSimTime,
        currentStep,
        cfg.dy
      );
      if (!Object.values(diag).every(Number.isFinite)) throw new Error('Numerical diagnostics overflowed; reduce the time step or initial amplitude.');
      self.postMessage({
        type: 'TICK',
        runId: activeRunId,
        field: currentPhi.slice(),
        diagnostics: diag,
        isSnapshot: true,
      } as WorkerOutMessage);
      break;
    }

    case 'RESET': {
      // Guard against stale reset: if message runId does not match activeRunId, ignore it
      if (msg.runId && activeRunId && msg.runId !== activeRunId) {
        return;
      }
      stopLoop();
      const oldId = activeRunId;
      activeRunId = '';
      currentConfig = null;
      currentPhi = null;
      scratchRhs = null;
      currentStep = 0;
      totalSteps = 0;
      self.postMessage({
        type: 'RESET_ACK',
        runId: msg.runId || oldId,
      } as WorkerOutMessage);
      break;
    }
  }
  } catch (error) {
    failRun(error);
  }
};
