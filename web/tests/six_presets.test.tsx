import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,fireEvent,screen,cleanup} from '@testing-library/react';
import {mkdirSync,writeFileSync} from 'node:fs';
import {SimulationLab} from '../src/views/SimulationLab';
vi.mock('../src/components/FieldCanvas',()=>({FieldCanvas:()=> <canvas/>}));
class ConfigWorker {static all:ConfigWorker[]=[];sent:any[]=[];onmessage:any;constructor(){ConfigWorker.all.push(this);}postMessage(m:any){this.sent.push(m);}terminate(){}}
let clock=0;
beforeEach(()=>{vi.resetModules();clock=0;ConfigWorker.all=[];vi.stubGlobal('Worker',ConfigWorker);});
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
for(const preset of ['1d_random','2d_random','1d_pair','1d_biased','uniform_plus1','uniform_minus1'])it(`executes selected UI preset ${preset} through its full default duration`,async()=>{
 render(<SimulationLab/>);
 fireEvent.change(screen.getByLabelText('Preset:'),{target:{value:preset}});
 const c=ConfigWorker.all.at(-1)!.sent.filter(m=>m.type==='INIT').at(-1).config;
 cleanup();
 const samples:any[]=[];let initial:Float64Array|undefined,final:Float64Array|undefined;
 const host:any={onmessage:null,postMessage:(m:any)=>{if(m.type==='ERROR')throw new Error(m.message);if(m.diagnostics)samples.push(m.diagnostics);if(m.type==='INITIALIZED')initial=m.field;if(m.type==='COMPLETED')final=m.field;}};
 vi.stubGlobal('self',host);vi.spyOn(performance,'now').mockImplementation(()=>clock);vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 await import('../src/workers/simulation.worker');
 const send=(type:string,extra={})=>host.onmessage({data:{type,runId:preset,...extra}});
 send('INIT',{config:c});send('START');
 for(let k=1;k<=200;k++){clock=k*c.duration*1000/200;await vi.advanceTimersToNextTimerAsync();}
 expect(final).toBeDefined();expect(samples.at(-1).time).toBe(c.duration);
 for(let k=0;k<samples.length;k++){expect(Object.values(samples[k]).every(Number.isFinite)).toBe(true);if(k)expect(samples[k].freeEnergy).toBeLessThanOrEqual(samples[k-1].freeEnergy+1e-8);}
 if(preset.startsWith('uniform')){const value=preset==='uniform_plus1'?1:-1;expect(Array.from(final!).every(v=>v===value)).toBe(true);}
 else {expect(final!.some((v,i)=>Math.abs(v-initial![i])>1e-6)).toBe(true);expect(samples.at(-1).meanPhi2).toBeGreaterThan(.4);}
 if(preset==='1d_biased')expect(samples.at(-1).meanPhi).toBeGreaterThan(.99);
 const dir='../work/preset_check';mkdirSync(dir,{recursive:true});
 writeFileSync(`${dir}/${preset}.json`,JSON.stringify({config:c,initial:samples[0],final:samples.at(-1),samples:samples.length},null,2));
 writeFileSync(`${dir}/${preset}_initial.bin`,new Uint8Array(initial!.buffer));writeFileSync(`${dir}/${preset}_final.bin`,new Uint8Array(final!.buffer));
},30000);
