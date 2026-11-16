import {describe,it,expect} from 'vitest';
import {validateSimulationConfig, type RawConfigInput} from '../src/core/configValidation';
const base:RawConfigInput={dimension:1,L:100,N:1024,dt:.001,duration:1000,seed:42,noiseAmplitude:.05,phi0:0,preset:'random'};
describe('Extended live configuration boundaries',()=>{
 it('accepts full research time windows and larger grids with work estimates',()=>{
  for(const raw of [base,{...base,dimension:2 as const,L:128,N:128,dt:.01,duration:100},{...base,N:8192,L:8192,dt:.01},{...base,dimension:2 as const,N:512,L:512,dt:.01,duration:1000}]){
   const r=validateSimulationConfig(raw);expect(r.errors).toEqual([]);expect(r.isValid).toBe(true);expect(r.budget!.cellSteps).toBeGreaterThan(50e6);expect(r.warnings.some(w=>/work|time/i.test(w))).toBe(true);
  }
 });
 it('accepts larger initial fields when the time step resolves their nonlinear relaxation',()=>{
  const r=validateSimulationConfig({...base,L:128,N:128,noiseAmplitude:2,phi0:2.5,preset:'biased'});expect(r.errors).toEqual([]);expect(r.isValid).toBe(true);
 });
 it('rejects step counts that cannot be represented exactly',()=>{
  const r=validateSimulationConfig({...base,duration:1e20});expect(r.isValid).toBe(false);expect(r.errors.join(' ')).toMatch(/step|represent|integer/i);
 });
 it('rejects overflow in the derived amplitude/time-step bound',()=>{
  const r=validateSimulationConfig({...base,phi0:1e200,dt:1e-300});expect(r.isValid).toBe(false);
 });
 it('retains at least two fields and scales history by field memory',()=>{
  const r=validateSimulationConfig({...base,dimension:2,N:500,L:500});expect(r.isValid).toBe(true);expect(r.budget!.snapshotLimit).toBe(33);expect(r.budget!.estimatedMemoryBytes).toBeGreaterThan(0);
 });
});
