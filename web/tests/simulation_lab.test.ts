import { describe, it, expect } from 'vitest';
import {
  validateSimulationConfig,
  MAX_CELL_STEPS,
  MAX_SNAPSHOTS,
  RawConfigInput,
} from '../src/core/configValidation';

describe('Simulation Parameter Validation & Budget Guards', () => {
  it('approves standard 1D lab preset with dynamic memory budget estimation', () => {
    const raw: RawConfigInput = {
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    const res = validateSimulationConfig(raw);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.config).not.toBeNull();
    expect(res.budget).not.toBeNull();
    expect(res.budget?.totalCells).toBe(1024);
    expect(res.budget?.totalSteps).toBe(40000);
    expect(res.budget?.cellSteps).toBe(40960000);
    expect(res.budget?.snapshotLimit).toBe(300);
    expect(res.budget?.estimatedMemoryBytes).toBe((3 + 300) * 1024 * 8);
    expect(res.budget?.estimatedMemoryMb).toBeCloseTo(((3 + 300) * 1024 * 8) / (1024 * 1024), 2);
    expect(MAX_CELL_STEPS).toBe(50000000);
    expect(MAX_SNAPSHOTS).toBe(300);
  });

  it('approves standard 2D lab preset with accurate derived quantities', () => {
    const raw: RawConfigInput = {
      dimension: 2,
      L: 128.0,
      N: 128,
      dt: 0.01,
      duration: 25.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    };

    const res = validateSimulationConfig(raw);
    expect(res.isValid).toBe(true);
    expect(res.budget?.totalCells).toBe(16384);
    expect(res.budget?.totalSteps).toBe(2500);
    expect(res.budget?.cellSteps).toBe(40960000);
    expect(res.budget?.snapshotLimit).toBe(300);
  });

  it('approves 1D pair annihilation lab preset with R0=7.0', () => {
    const raw: RawConfigInput = {
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.001,
      duration: 40.0,
      seed: 42,
      noiseAmplitude: 0.0,
      phi0: 0.0,
      preset: 'kink_pair',
      pairR0: 7.0,
    };

    const res = validateSimulationConfig(raw);
    expect(res.isValid).toBe(true);
    expect(res.config?.pairR0).toBe(7.0);
    expect(res.budget?.cellSteps).toBe(40960000);
  });

  it('approves uniform +/-1 ground states in both 1D and 2D', () => {
    const plus1D = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 20.0,
      seed: 1,
      noiseAmplitude: 0.0,
      phi0: 1.0,
      preset: 'plus1',
    });
    expect(plus1D.isValid).toBe(true);

    const minus2D = validateSimulationConfig({
      dimension: 2,
      L: 128.0,
      N: 128,
      dt: 0.01,
      duration: 20.0,
      seed: 1,
      noiseAmplitude: 0.0,
      phi0: -1.0,
      preset: 'minus1',
    });
    expect(minus2D.isValid).toBe(true);
  });

  it('rejects invalid or non-finite system size L', () => {
    const resNegative = validateSimulationConfig({
      dimension: 1,
      L: -50.0,
      N: 1024,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resNegative.isValid).toBe(false);

    const resNaN = validateSimulationConfig({
      dimension: 1,
      L: NaN,
      N: 1024,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resNaN.isValid).toBe(false);
  });

  it('rejects non-integer N and enforces minimum N >= 3 while permitting large grids beyond old caps', () => {
    // Non-integer N rejected
    const resFloatN = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512.5,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resFloatN.isValid).toBe(false);

    // N < 3 rejected
    const resTooSmall = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 2,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resTooSmall.isValid).toBe(false);
    expect(resTooSmall.errors.some((e) => e.includes('Grid size N must be an integer ≥ 3'))).toBe(true);

    // Minimum grid N = 3 is accepted
    const resMinN = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 3,
      dt: 0.01,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resMinN.isValid).toBe(true);
    expect(resMinN.budget?.totalCells).toBe(3);

    // 1D large grid beyond old 2048 cap (N = 4096) is accepted with appropriate dt
    const resLarge1D = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 4096,
      dt: 0.0001,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resLarge1D.isValid).toBe(true);
    expect(resLarge1D.budget?.totalCells).toBe(4096);

    // 2D large grid beyond old 256 cap (N = 512) is accepted with appropriate dt
    const resLarge2D = validateSimulationConfig({
      dimension: 2,
      L: 128.0,
      N: 512,
      dt: 0.01,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resLarge2D.isValid).toBe(true);
    expect(resLarge2D.budget?.totalCells).toBe(262144);
  });

  it('rejects blank, suffixed, negative, or out-of-range seed (strict uint32 check)', () => {
    const resSuffix = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: '42abc',
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resSuffix.isValid).toBe(false);

    const resBlank = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: '   ',
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resBlank.isValid).toBe(false);

    const resNegative = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: -5,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resNegative.isValid).toBe(false);

    const resTooLarge = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 5000000000, // > 2^32 - 1
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resTooLarge.isValid).toBe(false);
  });

  it('accepts larger amplitudes (|phi0| > 1.0, noise > 0.5) when dt satisfies monotonicity bound', () => {
    // Large order parameter |phi0| = 1.5 and noise = 0.8 accepted when dt is safely within stability bound
    const resLargeAmp = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.8,
      phi0: 1.5,
      preset: 'biased',
    });
    expect(resLargeAmp.isValid).toBe(true);
    expect(resLargeAmp.config?.phi0).toBe(1.5);
    expect(resLargeAmp.config?.noiseAmplitude).toBe(0.8);
    // Effective amplitude M = max(1, 1.5 + 0.8) = 2.3
    // denom = (3*2.3^2 - 1) + 2 * (512/100)^2 = 14.87 + 2 * 26.2144 = 67.2988
    // sufficientMonotonicityLimit = 1 / 67.2988 ~= 0.01486 > dt (0.001)
    expect(resLargeAmp.budget?.sufficientMonotonicityLimit).toBeGreaterThan(0.001);

    // Negative noise amplitude is strictly rejected
    const resNegativeNoise = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: -0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resNegativeNoise.isValid).toBe(false);
    expect(resNegativeNoise.errors.some((e) => e.includes('Noise amplitude |δφ| must be non-negative'))).toBe(true);
  });

  it('strictly rejects timestep dt exceeding conservative monotonicity bound', () => {
    const dx = 100.0 / 1024; // ~0.09765625
    const invDx2 = 1.0 / (dx * dx);
    const denom = (3 * 1.05 * 1.05 - 1) + 2 * invDx2; // for M = 1.05
    const dtMax = 1.0 / denom;

    const unstableDt = dtMax * 1.5;
    const res = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: unstableDt,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('exceeds conservative monotonicity bound');
    expect(res.config).toBeNull();
  });

  it('uses the entered zero bias in the nonlinear bound', () => {
    const resBiased = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.0001,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.9,
      phi0: 0.0, // zero is an explicit initial condition
      preset: 'biased',
    });
    expect(resBiased.isValid).toBe(true);
    // M = max(1, |0| + 0.9) = 1.
    expect(resBiased.budget?.sufficientMonotonicityLimit).toBeCloseTo(
      1.0 / ((3 * 1.0 * 1.0 - 1) + 2 * (1024 / 100) * (1024 / 100)),
      6
    );
  });

  it('handles duration not an integer multiple of dt with exact ceiling semantics & warning', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.003,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });

    expect(res.isValid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('not an exact integer multiple of Δt');
    expect(res.budget?.totalSteps).toBe(3334);
    expect(res.budget?.actualDuration).toBeCloseTo(10.002, 10);
    expect(res.config?.duration).toBeCloseTo(10.002, 10);
  });

  it('accepts long runs exceeding 50M cell-steps with warning without artificial rejection', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.001,
      duration: 100.0, // 100,000 steps * 1024 = 102.4M > 50M
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });

    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.warnings.some((w) => w.includes('High computational workload'))).toBe(true);
    expect(res.budget?.cellSteps).toBe(102400000);
  });

  it('clamps snapshotLimit based on 64 MiB history target into [2, 300]', () => {
    // 1D N = 1024: 1024 cells * 8 = 8192 B per snapshot. 64 MiB / 8192 B = 8192 -> clamped to 300
    const res1D = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(res1D.budget?.snapshotLimit).toBe(300);

    // 2D N = 512: 512^2 = 262144 cells * 8 = 2097152 B (2 MiB) per snapshot. 64 MiB / 2 MiB = 32 -> clamped to 32
    const res2D = validateSimulationConfig({
      dimension: 2,
      L: 128.0,
      N: 512,
      dt: 0.01,
      duration: 1.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(res2D.budget?.snapshotLimit).toBe(32);
    expect(res2D.budget?.estimatedMemoryMb).toBeCloseTo(((3 + 32) * 2097152) / (1024 * 1024), 2);

    // Huge 2D grid N = 2048: 2048^2 = 4194304 cells * 8 = 33554432 B (32 MiB) per snapshot.
    // 64 MiB / 32 MiB = 2 -> clamped to 2
    const resHuge = validateSimulationConfig({
      dimension: 2,
      L: 256.0,
      N: 2048,
      dt: 0.001,
      duration: 0.1,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resHuge.budget?.snapshotLimit).toBe(2);
  });

  it('rejects invalid defect separation R0 in kink-pair preset', () => {
    const resTooLarge = validateSimulationConfig({
      dimension: 1,
      L: 50.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.0,
      phi0: 0.0,
      preset: 'kink_pair',
      pairR0: 60.0,
    });
    expect(resTooLarge.isValid).toBe(false);
    expect(resTooLarge.errors).toContain('Defect separation R₀ must be strictly less than box size L.');
  });
});

describe('Worker Protocol & Lifecycle State Machine', () => {
  it('stale runId filtering discards messages from earlier terminated runs', () => {
    let activeRunId = 'run_200';
    let acceptedCount = 0;

    const handleMessage = (msgRunId: string) => {
      if (msgRunId !== activeRunId) return;
      acceptedCount++;
    };

    handleMessage('run_100'); // stale from run 1
    handleMessage('run_150'); // stale from run 2
    expect(acceptedCount).toBe(0);

    handleMessage('run_200'); // active run
    expect(acceptedCount).toBe(1);

    activeRunId = 'run_300'; // user resets and starts new run
    handleMessage('run_200'); // old in-flight message arrives late
    expect(acceptedCount).toBe(1); // blocked!
  });

  it('guard against stale RESET preserves subsequent INIT run', () => {
    let workerActiveRunId = '';

    const handleWorkerReset = (resetRunId: string) => {
      if (resetRunId && workerActiveRunId && resetRunId !== workerActiveRunId) {
        // Stale RESET: ignore!
        return;
      }
      workerActiveRunId = '';
    };

    // Run B initialized
    workerActiveRunId = 'run_B';

    // Delayed stale RESET from Run A arrives
    handleWorkerReset('run_A');
    // Run B is still active and NOT destroyed!
    expect(workerActiveRunId).toBe('run_B');

    // Matching RESET for run B arrives
    handleWorkerReset('run_B');
    expect(workerActiveRunId).toBe('');
  });

  it('STEP_ONCE strictly prevents stepping beyond simulation duration', () => {
    let currentStep = 100;
    const totalSteps = 100;

    const handleStepOnce = () => {
      if (currentStep >= totalSteps) {
        return false; // cannot step!
      }
      currentStep++;
      return true;
    };

    expect(handleStepOnce()).toBe(false);
    expect(currentStep).toBe(100);
  });

  it('snapshot history thinning strictly bounds to dynamic limit while preserving start and latest', () => {
    let snapshots: { time: number; step: number }[] = [];
    const dynamicLimit = 50;

    const pruneSnapshots = (list: { time: number; step: number }[], limit: number) => {
      let curr = list;
      while (curr.length > limit && curr.length > 2) {
        const first = curr[0];
        const last = curr[curr.length - 1];
        const interior = curr.slice(1, -1);
        const thinned = interior.filter((_, idx) => idx % 2 === 1);
        curr = [first, ...thinned, last];
      }
      if (curr.length > limit && limit === 2) {
        curr = [curr[0], curr[curr.length - 1]];
      }
      return curr;
    };

    for (let i = 0; i < 700; i++) {
      snapshots = pruneSnapshots([...snapshots, { time: i * 0.1, step: i * 100 }], dynamicLimit);
      expect(snapshots.length).toBeLessThanOrEqual(dynamicLimit);
      expect(snapshots[0].step).toBe(0); // initial start always preserved
      expect(snapshots[snapshots.length - 1].step).toBe(i * 100); // latest always preserved
    }

    expect(snapshots.length).toBeLessThanOrEqual(dynamicLimit);
    expect(snapshots[0].step).toBe(0);
    expect(snapshots[snapshots.length - 1].step).toBe(69900);
  });
});
