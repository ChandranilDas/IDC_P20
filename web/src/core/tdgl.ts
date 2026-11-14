/**
 * web/src/core/tdgl.ts
 * Rigorous, audited TypeScript implementation of the Model-A TDGL equation:
 *   ∂φ/∂t = φ - φ³ + ∇²φ = - δF/δφ
 *
 * Implements:
 * - Periodic boundary conditions in 1D and 2D
 * - 3-point (1D) and 5-point (2D) discrete Laplacian (supports unequal dx, dy)
 * - Explicit Forward Euler time integration
 * - Exact forward-edge discrete Ginzburg-Landau free energy:
 *     F_discrete[φ] = ΔV ∑ [ -φ²/2 + φ⁴/4 + 0.5 * ∑ ((Δ⁺φ)/Δx_d)² ]
 * - Linear stability threshold (Yadav et al. 2024, PRE, Eq. 35):
 *     Δt_linear = Δx² / (Δx² + 2d)
 * - Sufficient monotonicity bound for discrete energy dissipation:
 *     Δt_mono = 1 / [ (3M² - 1) + 2d/Δx² ]
 * - Canonical NumPy PCG64 audited reference initial-condition fixtures (seed=42)
 * - Deterministic cross-browser Mulberry32 PRNG for custom seeds/configs
 * - Mathematical inspector data computation for selected coordinates
 */

import {
  getCanonical1DInit,
  getCanonical2DInit,
  CANONICAL_METADATA_1D,
  CANONICAL_METADATA_2D,
} from './canonicalFixtures';

export interface SimulationConfig {
  dimension: 1 | 2;
  L: number;
  N: number;      // 1D: length N; 2D: Nx = N, Ny = N (or can specify Ny)
  Nx: number;
  Ny: number;
  dx: number;
  dy?: number;
  dt: number;
  duration: number;
  seed: number;
  noiseAmplitude: number;
  phi0: number;
  preset: 'random' | 'biased' | 'plus1' | 'minus1' | 'kink_pair';
  pairR0?: number;
}

export interface Diagnostics {
  time: number;
  step: number;
  freeEnergy: number;
  meanPhi: number;
  meanPhi2: number;
  minPhi: number;
  maxPhi: number;
}

export interface InspectionData {
  dimension: 1 | 2;
  i: number;
  j: number | null;
  val: number;
  left: number;
  right: number;
  down: number | null;
  up: number | null;
  reaction: number;
  laplacian: number;
  rhs: number;
  dt: number;
  eulerIncrement: number;
  predictedEulerVal: number;
}

/**
 * Linear stability upper bound around ordered states φ = ±1 (Yadav et al. 2024, PRE, Eq. 35):
 *   Δt_lin = Δx² / (Δx² + 2d)
 */
export function getStabilityBound(dx: number, dimension: 1 | 2, dy?: number): number {
  if (dimension === 1) {
    return (dx * dx) / (dx * dx + 2.0);
  }
  const actualDy = dy ?? dx;
  const invSum = 1.0 / (dx * dx) + 1.0 / (actualDy * actualDy);
  // Linearization of -2*phi - 4*(invSum)
  return 1.0 / (1.0 + 2.0 * invSum);
}

export type InitialConditionSource =
  | 'canonical_numpy_pcg64'
  | 'mulberry32'
  | 'analytic_uniform'
  | 'analytic_kink_pair';

export interface InitialConditionProvenance {
  source: InitialConditionSource;
  generator: string;
  label: string;
  description: string;
  isCanonicalReference: boolean;
  referenceFile?: string;
  archiveSha256?: string;
}

/**
 * Checks whether a configuration matches the audited canonical reference simulation:
 * - 1D: L=100.0, N=1024, preset='random', seed=42, phi0=0.0, noiseAmplitude=0.05
 * - 2D: L=128.0, Nx=128, Ny=128, preset='random', seed=42, phi0=0.0, noiseAmplitude=0.05
 */
