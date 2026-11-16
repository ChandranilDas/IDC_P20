import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import type {SimulationConfig} from '../src/core/tdgl';
let clock=0, messages:any[], host:any;
const config:SimulationConfig={dimension:1,L:32,N:32,Nx:32,Ny:32,dx:1,dt:.01,duration:10,seed:42,noiseAmplitude:.05,phi0:0,preset:'random'};
const send=(type:string,extra={})=>host.onmessage({data:{type,runId:'pace',...extra}});
beforeEach(async()=>{vi.resetModules();clock=0;messages=[];vi.spyOn(performance,'now').mockImplementation(()=>clock);vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});host={onmessage:null,postMessage:(m:any)=>messages.push(m)};vi.stubGlobal('self',host);await import('../src/workers/simulation.worker');send('INIT',{config});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function tick(at:number){clock=at;await vi.advanceTimersToNextTimerAsync();}
const latest=()=>messages.filter(m=>m.diagnostics).at(-1);
describe('Live simulation wall-clock pacing',()=>{
 for(const speed of [.5,1,2,5])it(`${speed}x advances ${speed} simulation units per second`,async()=>{send('START',{speed});await tick(1000);expect(latest().diagnostics.time).toBe(speed);expect(messages.some(m=>m.type==='COMPLETED')).toBe(false);});
 it('freezes during pause and rebases speed changes',async()=>{send('START');await tick(1000);send('PAUSE');clock=100000;send('RESUME');await tick(101000);expect(latest().diagnostics.time).toBe(2);send('SET_SPEED',{speed:2});await tick(102000);expect(latest().diagnostics.time).toBe(4);});
 it('produces identical final numerical fields at different viewing speeds',async()=>{send('START',{speed:.5});await tick(20000);const a=messages.find(m=>m.type==='COMPLETED').field;send('INIT',{config});send('START',{speed:5});await tick(22000);const b=messages.filter(m=>m.type==='COMPLETED').at(-1).field;expect(Array.from(a)).toEqual(Array.from(b));expect(latest().diagnostics.step).toBe(1000);});
});
it('takes about two real seconds to reach t=2 at 1x',async()=>{
 vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
 send('INIT',{config:{...config,duration:2}});
 const started=performance.now();send('START',{speed:1});
 await new Promise<void>((resolve,reject)=>{const poll=setInterval(()=>{if(messages.some(m=>m.type==='COMPLETED')){clearInterval(poll);resolve();}else if(performance.now()-started>4000){clearInterval(poll);reject(new Error('Real-time run did not finish'));}},10);});
 const elapsed=performance.now()-started;expect(elapsed).toBeGreaterThanOrEqual(1990);expect(elapsed).toBeLessThan(2600);
});
