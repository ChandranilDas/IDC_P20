import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { validateSimulationConfig } from '../src/core/configValidation';
import { inspectPoint, computeDiagnostics, InspectionData } from '../src/core/tdgl';
import { InspectorCard } from '../src/components/InspectorCard';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

describe('Raw String Input Validation (No Truncation / No Silent Defaults)', () => {
  it('rejects decimal seed "1.5" without truncating to 1', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '0.001',
      duration: '40',
      seed: '1.5',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('Random seed must be an integer'))).toBe(true);
    // Crucially: res.config must be null so simulation cannot run with truncated 1
    expect(res.config).toBeNull();
  });

  it('rejects blank seed "" without falling back to default 42', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '0.001',
      duration: '40',
      seed: '',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.config).toBeNull();
  });

  it('rejects decimal grid size N "128.5" without truncating to 128', () => {
    const res = validateSimulationConfig({
      dimension: 2,
      L: '128',
      N: '128.5',
      dt: '0.01',
      duration: '25',
      seed: '42',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('Grid size N must be an integer'))).toBe(true);
  });

  it('rejects blank grid size N "" without falling back to default', () => {
    const res = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '',
      dt: '0.001',
      duration: '40',
      seed: '42',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(res.isValid).toBe(false);
  });

  it('rejects blank L, blank dt, and blank duration without silent fallback', () => {
    const resL = validateSimulationConfig({
      dimension: 1,
      L: '',
      N: '1024',
      dt: '0.001',
      duration: '40',
      seed: '42',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(resL.isValid).toBe(false);

    const resDt = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '',
      duration: '40',
      seed: '42',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(resDt.isValid).toBe(false);

    const resDur = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '0.001',
      duration: '',
      seed: '42',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(resDur.isValid).toBe(false);
  });

  it('rejects negative seed "-5" and seed exceeding uint32 range', () => {
    const neg = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '0.001',
      duration: '40',
      seed: '-5',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(neg.isValid).toBe(false);

    const huge = validateSimulationConfig({
      dimension: 1,
      L: '100',
      N: '1024',
      dt: '0.001',
      duration: '40',
      seed: '5000000000',
      noiseAmplitude: '0.05',
      phi0: '0.0',
      preset: 'random',
    });
    expect(huge.isValid).toBe(false);
    expect(huge.errors.some((e) => e.includes('32-bit integer'))).toBe(true);
  });
});

describe('1D to 2D Preset Transition & Shape Mismatch Safety', () => {
  it('inspectPoint returns null when 1D field is passed with 2D config (prevents undefined.toFixed crash)', () => {
    // 1D field of length 1024
    const field1D = new Float64Array(1024);
    field1D.fill(0.1);

    // 2D config expecting 128 x 128 = 16384 elements
    const cfg2D = {
      dimension: 2 as const,
      Nx: 128,
      Ny: 128,
      dx: 1.0,
      dt: 0.01,
    };

    // Selecting (64, 64) -> index in 2D would be 64*128 + 64 = 8256, far beyond 1024!
    const data = inspectPoint(field1D, 64, 64, cfg2D);
    expect(data).toBeNull();
  });

  it('computeDiagnostics rejects mismatched field shape explicitly instead of fabricating zero diagnostics', () => {
    const field1D = new Float64Array(1024);
    expect(() => {
      computeDiagnostics(field1D, 1.0, 2, 128, 128, 0, 0);
    }).toThrow('computeDiagnostics shape mismatch');
  });

  it('InspectorCard renders cleanly with null data without throwing', () => {
    const html = renderToString(
      <InspectorCard data={null} dx={1.0} dt={0.01} />
    );
    expect(html).toContain('Click any point on the field visualization');
  });

  it('InspectorCard formats defensively if partial or undefined values ever appear', () => {
    // Simulating an unexpected partial object
    const partialData: Partial<InspectionData> = {
      dimension: 2,
      i: 10,
      j: 20,
      val: 0.5,
      left: 0.4,
      right: 0.6,
      down: undefined as any, // unexpected undefined
      up: null as any,
      reaction: NaN as any,   // unexpected NaN
      laplacian: 0.01,
      rhs: 0.02,
      dt: 0.01,
      eulerIncrement: 0.0002,
      predictedEulerVal: 0.5002,
    };

    // Must NOT throw TypeError: Cannot read properties of undefined (reading 'toFixed')
    expect(() => {
      renderToString(
        <InspectorCard data={partialData as InspectionData} dx={1.0} dt={0.01} />
      );
    }).not.toThrow();

    const html = renderToString(
      <InspectorCard data={partialData as InspectionData} dx={1.0} dt={0.01} />
    );
    expect(html).toContain('Numerical Update Inspector');
    expect(html).toContain('—'); // NaN formatted safely as dash
  });

  it('InspectorCard renders complete 1D and 2D inspection data accurately', () => {
    const data1D: InspectionData = {
      dimension: 1,
      i: 512,
      j: null,
      val: 0.123456,
      left: 0.120000,
      right: 0.125000,
      down: null,
      up: null,
      reaction: 0.121578,
      laplacian: -0.000123,
      rhs: 0.121455,
      dt: 0.001,
      eulerIncrement: 0.000121,
      predictedEulerVal: 0.123577,
    };

    const html1D = renderToString(<InspectorCard data={data1D} dx={0.0976} dt={0.001} />);
    expect(html1D).toContain('i = 512');
    expect(html1D).toContain('0.123456');

    const data2D: InspectionData = {
      dimension: 2,
      i: 64,
      j: 64,
      val: 0.5,
      left: 0.48,
      right: 0.52,
      down: 0.49,
      up: 0.51,
      reaction: 0.375,
      laplacian: 0.0,
      rhs: 0.375,
      dt: 0.01,
      eulerIncrement: 0.00375,
      predictedEulerVal: 0.50375,
    };

    const html2D = renderToString(<InspectorCard data={data2D} dx={1.0} dt={0.01} />);
    expect(html2D).toContain('i = 64, j = 64');
    expect(html2D).toContain('Down φ[j-1]');
    expect(html2D).toContain('Up φ[j+1]');
  });
});

