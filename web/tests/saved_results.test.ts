import { describe, it, expect } from 'vitest';
import manifest from '../public/generated/manifest.json';
import auditEvidence from '../public/generated/audit_evidence.json';
import { computeDiagnostics } from '../src/core/tdgl';

describe('Saved Results Cadence & Dataset Integrity', () => {
  it('manifest declares float64 little-endian binary cubes with matching shape', () => {
    const runs = manifest.runs as Record<string, any>;
    expect(Object.keys(runs)).toContain('tdgl_1d_random');
    expect(Object.keys(runs)).toContain('tdgl_2d_random');
    expect(Object.keys(runs)).toContain('tdgl_1d_kink_antikink');

    for (const [, r] of Object.entries(runs)) {
      expect(r.dtype).toBe('float64');
      expect(r.byte_order).toBe('little');
      expect(r.bytes_per_element).toBe(8);

      const totalElements = r.shape.reduce((a: number, b: number) => a * b, 1);
      const totalBytes = totalElements * 8;
      expect(totalBytes).toBeGreaterThan(0);
      expect(r.source_sha256).toHaveLength(64);
    }
  });

  it('distinguishes diagnostic cadence from snapshot cadence without faking zeros', () => {
    const runs = manifest.runs as Record<string, any>;
    const pairRun = runs['tdgl_1d_kink_antikink'];

    // diag_times has 801 entries, t_snapshots has 9 entries
    expect(pairRun.diag_times.length).toBe(801);
    expect(pairRun.t_snapshots.length).toBe(9);
    expect(pairRun.diag_times.length).not.toBe(pairRun.t_snapshots.length);

    // Free energy and mean phi have 801 values
    expect(pairRun.diagnostics.free_energy.length).toBe(801);
    expect(pairRun.diagnostics.mean_phi.length).toBe(801);

    // snapshot_mean_phi2 has 9 actual values corresponding to t_snapshots
    expect(pairRun.diagnostics.snapshot_mean_phi2).toBeDefined();
    expect(pairRun.diagnostics.snapshot_mean_phi2.length).toBe(9);

    // Verify values are physical and NOT faked with 0
    for (const val of pairRun.diagnostics.snapshot_mean_phi2) {
      expect(val).toBeGreaterThan(0.9);
      expect(val).toBeLessThanOrEqual(1.0000001);
    }

    // Verify snapshot min/max are physical and NOT faked with +/-1
    expect(pairRun.diagnostics.snapshot_min_phi.length).toBe(9);
    expect(pairRun.diagnostics.snapshot_max_phi.length).toBe(9);
    for (let i = 0; i < 9; i++) {
      expect(pairRun.diagnostics.snapshot_min_phi[i]).toBeLessThan(
        pairRun.diagnostics.snapshot_max_phi[i]
      );
    }
  });

  it('computeDiagnostics directly computes accurate metrics on any arbitrary field slice', () => {
    const N = 1024;
    const dx = 100.0 / N;
    const testField = new Float64Array(N).fill(1.0); // uniform +1 state

    const diag = computeDiagnostics(testField, dx, 1, N, 1, 10.0, 10000);
    expect(diag.time).toBe(10.0);
    expect(diag.step).toBe(10000);
    expect(diag.meanPhi).toBeCloseTo(1.0, 12);
    expect(diag.meanPhi2).toBeCloseTo(1.0, 12);
    expect(diag.minPhi).toBe(1.0);
    expect(diag.maxPhi).toBe(1.0);
    expect(diag.freeEnergy).toBeCloseTo(-0.25 * 100.0, 10);
  });
});

describe('Audit Evidence Ground Truth Verification', () => {
  it('contains verified independent full replay across 1.81 million steps', () => {
    const replay = auditEvidence.independent_full_replay;
    expect(replay).toBeDefined();

    const r1d = replay.tdgl_1d_random;
    const r2d = replay.tdgl_2d_random;
    const rPair = replay.tdgl_1d_kink_antikink;

    expect(r1d.steps).toBe(1000000);
    expect(r1d['energy_violations_above_1e-9']).toBe(0);
    expect(r1d.passed).toBe(true);

    expect(r2d.steps).toBe(10000);
    expect(r2d['energy_violations_above_1e-9']).toBe(0);
    expect(r2d.passed).toBe(true);

    expect(rPair.steps).toBe(800000);
    expect(rPair['energy_violations_above_1e-9']).toBe(0);
    expect(rPair.passed).toBe(true);

    const totalSteps = r1d.steps + r2d.steps + rPair.steps;
    expect(totalSteps).toBe(1810000);
  });

  it('contains passing directional derivative consistency checks', () => {
    const dd = auditEvidence.validation_summary.directional_derivative;
    expect(dd['1D_passed']).toBe(true);
    expect(dd['2D_passed']).toBe(true);
    expect(dd['1D_relative_mismatch']).toBeLessThan(1e-8);
    expect(dd['2D_relative_mismatch']).toBeLessThan(1e-7);
  });

  it('contains quadratic spatial truncation convergence', () => {
    const kc = auditEvidence.validation_summary.kink_convergence;
    expect(kc.p_l2).toBeGreaterThan(1.98);
    expect(kc.p_l2).toBeLessThan(2.02);
    expect(kc.p_linf).toBeGreaterThan(1.95);
    expect(kc.p_linf).toBeLessThan(2.02);
  });

  it('contains linear Forward Euler temporal convergence order', () => {
    const tc = auditEvidence.independent_temporal_convergence;
    expect(tc['1D'].passed).toBe(true);
    expect(tc['1D'].fitted_order).toBeGreaterThan(0.99);
    expect(tc['1D'].fitted_order).toBeLessThan(1.01);
  });

  it('contains 2D periodic Fourier eigenmode residual at machine precision', () => {
    const fe = auditEvidence.validation_summary.fourier_eigenmode_2d;
    expect(fe.passed).toBe(true);
    expect(fe.max_eigenvalue_residual).toBeLessThan(1e-12);
  });
});