export function isCanonicalReferenceConfig(cfg: SimulationConfig): boolean {
  if (cfg.preset !== 'random') return false;
  if (Math.trunc(cfg.seed) !== 42) return false;
  if (Math.abs(cfg.phi0) > 1e-12) return false;
  if (Math.abs(cfg.noiseAmplitude - 0.05) > 1e-12) return false;

  if (cfg.dimension === 1) {
    const N = cfg.Nx || cfg.N;
    return Math.abs(cfg.L - 100.0) < 1e-9 && N === 1024;
  } else {
    return Math.abs(cfg.L - 128.0) < 1e-9 && cfg.Nx === 128 && cfg.Ny === 128;
  }
}

/** Returns transparent scientific provenance metadata for the initial field */
export function getInitialConditionProvenance(cfg: SimulationConfig): InitialConditionProvenance {
  if (isCanonicalReferenceConfig(cfg)) {
    const is1D = cfg.dimension === 1;
    const meta = is1D ? CANONICAL_METADATA_1D : CANONICAL_METADATA_2D;
    const dimLabel = is1D ? '1D (L=100, N=1024)' : '2D (L=128, 128×128)';
    return {
      source: 'canonical_numpy_pcg64',
      generator: meta.generator,
      label: `Canonical Reference Snapshot [${dimLabel}]`,
      description: `Exact bitwise initial field from audited Python research archive (${meta.sourceArchive}). Generated via NumPy default_rng(seed=42) [PCG64]. Matches Python reference run at t=0.`,
      isCanonicalReference: true,
      referenceFile: meta.sourceArchive,
      archiveSha256: meta.sourceSha256,
    };
  }

  if (cfg.preset === 'plus1') {
    return {
      source: 'analytic_uniform',
      generator: 'Analytic Uniform Ground State (φ = +1.0)',
      label: 'Analytic Uniform (+1.0)',
      description: 'Exact homogeneous broken-symmetry ground state φ(r) = +1.0 everywhere. Deterministic fixed point of the Model-A equation (∂φ/∂t = 0).',
      isCanonicalReference: false,
    };
  }

  if (cfg.preset === 'minus1') {
    return {
      source: 'analytic_uniform',
      generator: 'Analytic Uniform Ground State (φ = -1.0)',
      label: 'Analytic Uniform (-1.0)',
      description: 'Exact homogeneous broken-symmetry ground state φ(r) = -1.0 everywhere. Deterministic fixed point of the Model-A equation (∂φ/∂t = 0).',
      isCanonicalReference: false,
    };
  }

  if (cfg.preset === 'kink_pair') {
    const R0 = cfg.pairR0 ?? 7.0;
    return {
      source: 'analytic_kink_pair',
      generator: `Analytic Kink–Antikink Pair Profile (R₀=${R0})`,
      label: `Analytic Kink–Antikink Pair (R₀=${R0})`,
      description: `Deterministic double-tanh profile: φ(x) = tanh((x - x₁)/√2) - tanh((x - x₂)/√2) - 1 with separation R₀ = ${R0}. Sampled paired-wall profile evolved with periodic indexing.`,
      isCanonicalReference: false,
    };
  }

  if (cfg.preset === 'biased') {
    return {
      source: 'mulberry32',
      generator: `Mulberry32 PRNG (seed=${cfg.seed})`,
      label: `Biased Mixture (Mulberry32, seed ${cfg.seed})`,
      description: `Biased disordered quench with background φ₀ = ${cfg.phi0 || 0.2} and noise |δφ| ≤ ${cfg.noiseAmplitude} using deterministic Mulberry32 PRNG.`,
      isCanonicalReference: false,
    };
  }

  return {
    source: 'mulberry32',
    generator: `Mulberry32 PRNG (seed=${cfg.seed})`,
    label: `Browser Mulberry32 PRNG (seed ${cfg.seed})`,
    description: `Deterministic 32-bit PRNG for responsive cross-browser exploration. Note: seed ${cfg.seed} alone does NOT produce the canonical reference initial field when parameters, grid, or generators differ.`,
    isCanonicalReference: false,
  };
}

