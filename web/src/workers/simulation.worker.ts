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

function runBatch() {
  if (!isRunning || !currentConfig || !currentPhi || !scratchRhs) return;

  const cfg = currentConfig;
  const stepsPerBatch = cfg.dimension === 1 ? 50 : 15;

  for (let s = 0; s < stepsPerBatch; s++) {
    if (currentStep >= totalSteps) {
      stopLoop();
      const finalTime = currentStep * cfg.dt;
      const diag = computeDiagnostics(
        currentPhi,
        cfg.dx,
        cfg.dimension,
        cfg.Nx,
        cfg.Ny,
        finalTime,
        currentStep,
        cfg.dy
      );
      self.postMessage({
        type: 'COMPLETED',
        runId: activeRunId,
        field: currentPhi.slice(),
        diagnostics: diag,
      } as WorkerOutMessage);
      return;
    }

    if (cfg.dimension === 1) {
      eulerStep1D(currentPhi, cfg.dx, cfg.dt, scratchRhs, currentPhi);
    } else {
      eulerStep2D(currentPhi, cfg.Nx, cfg.Ny, cfg.dx, cfg.dt, cfg.dy, scratchRhs, currentPhi);
    }

    currentStep++;
  }

  const curSimTime = currentStep * cfg.dt;
  const isSnap =
    currentStep - lastSnapshotStep >= snapshotIntervalSteps || currentStep >= totalSteps;
  const nowWall = performance.now();
  const shouldPostUi = isSnap || nowWall - lastUiPostWallTime >= 33.3; // ~30 FPS UI throttle

  if (isSnap) {
    lastSnapshotStep = currentStep;
  }

  if (shouldPostUi) {
    lastUiPostWallTime = nowWall;
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

    self.postMessage({
      type: 'TICK',
      runId: activeRunId,
      field: currentPhi.slice(),
      diagnostics: diag,
      isSnapshot: isSnap,
    } as WorkerOutMessage);
  }

  if (isRunning) {
    timerId = setTimeout(runBatch, 0);
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

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
};
