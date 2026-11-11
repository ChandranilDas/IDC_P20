// Independent acceptance audit of actual mounted controls, not implementation replicas.
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act,cleanup,waitFor} from '@testing-library/react';
import {SimulationLab} from '../src/views/SimulationLab';
import {SavedResultsView} from '../src/views/SavedResultsView';
import sourceManifest from '../public/generated/manifest.json';
import {ErrorBoundary} from '../src/components/ErrorBoundary';
import {computeDiagnostics} from '../src/core/tdgl';
vi.mock('../src/components/FieldCanvas',()=>({FieldCanvas:()=> <canvas id="tdgl-field-canvas"/>}));
class ControlledWorker {
 static instances:ControlledWorker[]=[];
 onmessage:any; sent:any[]=[];
 constructor(){ControlledWorker.instances.push(this);}
 postMessage(message:any){this.sent.push(message);}
 terminate(){}
 initMessages(){return this.sent.filter(m=>m.type==='INIT');}
 initialized(message:any){const c=message.config; const field=new Float64Array(c.dimension===1?c.Nx:c.Nx*c.Ny).fill(.1);this.onmessage?.({data:{type:'INITIALIZED',runId:message.runId,field,diagnostics:computeDiagnostics(field,c.dx,c.dimension,c.Nx,c.Ny,0,0,c.dy)}});}
}
beforeEach(()=>{ControlledWorker.instances=[];vi.stubGlobal('Worker',ControlledWorker);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const latest=()=>ControlledWorker.instances.at(-1)!;
const acknowledge=async()=>{const w=latest();const init=w.initMessages().at(-1);expect(init).toBeDefined();await act(async()=>w.initialized(init));return init;};
describe('Independent actual mounted SimulationLab acceptance',()=>{
 it('rejects raw fractional/blank seed and N from actual inputs',async()=>{
  render(<SimulationLab/>);await acknowledge();
  for(const [label,value] of [['Seed (uint32)','1.5'],['Seed (uint32)',''],['Grid Points N (int)','128.5'],['Grid Points N (int)','']] as const){
   fireEvent.change(screen.getByLabelText(label),{target:{value}});
   expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value);
   expect((screen.getByRole('button',{name:'Start'}) as HTMLButtonElement).disabled).toBe(true);
   fireEvent.change(screen.getByLabelText(label),{target:{value:label.startsWith('Seed')?'42':'1024'}});
  }
 });
 it('handles actual 1D->2D->1D events and delayed obsolete INITIALIZED messages',async()=>{
  render(<SimulationLab/>);const old=await acknowledge();
  fireEvent.change(screen.getByLabelText('Preset:'),{target:{value:'2d_random'}});
  const next=latest().initMessages().at(-1);expect(next.config.dimension).toBe(2);
  await act(async()=>latest().initialized(old));
  await acknowledge();
  expect(screen.getByLabelText('j (0 to 127):')).toBeTruthy();
  expect(document.body.textContent).not.toContain('View Rendering Error');
  fireEvent.change(screen.getByLabelText('Preset:'),{target:{value:'1d_random'}});
  await act(async()=>latest().initialized(next));await acknowledge();
  expect(screen.queryByLabelText('j (0 to 127):')).toBeNull();
  expect(document.body.textContent).not.toContain('View Rendering Error');
 });
 it('keeps inspector coordinate in range after actual grid resize',async()=>{
  render(<SimulationLab/>);await acknowledge();
  fireEvent.change(screen.getByLabelText('Grid Points N (int)'),{target:{value:'512'}});await acknowledge();
  expect(Number((screen.getByLabelText('i (0 to 511):') as HTMLInputElement).value)).toBeLessThan(512);
 });
 it('does not start before initialization acknowledgement',async()=>{
  render(<SimulationLab/>);
  const start=screen.getByRole('button',{name:'Start'}) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  await acknowledge();await waitFor(()=>expect(start.disabled).toBe(false));
  fireEvent.click(start);expect(latest().sent.at(-1).type).toBe('START');
  expect(document.body.textContent).toContain('Frame 1 of 1');
 });
});
describe('Independent completed-run controls',()=>{
 it('offers a working fresh run after completion instead of an enabled no-op',async()=>{
  render(<SimulationLab/>);const init=await acknowledge();const c=init.config;
  const field=new Float64Array(c.Nx).fill(.5);
  await act(async()=>latest().onmessage({data:{type:'COMPLETED',runId:init.runId,field,diagnostics:computeDiagnostics(field,c.dx,1,c.Nx,c.Ny,c.duration,Math.round(c.duration/c.dt))}}));
  const button=screen.getByRole('button',{name:/^(Start|Run Again|Restart|Start New Run)$/i}) as HTMLButtonElement;
  if(button.disabled){expect(document.body.textContent?.toLowerCase()).toContain('complet');return;}
  const n=latest().initMessages().length;fireEvent.click(button);
  expect(latest().initMessages().length).toBeGreaterThan(n);await acknowledge();
  expect(latest().sent.at(-1).type).toBe('START');
 });
});
describe('Independent mounted error recovery',()=>{
 it('catches a throwing child and actually recovers when reset is clicked',()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});let explode=true;
  function Child(){if(explode)throw Error('independent audit fault');return <p>Recovered view</p>;}
  render(<ErrorBoundary onReset={()=>{explode=false;}}><Child/></ErrorBoundary>);
  expect(screen.getByRole('alert')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Reset & Recover'}));
  expect(screen.getByText('Recovered view')).toBeTruthy();log.mockRestore();
 });
});

const savedManifest:any=structuredClone(sourceManifest);
for(const run of Object.values(savedManifest.runs) as any[]){
 run.N=16;run.Nx=16;run.Ny=run.dimension===2?16:1;run.dx=1;run.L=16;
 run.shape=run.dimension===2?[1,16,16]:[1,16];run.num_snapshots=1;run.t_snapshots=[0];
 run.diag_times=[0];run.diagnostics={free_energy:[0],mean_phi:[0],mean_phi2:[0]};
}
describe('Independent actual mounted SavedResultsView acceptance',()=>{
 it('switches 1D->2D->1D using deferred dataset loads without stale inspector values',async()=>{
  const pending:{url:string,resolve:(v:any)=>void}[]=[];
  vi.stubGlobal('fetch',vi.fn((url:string)=>url.includes('manifest.json')?Promise.resolve({ok:true,json:async()=>savedManifest}):new Promise(resolve=>pending.push({url,resolve}))));
  const finish=async(value:number)=>{const req=pending.at(-1)!;const run=(Object.values(savedManifest.runs) as any[]).find(r=>req.url===`/${r.binary_file}`)!;const data=new Float64Array(run.shape.reduce((a:number,b:number)=>a*b,1)).fill(value);await act(async()=>req.resolve({ok:true,arrayBuffer:async()=>data.buffer}));};
  render(<SavedResultsView/>);await waitFor(()=>expect(pending.length).toBe(1));await finish(.1);
  fireEvent.click(screen.getByRole('button',{name:'2D Coarsening'}));
  expect(screen.queryByText('Numerical Update Inspector')).toBeNull();
  await waitFor(()=>expect(pending.length).toBe(2));await finish(.25);
  expect(screen.getByLabelText('j (0 to 15):')).toBeTruthy();
  expect(screen.getAllByText('0.250000').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'1D Random Quench'}));await waitFor(()=>expect(pending.length).toBe(3));await finish(-.2);
  expect(screen.queryByLabelText('j (0 to 15):')).toBeNull();expect(screen.getAllByText('-0.200000').length).toBeGreaterThan(0);
 });
});
