/**
 * web/src/core/configValidation.ts
 * Rigorous, explicit validation for every numerical configuration input.
 *
 * Enforces:
 * - Strict non-empty, suffix-free parsing (rejects blank, letters, trailing chars)
 * - Strict uint32 integer range [0, 4294967295] for seed
 * - Positive finite system size L > 0, grid size N >= 3 (minimum 2nd-order central differences)
 * - Safe integer and typed-array representability for total grid cells
 * - Non-negative noise amplitude |δφ| >= 0
 * - Conservative monotonicity bound: dt <= 1 / [ 3*M² - 1 + 2*D/dx² ], where M = max(1, |effective_bias| + eta)
 * - Memory & budget estimation: snapshotLimit chosen by 64 MiB history target clamped to [2, 300]
 * - Informative work estimation and warnings for high computational load (> 50M cell-steps) without artificial rejection
 * - Exact duration rounding semantics: totalSteps = Math.ceil(duration / dt), actualDuration = totalSteps * dt
 */

import { SimulationConfig } from './tdgl';

export interface RawConfigInput {
  dimension: 1 | 2;
  L: number | string;
  N: number | string;
  dt: number | string;
  duration: number | string;
  seed: number | string;
  noiseAmplitude: number | string;
  phi0: number | string;
  preset: 'random' | 'biased' | 'plus1' | 'minus1' | 'kink_pair';
  pairR0?: number | string;
}

export interface WorkBudgetInfo {
  totalCells: number;
  totalSteps: number;
  cellSteps: number;
  actualDuration: number;
  stabilityLimit: number; // Conservative sufficient monotonicity bound
  safetyRatio: number;
  sufficientMonotonicityLimit: number; // Conservative sufficient bound for discrete energy dissipation
  linearStabilityLimit: number;        // Ordered-state linear stability limit (Yadav et al. 2024 Eq. 35)
  linearSafetyRatio: number;
  snapshotLimit: number;               // Dynamic snapshot retention limit clamped to [2, 300] targeting 64 MiB
  estimatedMemoryBytes: number;        // Estimated memory for active arrays + retained snapshot history
  estimatedMemoryMb: number;           // Estimated memory footprint in megabytes
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: SimulationConfig | null;
  budget: WorkBudgetInfo | null;
}

export const MAX_CELL_STEPS = 50_000_000; // Informational threshold for large workload warning
export const MAX_SNAPSHOTS = 300;         // Upper clamping bound for snapshot history

function parseStrictNumber(val: number | string, name: string): { num: number; error?: string } {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || isNaN(Number(trimmed)) || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      return { num: NaN, error: `${name} must be a valid finite number without suffix characters.` };
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      return { num: NaN, error: `${name} must be finite.` };
    }
    return { num: n };
  }
  if (!Number.isFinite(val)) {
    return { num: NaN, error: `${name} must be a finite number.` };
  }
  return { num: val };
}

function parseStrictInteger(val: number | string, name: string): { num: number; error?: string } {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return { num: NaN, error: `${name} must be an integer without suffixes, decimal points, or whitespace.` };
    }
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n)) {
      return { num: NaN, error: `${name} exceeds safe integer range.` };
    }
    return { num: n };
  }
  if (!Number.isFinite(val) || !Number.isInteger(val)) {
    return { num: NaN, error: `${name} must be an exact integer (no silent decimal truncation).` };
  }
  return { num: val };
}

