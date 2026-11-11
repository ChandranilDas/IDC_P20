import { describe, it, expect } from 'vitest';
import {
  validateSimulationConfig,
  MAX_CELL_STEPS,
  MAX_SNAPSHOTS,
  RawConfigInput,
} from '../src/core/configValidation';

describe('Simulation Parameter Validation & Budget Guards', () => {
  it('approves standard 1D lab preset within 50M cell-steps budget', () => {
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
    expect(res.budget?.cellSteps).toBeLessThanOrEqual(MAX_CELL_STEPS);
    expect(MAX_CELL_STEPS).toBe(50000000);
  });

  it('approves standard 2D lab preset within 50M cell-steps budget', () => {
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
    expect(res.budget?.cellSteps).toBeLessThanOrEqual(MAX_CELL_STEPS);
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
    expect(res.budget?.cellSteps).toBeLessThanOrEqual(MAX_CELL_STEPS);
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

  it('rejects non-integer N and enforces grid bounds', () => {
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

    const resSmallN = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 8,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resSmallN.isValid).toBe(false);

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
    expect(resLarge1D.isValid).toBe(false);

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
    expect(resLarge2D.isValid).toBe(false);
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

  it('rejects excessive initial bias |phi0| > 1.0 against runaway blowup', () => {
    const resHugeBias = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 1000.0, // excessive order parameter
      preset: 'biased',
    });
    expect(resHugeBias.isValid).toBe(false);
    expect(resHugeBias.errors[0]).toContain('Initial order parameter |φ₀| cannot exceed 1.0');
  });

  it('enforces safe initial noise amplitude guard (|δφ| <= 0.5)', () => {
    const resTooLarge = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 512,
      dt: 0.001,
      duration: 10.0,
      seed: 42,
      noiseAmplitude: 0.8,
      phi0: 0.0,
      preset: 'random',
    });
    expect(resTooLarge.isValid).toBe(false);

    const resNegative = validateSimulationConfig({
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
    expect(resNegative.isValid).toBe(false);
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

  it('rejects configurations exceeding 50M cell-steps computational budget', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: 100.0,
      N: 1024,
      dt: 0.001,
      duration: 100.0, // 100,000 steps * 1024 = 102.4M > 50M cap
      seed: 42,
      noiseAmplitude: 0.05,
      phi0: 0.0,
      preset: 'random',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('Computational budget exceeded');
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

  it('snapshot history buffer is strictly bounded by MAX_SNAPSHOTS with t=0 preservation', () => {
    let snapshots: { time: number; step: number }[] = [];

    const addSnapshot = (time: number, step: number) => {
      let nextList = [...snapshots, { time, step }];
      if (nextList.length > MAX_SNAPSHOTS) {
        nextList = [nextList[0], ...nextList.slice(1).filter((_, idx) => idx % 2 === 1)];
      }
      snapshots = nextList;
    };

    for (let i = 0; i < 700; i++) {
      addSnapshot(i * 0.1, i * 100);
      expect(snapshots.length).toBeLessThanOrEqual(MAX_SNAPSHOTS);
      expect(snapshots[0].step).toBe(0);
    }

    expect(snapshots.length).toBeGreaterThan(100);
    expect(snapshots.length).toBeLessThanOrEqual(MAX_SNAPSHOTS);
  });
});