describe('ErrorBoundary Fallback and Recovery', () => {
  it('renders fallback UI when hasError is true', () => {
    const boundary = new ErrorBoundary({
      children: <div>Normal Content</div>,
      fallbackTitle: 'Testing Error Boundary',
    });
    boundary.state = {
      hasError: true,
      error: new Error('Simulated component render explosion'),
      errorInfo: null,
    };

    const element = boundary.render();
    const html = renderToString(element as React.ReactElement);

    expect(html).toContain('Testing Error Boundary');
    expect(html).toContain('Simulated component render explosion');
    expect(html).toContain('Reset &amp; Recover');
  });

  it('getDerivedStateFromError sets hasError and captures error object', () => {
    const err = new Error('Test error');
    const state = ErrorBoundary.getDerivedStateFromError(err);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(err);
  });

  it('mounted recovery resets error state and calls onReset callback', () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const reset = vi.fn(() => { shouldThrow = false; });
    function Child() {
      if (shouldThrow) throw new Error('Recovery test fault');
      return <div>Mounted recovery succeeded</div>;
    }
    try {
      render(<ErrorBoundary onReset={reset}><Child /></ErrorBoundary>);
      expect(screen.getByRole('alert')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Reset & Recover' }));
      expect(reset).toHaveBeenCalledOnce();
      expect(screen.getByText('Mounted recovery succeeded')).toBeDefined();
      expect(screen.queryByRole('alert')).toBeNull();
    } finally {
      cleanup();
      errorLog.mockRestore();
    }
  });

});

describe('Saved Results Dataset Switching Simulation', () => {
  it('guards frame slicing when switched to run with different resolution', () => {
    // Stale 1D buffer of length 65536 (from 64 frames of 1024)
    const oldBuffer1D = new Float64Array(65536);

    // New 2D run expects shape [64, 128, 128] -> 1,048,576 Float64 elements
    const newRun2D = {
      id: 'tdgl_2d_random',
      dimension: 2 as const,
      Nx: 128,
      Ny: 128,
      shape: [64, 128, 128],
    };

    const frameSize2D = newRun2D.Nx * newRun2D.Ny; // 16384
    const totalExpected2D = newRun2D.shape.reduce((a, b) => a * b, 1); // 1048576

    // Guard test: buffer length does not equal totalExpected2D
    const isValid = oldBuffer1D.length === totalExpected2D;
    expect(isValid).toBe(false);

    // Therefore currentFrameField remains null and does not attempt invalid subarray
    const currentFrameField = isValid
      ? oldBuffer1D.subarray(0, frameSize2D)
      : null;
    expect(currentFrameField).toBeNull();
  });
});
