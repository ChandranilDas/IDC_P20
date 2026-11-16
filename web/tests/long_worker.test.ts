import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {SimulationConfig} from '../src/core/tdgl';
import manifest from '../public/generated/manifest.json';
let clock = 0;
let host:{onmessage:any;postMessage:any};let messages:any[];
beforeEach(async()=>{vi.resetModules();clock=0;vi.spyOn(performance,'now').mockImplementation(()=>clock);messages=[];host={onmessage:null,postMessage:(m:any)=>messages.push(m)};vi.stubGlobal('self',host);vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});await import('../src/workers/simulation.worker');});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const send=(type:string,config?:SimulationConfig,runId='long-test')=>host.onmessage({data:{type,runId,config}});
function cfg(dimension:1|2,overrides:Partial<SimulationConfig>={}):SimulationConfig{const N=dimension===1?1024:128,L=dimension===1?100:128;return {dimension,L,N,Nx:N,Ny:N,dx:L/N,dt:dimension===1?.001:.01,duration:dimension===1?1000:100,seed:42,noiseAmplitude:.05,phi0:0,preset:'random',...overrides};}
function finalArchive(id:'tdgl_1d_random'|'tdgl_2d_random'){const run=manifest.runs[id];const b=readFileSync(resolve('public',run.binary_file.replace(/^\//,'')));const a=new Float64Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));const n=run.shape.slice(1).reduce((p,n)=>p*n,1);return a.slice(-n);}
describe('Actual browser worker: extended numerical trajectories',()=>{
 for(const [dimension,id] of [[1,'tdgl_1d_random'],[2,'tdgl_2d_random']] as const){
  it(`executes full ${dimension}D trajectory beyond the old work cap`,async()=>{const c=cfg(dimension);send('INIT',c);send('START');clock=1e9;await vi.runAllTimersAsync();expect(messages.filter(m=>m.type==='ERROR')).toEqual([]);const end=messages.find(m=>m.type==='COMPLETED');expect(end).toBeDefined();expect(end.diagnostics.step).toBe(Math.ceil(c.duration/c.dt));expect(end.diagnostics.time).toBe(c.duration);const expected=finalArchive(id);let maxError=0;for(let i=0;i<expected.length;i++)maxError=Math.max(maxError,Math.abs(expected[i]-end.field[i]));expect(maxError).toBeLessThan(1e-10);expect(messages.filter(m=>m.type==='TICK'&&m.isSnapshot).length).toBeLessThanOrEqual(201);},120000);
 }
 it('yields so a long job can pause, resume and reset without stale completion',async()=>{const c=cfg(1,{duration:10000});send('INIT',c);send('START');clock=100;await vi.advanceTimersToNextTimerAsync();send('PAUSE');const paused=messages.filter(m=>m.type==='PAUSED').at(-1);expect(paused.diagnostics.step).toBeGreaterThan(0);expect(paused.diagnostics.time).toBeLessThan(c.duration);expect(vi.getTimerCount()).toBe(0);send('RESUME');clock+=100;await vi.advanceTimersToNextTimerAsync();send('RESET');await vi.runAllTimersAsync();expect(messages.some(m=>m.type==='COMPLETED')).toBe(false);expect(messages.at(-1).type).toBe('RESET_ACK');});
 it('honors an explicitly entered zero bias instead of substituting the preset default',async()=>{send('INIT',cfg(1,{N:32,Nx:32,Ny:32,dx:1,dt:.01,duration:1,preset:'biased',phi0:0,noiseAmplitude:0}));send('START');clock=1e9;await vi.runAllTimersAsync();const end=messages.find(m=>m.type==='COMPLETED');expect(end).toBeDefined();expect(end.diagnostics.meanPhi2).toBe(0);});
 it('reports overflow instead of claiming a successful result',async()=>{send('INIT',cfg(1,{N:32,Nx:32,Ny:32,dx:1,phi0:1e100,noiseAmplitude:0,preset:'random'}));send('START');clock=1e9;await vi.runAllTimersAsync();expect(messages.some(m=>m.type==='ERROR')).toBe(true);expect(messages.some(m=>m.type==='COMPLETED')).toBe(false);});
});
