import { describe, it, expect } from 'vitest';
import {
  generateInitialCondition,
  eulerStep1D,
  eulerStep2D,
  freeEnergy1D,
  freeEnergy2D,
  getInitialConditionProvenance,
  isCanonicalReferenceConfig,
  SimulationConfig,
} from '../src/core/tdgl';
import {
  CANONICAL_1D_INIT,
  CANONICAL_1D_T1,
  CANONICAL_2D_INIT,
  CANONICAL_2D_T1,
} from '../src/core/canonicalFixtures';

function maxDiff(a: Float64Array, b: Float64Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

describe('Canonical Reference Fixtures & Initial Field Parity', () => {
  it('1D default reference IC matches CANONICAL_1D_INIT bitwise', () => {
    const cfg: SimulationConfig = {
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    expect(isCanonicalReferenceConfig(cfg)).toBe(true);
    const field = generateInitialCondition(cfg);
    expect(field.length).toBe(1024);
    expect(maxDiff(field, CANONICAL_1D_INIT)).toBe(0);

    // Verify defensive copying (mutations do not taint fixture)
    field[0] = 999.0;
    expect(CANONICAL_1D_INIT[0]).not.toBe(999.0);
  });

  it('2D default reference IC matches CANONICAL_2D_INIT bitwise', () => {
    const cfg: SimulationConfig = {
      dimension: 2,
      L: 128.0,
      N: 128,
      Nx: 128,
      Ny: 128,
      dx: 1.0,
      dy: 1.0,
      dt: 0.01,
      duration: 25.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    expect(isCanonicalReferenceConfig(cfg)).toBe(true);
    const field = generateInitialCondition(cfg);
    expect(field.length).toBe(128 * 128);
    expect(maxDiff(field, CANONICAL_2D_INIT)).toBe(0);

    // Verify defensive copying
    field[0] = 999.0;
    expect(CANONICAL_2D_INIT[0]).not.toBe(999.0);
  });

  it('1D short trajectory (1000 steps, dt=0.001) from t=0 to t=1.0 matches CANONICAL_1D_T1', () => {
    const cfg: SimulationConfig = {
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    let field = generateInitialCondition(cfg);
    for (let step = 0; step < 1000; step++) {
      field = eulerStep1D(field, cfg.dx, cfg.dt);
    }

    const err = maxDiff(field, CANONICAL_1D_T1);
    expect(err).toBeLessThan(1e-12);
  });

  it('2D short trajectory (100 steps, dt=0.01) from t=0 to t=1.0 matches CANONICAL_2D_T1', () => {
    const cfg: SimulationConfig = {
      dimension: 2,
      L: 128.0,
      N: 128,
      Nx: 128,
      Ny: 128,
      dx: 1.0,
      dy: 1.0,
      dt: 0.01,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    let field = generateInitialCondition(cfg);
    for (let step = 0; step < 100; step++) {
      field = eulerStep2D(field, cfg.Nx, cfg.Ny, cfg.dx, cfg.dt, cfg.dy);
    }

    const err = maxDiff(field, CANONICAL_2D_T1);
    expect(err).toBeLessThan(1e-12);
  });

  it('accurately identifies provenance across canonical, mulberry32, uniform, and kink presets', () => {
    // Canonical 1D
    const p1 = getInitialConditionProvenance({
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(p1.isCanonicalReference).toBe(true);
    expect(p1.source).toBe('canonical_numpy_pcg64');
    expect(p1.referenceFile).toBe('results/raw/tdgl_1d_random.npz');

    // Canonical 2D
    const p2 = getInitialConditionProvenance({
      dimension: 2,
      L: 128.0,
      N: 128,
      Nx: 128,
      Ny: 128,
      dx: 1.0,
      dy: 1.0,
      dt: 0.01,
      duration: 25.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(p2.isCanonicalReference).toBe(true);
    expect(p2.source).toBe('canonical_numpy_pcg64');
    expect(p2.referenceFile).toBe('results/raw/tdgl_2d_random.npz');

    // Custom seed on 1D -> Mulberry32
    const pCustomSeed = getInitialConditionProvenance({
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 99,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(pCustomSeed.isCanonicalReference).toBe(false);
    expect(pCustomSeed.source).toBe('mulberry32');

    // Custom grid size on 2D -> Mulberry32
    const pCustomGrid = getInitialConditionProvenance({
      dimension: 2,
      L: 128.0,
      N: 64,
      Nx: 64,
      Ny: 64,
      dx: 2.0,
      dy: 2.0,
      dt: 0.01,
      duration: 25.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(pCustomGrid.isCanonicalReference).toBe(false);
    expect(pCustomGrid.source).toBe('mulberry32');

    // Uniform +1
    const pPlus = getInitialConditionProvenance({
      dimension: 1,
      L: 100.0,
      N: 512,
      Nx: 512,
      Ny: 1,
      dx: 100.0 / 512,
      dt: 0.001,
      duration: 20.0,
      seed: 1,
      noiseAmplitude: 0.0,
      phi0: 1.0,
      preset: 'plus1',
    });
    expect(pPlus.source).toBe('analytic_uniform');
    expect(pPlus.isCanonicalReference).toBe(false);
    expect(pPlus.label).toContain('Analytic Uniform');

    // Uniform -1
    const pMinus = getInitialConditionProvenance({
      dimension: 2,
      L: 128.0,
      N: 128,
      Nx: 128,
      Ny: 128,
      dx: 1.0,
      dt: 0.01,
      duration: 20.0,
      seed: 1,
      noiseAmplitude: 0.0,
      phi0: -1.0,
      preset: 'minus1',
    });
    expect(pMinus.source).toBe('analytic_uniform');
    expect(pMinus.isCanonicalReference).toBe(false);
    expect(pMinus.label).toContain('Analytic Uniform');

    // Kink-antikink pair
    const pKink = getInitialConditionProvenance({
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.0,
      phi0: 0.0,
      preset: 'kink_pair',
      pairR0: 7.0,
    });
    expect(pKink.source).toBe('analytic_kink_pair');
    expect(pKink.isCanonicalReference).toBe(false);
    expect(pKink.label).toContain('Kink–Antikink');

    // Biased
    const pBiased = getInitialConditionProvenance({
      dimension: 1,
      L: 100.0,
      N: 1024,
      Nx: 1024,
      Ny: 1,
      dx: 100.0 / 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.2,
      preset: 'biased',
    });
    expect(pBiased.source).toBe('mulberry32');
    expect(pBiased.label).toContain('Biased Mixture');
  });

  it('preserves unshifted Model-A ground state free energy (-volume / 4)', () => {
    // 1D: L = 100, N = 1024. phi = 1.0 => V = -1/2 + 1/4 = -1/4. F = -100 / 4 = -25.0
    const phi1D = new Float64Array(1024).fill(1.0);
    const fe1D = freeEnergy1D(phi1D, 100.0 / 1024);
    expect(fe1D).toBeCloseTo(-25.0, 10);

    // 2D: L = 128, Nx = Ny = 128. phi = 1.0 => F = -(128 * 128) / 4 = -4096.0
    const phi2D = new Float64Array(128 * 128).fill(1.0);
    const fe2D = freeEnergy2D(phi2D, 128, 128, 1.0, 1.0);
    expect(fe2D).toBeCloseTo(-4096.0, 10);
  });
});