export function validateSimulationConfig(raw: RawConfigInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse L
  const lRes = parseStrictNumber(raw.L, 'System size L');
  if (lRes.error) {
    errors.push(lRes.error);
  } else if (lRes.num <= 0) {
    errors.push('System size L must be a positive number > 0.');
  }
  const L = lRes.num;

  // Parse N
  const nRes = parseStrictInteger(raw.N, 'Grid size N');
  if (nRes.error) {
    errors.push(nRes.error);
  } else if (nRes.num < 3) {
    errors.push('Grid size N must be an integer ≥ 3 (minimum grid for 2nd-order central differences with periodic boundaries).');
  }
  const N = nRes.num;

  // Parse seed (must be uint32 [0, 4294967295])
  const sRes = parseStrictInteger(raw.seed, 'Random seed');
  if (sRes.error) {
    errors.push(sRes.error);
  } else if (sRes.num < 0 || sRes.num > 4294967295) {
    errors.push('Random seed must be an unsigned 32-bit integer in [0, 4294967295].');
  }
  const seed = sRes.num;

  // Parse noise amplitude (must be non-negative)
  const etaRes = parseStrictNumber(raw.noiseAmplitude, 'Noise amplitude |δφ|');
  if (etaRes.error) {
    errors.push(etaRes.error);
  } else if (etaRes.num < 0) {
    errors.push('Noise amplitude |δφ| must be non-negative.');
  }
  const eta = etaRes.num;

  // Parse phi0 & determine effective bias
  const phiRes = parseStrictNumber(raw.phi0, 'Initial order parameter φ₀');
  if (phiRes.error) {
    errors.push(phiRes.error);
  }
  const phi0 = phiRes.num;

  // Parse dt
  const dtRes = parseStrictNumber(raw.dt, 'Timestep Δt');
  if (dtRes.error) {
    errors.push(dtRes.error);
  } else if (dtRes.num <= 0) {
    errors.push('Timestep Δt must be a positive number > 0.');
  }
  const dt = dtRes.num;

  // Parse duration
  const durRes = parseStrictNumber(raw.duration, 'Duration');
  if (durRes.error) {
    errors.push(durRes.error);
  } else if (durRes.num <= 0) {
    errors.push('Duration must be a positive number > 0.');
  }
  const duration = durRes.num;

  // Parse pairR0 if applicable
  let pairR0 = 7.0;
  if (raw.preset === 'kink_pair') {
    const rRes = parseStrictNumber(raw.pairR0 ?? 7.0, 'Defect separation R₀');
    if (rRes.error) {
      errors.push(rRes.error);
    } else if (rRes.num <= 0) {
      errors.push('Defect separation R₀ must be a positive number > 0.');
    } else if (Number.isFinite(L) && rRes.num >= L) {
      errors.push('Defect separation R₀ must be strictly less than box size L.');
    } else {
      pairR0 = rRes.num;
    }
  }

  // If basic parsing failed, return early
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      config: null,
      budget: null,
    };
  }

  // Derived quantities
  const dx = L / N;
  if (!Number.isFinite(dx) || dx <= 0) {
    errors.push('Grid spacing dx is not a finite positive number.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }

  const invDx2 = 1.0 / (dx * dx);
  if (!Number.isFinite(invDx2) || invDx2 <= 0) {
    errors.push('Inverse squared grid spacing is non-finite.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }

  const totalCells = raw.dimension === 1 ? N : N * N;
  if (!Number.isSafeInteger(totalCells) || totalCells <= 0 || totalCells > Number.MAX_SAFE_INTEGER / 8) {
    errors.push('Grid storage size cannot be represented safely by this JavaScript runtime.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }

  // Effective peak amplitude M for nonlinear monotonicity bound
  let effectiveBias = 0.0;
  if (raw.preset === 'plus1') {
    effectiveBias = 1.0;
  } else if (raw.preset === 'minus1') {
    effectiveBias = -1.0;
  } else if (raw.preset === 'kink_pair') {
    effectiveBias = 1.0;
  } else if (raw.preset === 'biased') {
    effectiveBias = phi0;
  } else {
    effectiveBias = phi0;
  }

  const M = Math.max(1.0, Math.abs(effectiveBias) + (raw.preset === 'random' || raw.preset === 'biased' ? eta : 0.0));
  // Conservative sufficient monotonicity limit: dt <= 1 / [ 3*M² - 1 + 2*D/dx² ]
  const denom = (3 * M * M - 1) + (2 * raw.dimension) * invDx2;
  const sufficientMonotonicityLimit = 1.0 / denom;
  const linearStabilityLimit = (dx * dx) / (dx * dx + 2.0 * raw.dimension);
  const stabilityLimit = sufficientMonotonicityLimit;
  if (!Number.isFinite(denom) || !Number.isFinite(M) || !(stabilityLimit > 0)) {
    errors.push('The derived amplitude or time-step bound cannot be represented in floating-point arithmetic.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }

  if (
    !Number.isFinite(M) ||
    !Number.isFinite(denom) ||
    denom <= 0 ||
    !Number.isFinite(sufficientMonotonicityLimit) ||
    sufficientMonotonicityLimit <= 0
  ) {
    errors.push('Derived monotonicity stability bound overflowed finite numeric bounds.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }

  if (dt > stabilityLimit) {
    errors.push(
      `Timestep Δt = ${dt} exceeds conservative monotonicity bound Δt_mono = ${stabilityLimit.toFixed(
        6
      )} for M = ${M.toFixed(2)} (derived under field-amplitude assumption |φ| ≤ M with 3M²-1). Linear stability limit is Δt_lin = ${linearStabilityLimit.toFixed(
        6
      )} (Yadav et al. 2024 Eq. 35). Decrease Δt.`
    );
  }

  // Exact duration rounding semantics
  const totalSteps = Math.ceil(duration / dt);
  if (!Number.isSafeInteger(totalSteps) || totalSteps <= 0) {
    errors.push('Total integration step count exceeds safe integer representation limits.');
    return { isValid: false, errors, warnings, config: null, budget: null };
  }
  const actualDuration = totalSteps * dt;
  if (Math.abs(actualDuration - duration) > 1e-10) {
    warnings.push(
      `Duration ${duration} is not an exact integer multiple of Δt = ${dt}. Simulation will integrate ${totalSteps} steps up to t_final = ${actualDuration.toFixed(
        4
      )}.`
    );
  }

  const cellSteps = totalSteps * totalCells;
  if (cellSteps > MAX_CELL_STEPS) {
    warnings.push(
      `High computational workload: ${cellSteps.toLocaleString()} cell-steps requested. Execution may take extended time in the browser.`
    );
  }

  // Memory & snapshot limit estimation (64 MiB snapshot history target clamped to [2, 300])
  const bytesPerCell = 8; // Float64Array element
  const bytesPerSnapshot = totalCells * bytesPerCell;
  const historyTargetBytes = 64 * 1024 * 1024; // 64 MiB
  const rawSnapshotLimit = Math.floor(historyTargetBytes / bytesPerSnapshot);
  const snapshotLimit = Math.max(2, Math.min(300, rawSnapshotLimit));

  // Estimate total memory: 3 active arrays (worker current, worker scratch, UI display) + retained snapshots
  const activeArrays = 3;
  const estimatedMemoryBytes = (activeArrays + snapshotLimit) * bytesPerSnapshot;
  const estimatedMemoryMb = estimatedMemoryBytes / (1024 * 1024);

  if (estimatedMemoryMb > 500) {
    warnings.push(
      `High estimated memory footprint (~${estimatedMemoryMb.toFixed(1)} MB). Ensure adequate system memory is available.`
    );
  }

  const safetyRatio = (dt / stabilityLimit) * 100;
  const linearSafetyRatio = (dt / linearStabilityLimit) * 100;

  const config: SimulationConfig = {
    dimension: raw.dimension,
    L,
    N,
    Nx: N,
    Ny: N,
    dx,
    dt,
    duration: actualDuration,
    seed,
    noiseAmplitude: eta,
    phi0,
    preset: raw.preset,
    pairR0,
  };

  const budget: WorkBudgetInfo = {
    totalCells,
    totalSteps,
    cellSteps,
    actualDuration,
    stabilityLimit,
    safetyRatio,
    sufficientMonotonicityLimit,
    linearStabilityLimit,
    linearSafetyRatio,
    snapshotLimit,
    estimatedMemoryBytes,
    estimatedMemoryMb,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: errors.length === 0 ? config : null,
    budget: errors.length === 0 ? budget : null,
  };
}
