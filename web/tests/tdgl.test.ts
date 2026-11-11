import { describe, it, expect } from 'vitest';
import fixtures from './fixtures/tdgl_fixtures.json';
import {
  laplacian1D,
  laplacian2D,
  rhs1D,
  rhs2D,
  eulerStep1D,
  eulerStep2D,
  freeEnergy1D,
  freeEnergy2D,
  getStabilityBound,
  createPRNG,
  inspectPoint,
} from '../src/core/tdgl';

describe('TDGL TypeScript Core vs Python Fixtures', () => {
  it('1D Laplacian matches Python fixture within 1e-12', () => {
    const f1 = fixtures.one_d;
    const phi = new Float64Array(f1.initial_phi);
    const lap = laplacian1D(phi, f1.dx);

    expect(lap.length).toBe(f1.expected_laplacian.length);
    for (let i = 0; i < lap.length; i++) {
      expect(lap[i]).toBeCloseTo(f1.expected_laplacian[i], 12);
    }
  });

  it('1D RHS matches Python fixture within 1e-12', () => {
    const f1 = fixtures.one_d;
    const phi = new Float64Array(f1.initial_phi);
    const r = rhs1D(phi, f1.dx);

    for (let i = 0; i < r.length; i++) {
      expect(r[i]).toBeCloseTo(f1.expected_rhs[i], 12);
    }
  });

  it('1D single Euler step matches Python fixture within 1e-12', () => {
    const f1 = fixtures.one_d;
    const phi = new Float64Array(f1.initial_phi);
    const next = eulerStep1D(phi, f1.dx, f1.dt);

    for (let i = 0; i < next.length; i++) {
      expect(next[i]).toBeCloseTo(f1.expected_euler_step[i], 12);
    }
  });

  it('1D exact forward-edge free energy matches Python fixture within 1e-12', () => {
    const f1 = fixtures.one_d;
    const phi = new Float64Array(f1.initial_phi);
    const fe0 = freeEnergy1D(phi, f1.dx);
    expect(fe0).toBeCloseTo(f1.expected_free_energy_initial, 12);

    const next = eulerStep1D(phi, f1.dx, f1.dt);
    const fe1 = freeEnergy1D(next, f1.dx);
    expect(fe1).toBeCloseTo(f1.expected_free_energy_step1, 12);
    expect(fe1).toBeLessThan(fe0); // strict dissipation
  });

  it('1D 5-step trajectory matches Python fixture and shows strict dissipation', () => {
    const f1 = fixtures.one_d;
    let cur: Float64Array<any> = new Float64Array(f1.initial_phi);

    for (let step = 0; step < 5; step++) {
      cur = eulerStep1D(cur, f1.dx, f1.dt);
      const expectedStep = f1.trajectory_5_steps[step + 1];
      for (let i = 0; i < cur.length; i++) {
        expect(cur[i]).toBeCloseTo(expectedStep[i], 12);
      }
      const fe = freeEnergy1D(cur, f1.dx);
      expect(fe).toBeCloseTo(f1.free_energy_trajectory[step + 1], 12);
      expect(fe).toBeLessThan(f1.free_energy_trajectory[step]);
    }
  });

  it('2D Laplacian matches Python fixture within 1e-12', () => {
    const f2 = fixtures.two_d;
    // Flatten 8x8 input
    const flat = new Float64Array(f2.Nx * f2.Ny);
    for (let i = 0; i < f2.Nx; i++) {
      for (let j = 0; j < f2.Ny; j++) {
        flat[i * f2.Ny + j] = f2.initial_phi[i][j];
      }
    }

    const lap = laplacian2D(flat, f2.Nx, f2.Ny, f2.dx);
    for (let i = 0; i < f2.Nx; i++) {
      for (let j = 0; j < f2.Ny; j++) {
        expect(lap[i * f2.Ny + j]).toBeCloseTo(f2.expected_laplacian[i][j], 12);
      }
    }
  });

  it('2D RHS and Euler step match Python fixtures within 1e-12', () => {
    const f2 = fixtures.two_d;
    const flat = new Float64Array(f2.Nx * f2.Ny);
    for (let i = 0; i < f2.Nx; i++) {
      for (let j = 0; j < f2.Ny; j++) {
        flat[i * f2.Ny + j] = f2.initial_phi[i][j];
      }
    }

    const r = rhs2D(flat, f2.Nx, f2.Ny, f2.dx);
    const next = eulerStep2D(flat, f2.Nx, f2.Ny, f2.dx, f2.dt);

    for (let i = 0; i < f2.Nx; i++) {
      for (let j = 0; j < f2.Ny; j++) {
        expect(r[i * f2.Ny + j]).toBeCloseTo(f2.expected_rhs[i][j], 12);
        expect(next[i * f2.Ny + j]).toBeCloseTo(f2.expected_euler_step[i][j], 12);
      }
    }
  });

  it('2D exact forward-edge free energy matches Python fixture within 1e-12', () => {
    const f2 = fixtures.two_d;
    const flat = new Float64Array(f2.Nx * f2.Ny);
    for (let i = 0; i < f2.Nx; i++) {
      for (let j = 0; j < f2.Ny; j++) {
        flat[i * f2.Ny + j] = f2.initial_phi[i][j];
      }
    }

    const fe0 = freeEnergy2D(flat, f2.Nx, f2.Ny, f2.dx);
    expect(fe0).toBeCloseTo(f2.expected_free_energy_initial, 12);

    const next = eulerStep2D(flat, f2.Nx, f2.Ny, f2.dx, f2.dt);
    const fe1 = freeEnergy2D(next, f2.Nx, f2.Ny, f2.dx);
    expect(fe1).toBeCloseTo(f2.expected_free_energy_step1, 12);
    expect(fe1).toBeLessThan(fe0);
  });

  it('2D Rectangular Unequal-Spacing Parity Fixture (Nx != Ny, dx != dy) proves zero axis swap bugs', () => {
    const fr = (fixtures as any).two_d_rectangular;
    const flat = new Float64Array(fr.Nx * fr.Ny);
    for (let i = 0; i < fr.Nx; i++) {
      for (let j = 0; j < fr.Ny; j++) {
        flat[i * fr.Ny + j] = fr.initial_phi[i][j];
      }
    }

    const lap = laplacian2D(flat, fr.Nx, fr.Ny, fr.dx, fr.dy);
    const r = rhs2D(flat, fr.Nx, fr.Ny, fr.dx, fr.dy);
    const next = eulerStep2D(flat, fr.Nx, fr.Ny, fr.dx, fr.dt, fr.dy);
    const fe0 = freeEnergy2D(flat, fr.Nx, fr.Ny, fr.dx, fr.dy);
    const fe1 = freeEnergy2D(next, fr.Nx, fr.Ny, fr.dx, fr.dy);

    for (let i = 0; i < fr.Nx; i++) {
      for (let j = 0; j < fr.Ny; j++) {
        expect(lap[i * fr.Ny + j]).toBeCloseTo(fr.expected_laplacian[i][j], 12);
        expect(r[i * fr.Ny + j]).toBeCloseTo(fr.expected_rhs[i][j], 12);
        expect(next[i * fr.Ny + j]).toBeCloseTo(fr.expected_euler_step[i][j], 12);
      }
    }

    expect(fe0).toBeCloseTo(fr.expected_free_energy_initial, 12);
    expect(fe1).toBeCloseTo(fr.expected_free_energy_step1, 12);
    expect(fe1).toBeLessThan(fe0); // strict dissipation on rectangular grid
  });

  it('Fixed points phi = +/-1 have zero RHS and minimum free energy', () => {
    const N = 16;
    const dx = 0.5;
    const plus1 = new Float64Array(N).fill(1.0);
    const minus1 = new Float64Array(N).fill(-1.0);
    const zero = new Float64Array(N).fill(0.0);

    const rPlus = rhs1D(plus1, dx);
    const rMinus = rhs1D(minus1, dx);
    const rZero = rhs1D(zero, dx);

    for (let i = 0; i < N; i++) {
      expect(rPlus[i]).toBeCloseTo(0.0, 14);
      expect(rMinus[i]).toBeCloseTo(0.0, 14);
      expect(rZero[i]).toBeCloseTo(0.0, 14);
    }

    const L = N * dx; // 8.0
    expect(freeEnergy1D(plus1, dx)).toBeCloseTo(-0.25 * L, 12);
    expect(freeEnergy1D(minus1, dx)).toBeCloseTo(-0.25 * L, 12);
    expect(freeEnergy1D(zero, dx)).toBeCloseTo(0.0, 12);
  });

  it('Linear stability bound matches formula from Yadav et al. 2024', () => {
    // 1D: dx = 0.09765625 -> bound = dx^2 / (dx^2 + 2)
    const dx1 = 100.0 / 1024;
    const b1 = getStabilityBound(dx1, 1);
    expect(b1).toBeCloseTo((dx1 * dx1) / (dx1 * dx1 + 2.0), 12);
    expect(b1).toBeGreaterThan(0.0047);
    expect(b1).toBeLessThan(0.0048);

    // 2D: dx = 1.0 -> bound = 1 / (1 + 4) = 0.20
    const b2 = getStabilityBound(1.0, 2);
    expect(b2).toBeCloseTo(0.2, 12);
  });

  it('Mulberry32 PRNG is strictly deterministic with integer seed', () => {
    const rng1 = createPRNG(42);
    const rng2 = createPRNG(42);
    const rngDiff = createPRNG(43);

    const v1 = [rng1(), rng1(), rng1()];
    const v2 = [rng2(), rng2(), rng2()];
    const vDiff = [rngDiff(), rngDiff(), rngDiff()];

    expect(v1).toEqual(v2);
    expect(v1).not.toEqual(vDiff);
    for (const val of v1) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('Inspector accurately computes local reaction, Laplacian, and Euler predictions', () => {
    const phi = new Float64Array([0.2, 0.5, 0.8, 0.3]);
    const dx = 1.0;
    const dt = 0.01;

    const insp = inspectPoint(phi, 1, null, {
      dimension: 1,
      Nx: 4,
      Ny: 4,
      dx,
      dt,
    });

    expect(insp).not.toBeNull();
    expect(insp!.val).toBe(0.5);
    expect(insp!.left).toBe(0.2);
    expect(insp!.right).toBe(0.8);
    // reaction: 0.5 - 0.5^3 = 0.5 - 0.125 = 0.375
    expect(insp!.reaction).toBeCloseTo(0.375, 12);
    // laplacian: (0.8 - 2*0.5 + 0.2) / 1.0^2 = 0.0
    expect(insp!.laplacian).toBeCloseTo(0.0, 12);
    expect(insp!.rhs).toBeCloseTo(0.375, 12);
    expect(insp!.eulerIncrement).toBeCloseTo(0.00375, 12);
    expect(insp!.predictedEulerVal).toBeCloseTo(0.50375, 12);
  });

  it('2D Fixed points phi = +/-1 have zero Laplacian, zero RHS, and exact bulk energy', () => {
    const Nx = 8;
    const Ny = 8;
    const dx = 1.0;
    const total = Nx * Ny;
    const L = Nx * dx;

    const plus1 = new Float64Array(total).fill(1.0);
    const minus1 = new Float64Array(total).fill(-1.0);
    const zero = new Float64Array(total).fill(0.0);

    const rPlus = rhs2D(plus1, Nx, Ny, dx);
    const rMinus = rhs2D(minus1, Nx, Ny, dx);
    const rZero = rhs2D(zero, Nx, Ny, dx);

    for (let idx = 0; idx < total; idx++) {
      expect(rPlus[idx]).toBeCloseTo(0.0, 14);
      expect(rMinus[idx]).toBeCloseTo(0.0, 14);
      expect(rZero[idx]).toBeCloseTo(0.0, 14);
    }

    const volume = L * L;
    expect(freeEnergy2D(plus1, Nx, Ny, dx)).toBeCloseTo(-0.25 * volume, 12);
    expect(freeEnergy2D(minus1, Nx, Ny, dx)).toBeCloseTo(-0.25 * volume, 12);
    expect(freeEnergy2D(zero, Nx, Ny, dx)).toBeCloseTo(0.0, 12);
  });

  it('2D Corner periodic wrapping accurately connects opposite boundaries', () => {
    const Nx = 4;
    const Ny = 4;
    const dx = 1.0;
    const total = Nx * Ny;
    const phi = new Float64Array(total);

    // Place an isolated delta spike at bottom-left corner (0, 0)
    phi[0 * Ny + 0] = 1.0;

    const lap = laplacian2D(phi, Nx, Ny, dx);

    // Center cell (0, 0) should have -4 * 1.0 / 1.0^2 = -4.0
    expect(lap[0 * Ny + 0]).toBeCloseTo(-4.0, 12);

    // Neighbor right is (1, 0)
    expect(lap[1 * Ny + 0]).toBeCloseTo(1.0, 12);
    // Neighbor up is (0, 1)
    expect(lap[0 * Ny + 1]).toBeCloseTo(1.0, 12);
    // Neighbor left (wrapped) is (Nx - 1, 0) = (3, 0)
    expect(lap[3 * Ny + 0]).toBeCloseTo(1.0, 12);
    // Neighbor down (wrapped) is (0, Ny - 1) = (0, 3)
    expect(lap[0 * Ny + 3]).toBeCloseTo(1.0, 12);
  });

  it('2D Inspector correctly identifies periodic wrapped neighbors at boundary', () => {
    const Nx = 4;
    const Ny = 4;
    const dx = 1.0;
    const dt = 0.01;
    const phi = new Float64Array(Nx * Ny);
    for (let i = 0; i < Nx; i++) {
      for (let j = 0; j < Ny; j++) {
        phi[i * Ny + j] = i * 10 + j;
      }
    }

    // Inspect corner point (0, 0)
    const insp = inspectPoint(phi, 0, 0, { dimension: 2, Nx, Ny, dx, dt });
    expect(insp).not.toBeNull();
    expect(insp!.val).toBe(0); // (0, 0)
    expect(insp!.left).toBe(30); // (3, 0)
    expect(insp!.right).toBe(10); // (1, 0)
    expect(insp!.down).toBe(3); // (0, 3)
    expect(insp!.up).toBe(1); // (0, 1)
  });
});