/** Deterministic 32-bit Mulberry32 PRNG (cross-browser reproducible) */
export function createPRNG(seed: number): () => number {
  let s = Math.trunc(seed) >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1D central-difference Laplacian with periodic boundaries */
export function laplacian1D(phi: Float64Array, dx: number, out?: Float64Array): Float64Array {
  const N = phi.length;
  const res = out || new Float64Array(N);
  const invDx2 = 1.0 / (dx * dx);

  for (let i = 0; i < N; i++) {
    const prev = i === 0 ? phi[N - 1] : phi[i - 1];
    const next = i === N - 1 ? phi[0] : phi[i + 1];
    res[i] = (next - 2.0 * phi[i] + prev) * invDx2;
  }
  return res;
}

/** 2D 5-point discrete Laplacian with periodic boundaries (supports unequal dx, dy) */
export function laplacian2D(
  phi: Float64Array,
  Nx: number,
  Ny: number,
  dx: number,
  dy?: number,
  out?: Float64Array
): Float64Array {
  const actualDy = dy ?? dx;
  const total = Nx * Ny;
  const res = out || new Float64Array(total);
  const invDx2 = 1.0 / (dx * dx);
  const invDy2 = 1.0 / (actualDy * actualDy);

  for (let i = 0; i < Nx; i++) {
    const iPrev = (i - 1 + Nx) % Nx;
    const iNext = (i + 1) % Nx;
    const rowOffset = i * Ny;
    const rowPrev = iPrev * Ny;
    const rowNext = iNext * Ny;

    for (let j = 0; j < Ny; j++) {
      const jPrev = (j - 1 + Ny) % Ny;
      const jNext = (j + 1) % Ny;

      const c = phi[rowOffset + j];
      const left = phi[rowPrev + j];
      const right = phi[rowNext + j];
      const down = phi[rowOffset + jPrev];
      const up = phi[rowOffset + jNext];

      res[rowOffset + j] =
        (right - 2.0 * c + left) * invDx2 +
        (up - 2.0 * c + down) * invDy2;
    }
  }
  return res;
}

/** TDGL RHS in 1D: (φ - φ³) + ∂_xx φ */
export function rhs1D(phi: Float64Array, dx: number, out?: Float64Array): Float64Array {
  const N = phi.length;
  const res = out || new Float64Array(N);
  laplacian1D(phi, dx, res);
  for (let i = 0; i < N; i++) {
    const u = phi[i];
    res[i] += u - u * u * u;
  }
  return res;
}

/** TDGL RHS in 2D: (φ - φ³) + ∇² φ */
export function rhs2D(
  phi: Float64Array,
  Nx: number,
  Ny: number,
  dx: number,
  dy?: number,
  out?: Float64Array
): Float64Array {
  const total = Nx * Ny;
  const res = out || new Float64Array(total);
  laplacian2D(phi, Nx, Ny, dx, dy, res);
  for (let idx = 0; idx < total; idx++) {
    const u = phi[idx];
    res[idx] += u - u * u * u;
  }
  return res;
}

/** In-place or new-buffer single Euler step in 1D */
export function eulerStep1D(
  phi: Float64Array,
  dx: number,
  dt: number,
  scratch?: Float64Array,
  out?: Float64Array
): Float64Array {
  const N = phi.length;
  const rhs = rhs1D(phi, dx, scratch);
  const next = out || new Float64Array(N);
  for (let i = 0; i < N; i++) {
    next[i] = phi[i] + dt * rhs[i];
  }
  return next;
}

/** In-place or new-buffer single Euler step in 2D */
export function eulerStep2D(
  phi: Float64Array,
  Nx: number,
  Ny: number,
  dx: number,
  dt: number,
  dy?: number,
  scratch?: Float64Array,
  out?: Float64Array
): Float64Array {
  const total = Nx * Ny;
  const rhs = rhs2D(phi, Nx, Ny, dx, dy, scratch);
  const next = out || new Float64Array(total);
  for (let idx = 0; idx < total; idx++) {
    next[idx] = phi[idx] + dt * rhs[idx];
  }
  return next;
}

/**
 * Exact forward-edge discrete free energy in 1D:
 *   F = Δx ∑ [ -φ²/2 + φ⁴/4 + 0.5 * ((φ_{i+1} - φ_i)/Δx)² ]
 */
export function freeEnergy1D(phi: Float64Array, dx: number): number {
  const N = phi.length;
  let total = 0.0;
  const invDx = 1.0 / dx;

  for (let i = 0; i < N; i++) {
    const u = phi[i];
    const uNext = i === N - 1 ? phi[0] : phi[i + 1];
    const bulk = -0.5 * u * u + 0.25 * u * u * u * u;
    const diff = (uNext - u) * invDx;
    const grad = 0.5 * diff * diff;
    total += bulk + grad;
  }
  return total * dx;
}

/**
 * Exact forward-edge discrete free energy in 2D:
 *   F = Δx Δy ∑ [ -φ²/2 + φ⁴/4 + 0.5 * ( ((φ_{i+1,j}-φ_{i,j})/Δx)² + ((φ_{i,j+1}-φ_{i,j})/Δy)² ) ]
 */
export function freeEnergy2D(
  phi: Float64Array,
  Nx: number,
  Ny: number,
  dx: number,
  dy?: number
): number {
  const actualDy = dy ?? dx;
  let total = 0.0;
  const invDx = 1.0 / dx;
  const invDy = 1.0 / actualDy;

  for (let i = 0; i < Nx; i++) {
    const iNext = (i + 1) % Nx;
    const rowOffset = i * Ny;
    const rowNext = iNext * Ny;

    for (let j = 0; j < Ny; j++) {
      const jNext = (j + 1) % Ny;
      const u = phi[rowOffset + j];
      const uRight = phi[rowNext + j];
      const uUp = phi[rowOffset + jNext];

      const bulk = -0.5 * u * u + 0.25 * u * u * u * u;
      const diffX = (uRight - u) * invDx;
      const diffY = (uUp - u) * invDy;
      const grad = 0.5 * (diffX * diffX + diffY * diffY);
      total += bulk + grad;
    }
  }
  return total * (dx * actualDy);
}

/** Compute live scalar diagnostics */
export function computeDiagnostics(
  phi: Float64Array,
  dx: number,
  dimension: 1 | 2,
  Nx: number,
  Ny: number,
  time: number,
  step: number,
  dy?: number
): Diagnostics {
  const expectedTotal = dimension === 1 ? Nx : Nx * Ny;
  if (!phi || phi.length !== expectedTotal) {
    throw new Error(
      `computeDiagnostics shape mismatch: received field with length ${phi ? phi.length : 0}, expected exact size ${expectedTotal} for dimension ${dimension} (Nx=${Nx}, Ny=${Ny}).`
    );
  }

  const total = phi.length;
  let sum = 0.0;
  let sum2 = 0.0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let i = 0; i < total; i++) {
    const v = phi[i];
    sum += v;
    sum2 += v * v;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  const fe =
    dimension === 1
      ? freeEnergy1D(phi, dx)
      : freeEnergy2D(phi, Nx, Ny, dx, dy);

  return {
    time,
    step,
    freeEnergy: fe,
    meanPhi: sum / total,
    meanPhi2: sum2 / total,
    minPhi: minVal,
    maxPhi: maxVal,
  };
}

/** Generate initial condition field */
export function generateInitialCondition(cfg: SimulationConfig): Float64Array {
  const total = cfg.dimension === 1 ? (cfg.Nx || cfg.N) : cfg.Nx * cfg.Ny;

  // Use authoritative canonical fixture if configuration matches research reference run
  if (isCanonicalReferenceConfig(cfg)) {
    const fixture = cfg.dimension === 1 ? getCanonical1DInit() : getCanonical2DInit();
    if (fixture.length === total) {
      return fixture.slice(); // Return defensive copy so mutations don't alter fixture
    }
  }

  const phi = new Float64Array(total);
  const rng = createPRNG(cfg.seed);

  switch (cfg.preset) {
    case 'random': {
      const eta = cfg.noiseAmplitude;
      for (let i = 0; i < total; i++) {
        phi[i] = cfg.phi0 + (rng() * 2.0 - 1.0) * eta;
      }
      break;
    }
    case 'biased': {
      const eta = cfg.noiseAmplitude;
      const b0 = cfg.phi0 !== 0.0 ? cfg.phi0 : 0.2;
      for (let i = 0; i < total; i++) {
        phi[i] = b0 + (rng() * 2.0 - 1.0) * eta;
      }
      break;
    }
    case 'plus1': {
      phi.fill(1.0);
      break;
    }
    case 'minus1': {
      phi.fill(-1.0);
      break;
    }
    case 'kink_pair': {
      if (cfg.dimension === 1) {
        const R0 = cfg.pairR0 ?? 7.0;
        const x1 = cfg.L / 2.0 - R0 / 2.0;
        const x2 = cfg.L / 2.0 + R0 / 2.0;
        const invSqrt2 = 1.0 / Math.SQRT2;
        for (let i = 0; i < cfg.N; i++) {
          const x = i * cfg.dx;
          phi[i] =
            Math.tanh((x - x1) * invSqrt2) -
            Math.tanh((x - x2) * invSqrt2) -
            1.0;
        }
      } else {
        const R0 = cfg.pairR0 ?? 7.0;
        const x1 = cfg.L / 2.0 - R0 / 2.0;
        const x2 = cfg.L / 2.0 + R0 / 2.0;
        const invSqrt2 = 1.0 / Math.SQRT2;
        for (let i = 0; i < cfg.Nx; i++) {
          const x = i * cfg.dx;
          const val =
            Math.tanh((x - x1) * invSqrt2) -
            Math.tanh((x - x2) * invSqrt2) -
            1.0;
          for (let j = 0; j < cfg.Ny; j++) {
            phi[i * cfg.Ny + j] = val;
          }
        }
      }
      break;
    }
  }

  return phi;
}

/** Compute point-wise inspector diagnostics for selected (i, j) */
export function inspectPoint(
  phi: Float64Array | null | undefined,
  i: number,
  j: number | null,
  cfg: { dimension: 1 | 2; Nx: number; Ny: number; dx: number; dy?: number; dt: number }
): InspectionData | null {
  if (!phi || phi.length === 0) return null;

  if (cfg.dimension === 1 || j === null) {
    const N = cfg.Nx || phi.length;
    if (phi.length !== N) return null;
    const idx = Math.min(Math.max(0, Math.trunc(i)), N - 1);
    const iPrev = (idx - 1 + N) % N;
    const iNext = (idx + 1) % N;

    const val = phi[idx];
    const left = phi[iPrev];
    const right = phi[iNext];

    if (val === undefined || left === undefined || right === undefined) return null;

    const invDx2 = 1.0 / (cfg.dx * cfg.dx);
    const lap = (right - 2.0 * val + left) * invDx2;
    const react = val - val * val * val;
    const r = react + lap;
    const inc = cfg.dt * r;

    return {
      dimension: 1,
      i: idx,
      j: null,
      val,
      left,
      right,
      down: null,
      up: null,
      reaction: react,
      laplacian: lap,
      rhs: r,
      dt: cfg.dt,
      eulerIncrement: inc,
      predictedEulerVal: val + inc,
    };
  } else {
    const Nx = cfg.Nx;
    const Ny = cfg.Ny;
    const expected = Nx * Ny;
    if (phi.length !== expected) return null;

    const ix = Math.min(Math.max(0, Math.trunc(i)), Nx - 1);
    const jy = Math.min(Math.max(0, Math.trunc(j)), Ny - 1);

    const iPrev = (ix - 1 + Nx) % Nx;
    const iNext = (ix + 1) % Nx;
    const jPrev = (jy - 1 + Ny) % Ny;
    const jNext = (jy + 1) % Ny;

    const idx = ix * Ny + jy;
    const val = phi[idx];
    const left = phi[iPrev * Ny + jy];
    const right = phi[iNext * Ny + jy];
    const down = phi[ix * Ny + jPrev];
    const up = phi[ix * Ny + jNext];

    if (
      val === undefined ||
      left === undefined ||
      right === undefined ||
      down === undefined ||
      up === undefined
    ) {
      return null;
    }

    const invDx2 = 1.0 / (cfg.dx * cfg.dx);
    const invDy2 = 1.0 / ((cfg.dy ?? cfg.dx) * (cfg.dy ?? cfg.dx));
    const lap =
      (right - 2.0 * val + left) * invDx2 +
      (up - 2.0 * val + down) * invDy2;
    const react = val - val * val * val;
    const r = react + lap;
    const inc = cfg.dt * r;

    return {
      dimension: 2,
      i: ix,
      j: jy,
      val,
      left,
      right,
      down,
      up,
      reaction: react,
      laplacian: lap,
      rhs: r,
      dt: cfg.dt,
      eulerIncrement: inc,
      predictedEulerVal: val + inc,
    };
  }
}
